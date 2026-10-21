import { parseAmount, parseDecimal, type Decimal } from '@/lib/amount';

import { apiRequest, invalidResponse, isRecord } from './client';

export type AssetBalance = {
  asset: string;
  decimals: number;
  /** Smallest units of the asset. */
  available: bigint;
  pending: bigint;
  claiming: bigint;
  usdPrice: Decimal;
};

export type Balances = {
  /** Snapshot time, ms since epoch. */
  asOf: number;
  items: AssetBalance[];
};

export async function fetchBalances(token: string, signal?: AbortSignal): Promise<Balances> {
  return parseBalances(await apiRequest('/v1/balances', { token, signal }));
}

/** Validates the response strictly: a malformed amount fails the request instead of showing a wrong number. */
export function parseBalances(json: unknown): Balances {
  if (!isRecord(json) || !Array.isArray(json.items)) throw invalidResponse('balances');
  const asOf = typeof json.asOf === 'string' ? Date.parse(json.asOf) : NaN;
  if (Number.isNaN(asOf)) throw invalidResponse('asOf');
  return { asOf, items: json.items.map(parseAssetBalance) };
}

function parseAssetBalance(raw: unknown): AssetBalance {
  if (!isRecord(raw) || typeof raw.asset !== 'string' || !raw.asset) throw invalidResponse('asset');
  const asset = raw.asset;
  const decimals = raw.decimals;
  if (typeof decimals !== 'number' || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw invalidResponse(`${asset}.decimals`);
  }

  const units = (field: 'available' | 'pending' | 'claiming') => {
    const value = raw[field];
    const parsed = typeof value === 'string' ? parseAmount(value, decimals) : null;
    if (!parsed?.ok) throw invalidResponse(`${asset}.${field}`);
    return parsed.units;
  };

  const usdPrice = typeof raw.usdPrice === 'string' ? parseDecimal(raw.usdPrice) : null;
  if (!usdPrice) throw invalidResponse(`${asset}.usdPrice`);

  return {
    asset,
    decimals,
    available: units('available'),
    pending: units('pending'),
    claiming: units('claiming'),
    usdPrice,
  };
}
