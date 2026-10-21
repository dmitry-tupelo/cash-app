import type { Balances } from '@/api/balances';
import type { Claim } from '@/api/claims';

import { toAmountString } from '../amount';
import { applyLocalClaims, smallestClaim, validateClaimAmount } from '../claim';

// An asset with 6 decimals: 0.5 available, minimum 0.01, fee 0.0012 (amounts in smallest units).
const limits = { decimals: 6, available: 500_000n, minAmount: 10_000n, fee: 1_200n };

describe('validateClaimAmount', () => {
  it('returns the amount, the fee and what the user receives (amount - fee)', () => {
    expect(validateClaimAmount('0.5', limits)).toEqual({
      ok: true,
      amount: 500_000n,
      fee: 1_200n,
      receive: 498_800n, // 0.4988
    });
  });

  it('accepts Max (exactly available) and exactly the minimum', () => {
    const max = toAmountString(limits.available, limits.decimals);
    expect(validateClaimAmount(max, limits)).toMatchObject({ ok: true, amount: 500_000n });
    expect(validateClaimAmount('0.01', limits)).toMatchObject({ ok: true, receive: 8_800n });
  });

  it('accepts a decimal comma and surrounding spaces', () => {
    expect(validateClaimAmount(' 0,25 ', limits)).toMatchObject({ ok: true, amount: 250_000n });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['abc', 'format'],
    ['.5', 'format'],
    ['1.', 'format'],
    ['05', 'format'],
    ['1e-3', 'format'],
    ['-0.1', 'format'],
    ['1.234,5', 'format'],
    ['0.0000001', 'too-many-decimals'],
    ['0.6', 'above-available'],
    ['0.500001', 'above-available'],
    ['0.009999', 'below-min'],
    ['0', 'below-min'],
  ])('rejects %p as %s', (input, kind) => {
    expect(validateClaimAmount(input, limits)).toMatchObject({ ok: false, error: { kind } });
  });

  it('rejects input that looks like thousands grouping instead of guessing', () => {
    const rich = { ...limits, available: 10_000_000_000n }; // 10,000
    for (const input of ['1,234', '12,345', '1,234,567', '1,234.5']) {
      expect(validateClaimAmount(input, rich)).toMatchObject({ ok: false, error: { kind: 'grouping' } });
    }
    // These can't be grouping, so the comma is read as a decimal separator.
    expect(validateClaimAmount('1,23', rich)).toMatchObject({ ok: true, amount: 1_230_000n });
    expect(validateClaimAmount('1,2345', rich)).toMatchObject({ ok: true, amount: 1_234_500n });
    expect(validateClaimAmount('0,015', rich)).toMatchObject({ ok: true, amount: 15_000n });
  });

  it('requires the amount to be more than the fee', () => {
    const lowMin = { ...limits, minAmount: 1n };
    expect(validateClaimAmount('0.0012', lowMin)).toMatchObject({
      ok: false,
      error: { kind: 'not-above-fee', fee: 1_200n },
    });
    expect(validateClaimAmount('0.001201', lowMin)).toMatchObject({ ok: true, receive: 1n });
  });

  it('reports "not enough" first when available is below the minimum, whatever is typed', () => {
    const poor = { ...limits, available: 3_000n }; // 0.003 available, minimum 0.01
    for (const input of ['', '0.005', '0.003']) {
      expect(validateClaimAmount(input, poor)).toEqual({
        ok: false,
        error: { kind: 'not-enough', smallest: 10_000n },
      });
    }
  });

  it('uses fee + 1 unit as the smallest claim when the fee is not below the minimum', () => {
    expect(smallestClaim(10_000n, 1_200n)).toBe(10_000n);
    expect(smallestClaim(1_000n, 1_200n)).toBe(1_201n);
    expect(validateClaimAmount('', { ...limits, minAmount: 1_000n, available: 1_200n })).toEqual({
      ok: false,
      error: { kind: 'not-enough', smallest: 1_201n },
    });
  });
});

describe('applyLocalClaims', () => {
  const asOf = Date.parse('2026-10-21T08:00:15.000Z');
  const balances: Balances = {
    asOf,
    items: [
      { asset: 'ETH', decimals: 6, available: 1_000_000n, pending: 0n, claiming: 0n, usdPrice: { value: 2500n, scale: 0 } },
      { asset: 'USDT', decimals: 6, available: 50_000_000n, pending: 0n, claiming: 0n, usdPrice: { value: 1n, scale: 0 } },
    ],
  };

  // A claim of 0.25 ETH created 5 seconds after the snapshot.
  const claim = (overrides: Partial<Claim> = {}): Claim => ({
    id: 'clm_1',
    asset: 'ETH',
    amount: '0.25',
    fee: '0.0012',
    receiveAmount: '0.2488',
    destinationId: 'dest_wallet',
    status: 'pending',
    failureReason: null,
    createdAt: '2026-10-21T08:00:20.000Z',
    updatedAt: '2026-10-21T08:00:20.000Z',
    ...overrides,
  });

  const shown = (claims: Claim[], asset = 'ETH') =>
    applyLocalClaims(balances, claims).items.find((item) => item.asset === asset)!;

  it('moves a pending claim from available to claiming until the snapshot includes it', () => {
    expect(shown([claim()])).toMatchObject({ available: 750_000n, claiming: 250_000n });
  });

  it('subtracts a completed claim from available without counting it as claiming', () => {
    expect(shown([claim({ status: 'completed' })])).toMatchObject({ available: 750_000n, claiming: 0n });
  });

  it('ignores a failed claim (the server returned the amount to available)', () => {
    expect(shown([claim({ status: 'failed' })])).toMatchObject({ available: 1_000_000n, claiming: 0n });
  });

  it('ignores a claim the snapshot already includes (created before asOf)', () => {
    const old = claim({ createdAt: '2026-10-21T08:00:10.000Z' });
    expect(shown([old])).toMatchObject({ available: 1_000_000n, claiming: 0n });
  });

  it('applies a claim created exactly at asOf, so it never shows more than can be claimed', () => {
    const same = claim({ createdAt: '2026-10-21T08:00:15.000Z' });
    expect(shown([same])).toMatchObject({ available: 750_000n });
  });

  it('only changes the claimed asset and adds up several claims', () => {
    const claims = [claim(), claim({ id: 'clm_2', amount: '0.1' })];
    expect(shown(claims)).toMatchObject({ available: 650_000n, claiming: 350_000n });
    expect(shown(claims, 'USDT')).toMatchObject({ available: 50_000_000n, claiming: 0n });
  });

  it('never shows a negative available', () => {
    expect(shown([claim({ amount: '2' })])).toMatchObject({ available: 0n, claiming: 2_000_000n });
  });

  it('does not modify the snapshot it is given', () => {
    applyLocalClaims(balances, [claim()]);
    expect(balances.items[0].available).toBe(1_000_000n);
  });
});
