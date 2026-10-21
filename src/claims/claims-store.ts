import { createClaim, parseClaim, type Claim, type ClaimRequest } from '@/api/claims';
import { ApiError, isRecord } from '@/api/client';
import { storage } from '@/lib/storage';

/** One confirmed claim request. The key and body never change once created. */
export type Attempt = { key: string; body: ClaimRequest };

export type Submission =
  /** Request in flight; `retries` > 0 means earlier tries had an unknown outcome. */
  | { phase: 'sending'; attempt: Attempt; retries: number }
  /** Automatic retries ran out and we still don't know if the claim exists. */
  | { phase: 'unknown'; attempt: Attempt; error: unknown }
  /** The server answered and the claim was definitely not created. */
  | { phase: 'rejected'; attempt: Attempt; error: unknown };

export type SubmitResult =
  | { kind: 'created'; claim: Claim }
  | { kind: 'rejected'; error: unknown }
  | { kind: 'unknown' }
  | { kind: 'stopped' };

export type ClaimsState = {
  /** Claims created from this browser with this token, newest first. */
  claims: Claim[];
  submission: Submission | null;
};

export type ClaimsStore = ReturnType<typeof createClaimsStore>;

const AUTO_RETRIES = 4;
const KEEP_CLAIMS_MS = 24 * 60 * 60 * 1000;

/**
 * Whether repeating the same request (same Idempotency-Key and body) is the right move:
 * network errors, timeouts, 5xx and unreadable success bodies leave the outcome unknown;
 * 429 means the request was not processed. The server never creates a second claim for
 * a repeated key, so retrying is safe. Any other answer is final.
 */
export function shouldRetryClaim(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.kind !== 'http') return true;
  return error.status === 429 || (error.status !== undefined && error.status >= 500);
}

function retryDelayMs(retries: number, error: unknown) {
  if (error instanceof ApiError && error.retryAfterMs !== undefined) return error.retryAfterMs;
  return Math.min(1000 * 2 ** retries, 8000);
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

// Data is private to each token, so saved claims are kept per token (by a hash, not the token).
function storageKey(token: string) {
  let hash = 5381;
  for (let i = 0; i < token.length; i++) hash = ((hash * 33) ^ token.charCodeAt(i)) >>> 0;
  return `cashmine.claims.${hash.toString(36)}`;
}

function load(key: string): ClaimsState {
  let saved: { attempt?: unknown; claims?: unknown } = {};
  try {
    const parsed: unknown = JSON.parse(storage.get(key) ?? '{}');
    if (isRecord(parsed)) saved = parsed;
  } catch {
    // corrupted entry: start clean
  }

  const claims: Claim[] = [];
  for (const raw of Array.isArray(saved.claims) ? saved.claims : []) {
    try {
      const claim = parseClaim(raw);
      if (Date.now() - Date.parse(claim.createdAt) < KEEP_CLAIMS_MS) claims.push(claim);
    } catch {
      // skip entries we can't read
    }
  }

  // A saved attempt means the app closed before we learned the outcome.
  // resume() sends it again with the same key.
  const attempt = isAttempt(saved.attempt) ? saved.attempt : null;
  return {
    claims,
    submission: attempt ? { phase: 'sending', attempt, retries: 0 } : null,
  };
}

function isAttempt(value: unknown): value is Attempt {
  if (!isRecord(value) || typeof value.key !== 'string' || !isRecord(value.body)) return false;
  const { asset, amount, destinationId } = value.body;
  return (
    typeof asset === 'string' && typeof amount === 'string' && typeof destinationId === 'string'
  );
}

export function createClaimsStore(token: string) {
  const key = storageKey(token);
  let state = load(key);
  const listeners = new Set<() => void>();
  let controller = new AbortController();
  let running: { signal: AbortSignal; promise: Promise<SubmitResult> } | null = null;

  function setState(next: Partial<ClaimsState>) {
    state = { ...state, ...next };
    // Written synchronously, so an attempt is saved before its request is sent.
    const submission = state.submission;
    const attempt = submission && submission.phase !== 'rejected' ? submission.attempt : null;
    storage.set(key, JSON.stringify({ attempt, claims: state.claims }));
    listeners.forEach((listener) => listener());
  }

  async function run(attempt: Attempt, signal: AbortSignal): Promise<SubmitResult> {
    for (let retries = 0; ; retries++) {
      setState({ submission: { phase: 'sending', attempt, retries } });
      try {
        const claim = await createClaim(token, attempt.key, attempt.body, signal);
        setState({
          submission: null,
          claims: [claim, ...state.claims.filter((c) => c.id !== claim.id)],
        });
        return { kind: 'created', claim };
      } catch (error) {
        if (signal.aborted) return { kind: 'stopped' };
        if (!shouldRetryClaim(error)) {
          setState({ submission: { phase: 'rejected', attempt, error } });
          return { kind: 'rejected', error };
        }
        if (retries >= AUTO_RETRIES) {
          setState({ submission: { phase: 'unknown', attempt, error } });
          return { kind: 'unknown' };
        }
        await sleep(retryDelayMs(retries, error), signal);
        if (signal.aborted) return { kind: 'stopped' };
      }
    }
  }

  // Only one request loop at a time, so the same attempt is never sent twice in parallel.
  function start(attempt: Attempt): Promise<SubmitResult> {
    if (running && !running.signal.aborted) return running.promise;
    const signal = controller.signal;
    const promise = run(attempt, signal).finally(() => {
      if (running?.promise === promise) running = null;
    });
    running = { signal, promise };
    return promise;
  }

  return {
    getState: () => state,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Starts a new claim with a fresh Idempotency-Key. Refused while another one is unresolved. */
    submit(body: ClaimRequest): Promise<SubmitResult> {
      const current = state.submission;
      if (current && current.phase !== 'rejected') return Promise.resolve({ kind: 'stopped' });
      return start({ key: crypto.randomUUID(), body });
    },

    /** "Check again": resends the unresolved attempt with the same key and body. */
    retry(): Promise<SubmitResult> {
      const current = state.submission;
      if (!current || current.phase === 'rejected') return Promise.resolve({ kind: 'stopped' });
      return start(current.attempt);
    },

    /** Clears a rejected attempt (it was definitely not created). */
    dismiss() {
      if (state.submission?.phase === 'rejected') setState({ submission: null });
    },

    /** Continues an attempt saved before the app was reloaded. */
    resume() {
      if (controller.signal.aborted) controller = new AbortController();
      if (state.submission?.phase === 'sending') void start(state.submission.attempt);
    },

    /** Stops the request loop (token changed or app unmounted); the attempt stays saved. */
    dispose() {
      controller.abort();
    },
  };
}
