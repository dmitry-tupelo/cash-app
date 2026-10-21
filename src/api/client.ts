import { API_BASE_URL } from './config';

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'invalid-response';

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  code?: string;
  field?: string;
  retryAfterMs?: number;

  constructor(
    kind: ApiErrorKind,
    message: string,
    details: { status?: number; code?: string; field?: string; retryAfterMs?: number } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = details.status;
    this.code = details.code;
    this.field = details.field;
    this.retryAfterMs = details.retryAfterMs;
  }
}

type RequestOptions = {
  token: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;

/** Calls the API and returns the parsed JSON body. Any failure is thrown as an ApiError. */
export async function apiRequest(path: string, options: RequestOptions): Promise<unknown> {
  const { response, text } = await send(path, options);

  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // handled below
    }
  }

  if (!response.ok) throw httpError(response, payload);
  if (payload === undefined) throw invalidResponse('body is not JSON');
  return payload;
}

/** Sends the request and reads the body, with a timeout that covers both. */
async function send(path: string, options: RequestOptions) {
  const { token, method = 'GET', body, headers, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // Our own controller so we can abort on timeout as well as when the caller cancels.
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(API_BASE_URL + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    return { response, text: await response.text() };
  } catch (error) {
    if (timedOut) throw new ApiError('timeout', 'The server took too long to respond.');
    // Cancelled by the caller (e.g. React Query): rethrow as is.
    if (signal?.aborted) throw error;
    throw new ApiError('network', 'Could not reach the server.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

function httpError(response: Response, payload: unknown): ApiError {
  const error: Record<string, unknown> =
    isRecord(payload) && isRecord(payload.error) ? payload.error : {};
  const retryAfterHeader = Number(response.headers.get('Retry-After'));
  const retryAfterMs =
    typeof error.retryAfterMs === 'number'
      ? error.retryAfterMs
      : retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : undefined;

  return new ApiError(
    'http',
    typeof error.message === 'string' ? error.message : `Request failed (${response.status})`,
    {
      status: response.status,
      code: typeof error.code === 'string' ? error.code : undefined,
      field: typeof error.field === 'string' ? error.field : undefined,
      retryAfterMs,
    },
  );
}

export function invalidResponse(what: string): ApiError {
  return new ApiError('invalid-response', `Unexpected response from the server: ${what}`);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
