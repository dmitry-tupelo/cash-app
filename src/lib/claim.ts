import type { Balances } from '@/api/balances';
import type { Claim } from '@/api/claims';

import { parseAmount } from './amount';

export type ClaimAmountError =
  /** No amount can be valid: available is below the smallest possible claim. */
  | { kind: 'not-enough'; smallest: bigint }
  | { kind: 'empty' }
  /** Looks like thousands grouping ("1,234"), which we refuse to guess about. */
  | { kind: 'grouping' }
  | { kind: 'format' }
  | { kind: 'too-many-decimals'; decimals: number }
  | { kind: 'above-available'; available: bigint }
  | { kind: 'below-min'; minAmount: bigint }
  | { kind: 'not-above-fee'; fee: bigint };

export type ClaimAmountCheck =
  | { ok: true; amount: bigint; fee: bigint; receive: bigint }
  | { ok: false; error: ClaimAmountError };

type ClaimLimits = {
  decimals: number;
  /** What the user can claim right now (snapshot adjusted for our own claims). */
  available: bigint;
  minAmount: bigint;
  fee: bigint;
};

/** Accepts what people type on a phone: surrounding spaces and a decimal comma ("0,5"). */
export function normalizeAmountInput(input: string): string {
  return input.trim().replace(',', '.');
}

// The app displays amounts with comma grouping ("1,234" is one thousand two hundred thirty-four),
// so input shaped like that is ambiguous with a decimal comma. We reject it instead of guessing.
// "0,005", "1,23" and "1,2345" can't be grouping, so they still work as decimal commas.
const THOUSANDS_GROUPING_RE = /^[1-9]\d{0,2}(,\d{3})+(\.\d*)?$/;

export function looksLikeThousandsGrouping(input: string): boolean {
  return THOUSANDS_GROUPING_RE.test(input.trim());
}

/** Smallest valid claim: at least minAmount and more than the fee (in smallest units). */
export function smallestClaim(minAmount: bigint, fee: bigint): bigint {
  return minAmount > fee ? minAmount : fee + 1n;
}

/**
 * The API rules: valid decimal string, at most `decimals` places, minAmount <= amount <= available.
 * We also require amount > fee, since the user receives amount - fee.
 * If available is below the smallest valid claim, that is reported first, whatever was typed:
 * otherwise every amount fails with "above available" or "below minimum" in turn.
 */
export function validateClaimAmount(input: string, limits: ClaimLimits): ClaimAmountCheck {
  const smallest = smallestClaim(limits.minAmount, limits.fee);
  if (limits.available < smallest) return { ok: false, error: { kind: 'not-enough', smallest } };

  const normalized = normalizeAmountInput(input);
  if (!normalized) return { ok: false, error: { kind: 'empty' } };
  if (looksLikeThousandsGrouping(input)) return { ok: false, error: { kind: 'grouping' } };

  const parsed = parseAmount(normalized, limits.decimals);
  if (!parsed.ok) {
    return {
      ok: false,
      error:
        parsed.reason === 'format'
          ? { kind: 'format' }
          : { kind: 'too-many-decimals', decimals: limits.decimals },
    };
  }

  const amount = parsed.units;
  if (amount > limits.available) {
    return { ok: false, error: { kind: 'above-available', available: limits.available } };
  }
  if (amount < limits.minAmount) {
    return { ok: false, error: { kind: 'below-min', minAmount: limits.minAmount } };
  }
  if (amount <= limits.fee) {
    return { ok: false, error: { kind: 'not-above-fee', fee: limits.fee } };
  }
  return { ok: true, amount, fee: limits.fee, receive: amount - limits.fee };
}

/**
 * Balances to show, computed at render time: the server snapshot plus our own claims that the
 * snapshot does not include yet. The server moves a claim out of `available` the moment it is
 * created, but snapshots are rebuilt only every 15s. A claim is in the snapshot once
 * `asOf` > `createdAt` (both are server times, so device clock skew does not matter).
 *
 * For claims the snapshot does not include yet:
 * - pending: subtract from available, add to claiming
 * - completed: subtract from available only (the money has left, it is not "claiming" any more)
 * - failed: ignore (the server returned the amount to available)
 */
export function applyLocalClaims(balances: Balances, claims: Claim[]): Balances {
  const items = balances.items.map((item) => {
    let { available, claiming } = item;
    for (const claim of claims) {
      if (claim.asset !== item.asset || claim.status === 'failed') continue;
      if (Date.parse(claim.createdAt) < balances.asOf) continue;
      const parsed = parseAmount(claim.amount, item.decimals);
      if (!parsed.ok) continue;
      available -= parsed.units;
      if (claim.status === 'pending') claiming += parsed.units;
    }
    // Funds that arrived after the snapshot could make this negative; never show that.
    return { ...item, available: available < 0n ? 0n : available, claiming };
  });
  return { ...balances, items };
}
