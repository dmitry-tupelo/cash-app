import type { AssetBalance } from '@/api/balances';

import { compareDecimals, sumDecimals, usdValue, type Decimal } from './amount';

export type UsdTotals = { available: Decimal; pending: Decimal; claiming: Decimal };

/** Exact USD sums; rounding happens only when they are formatted. */
export function usdTotals(items: AssetBalance[]): UsdTotals {
  const total = (field: 'available' | 'pending' | 'claiming') =>
    sumDecimals(items.map((item) => usdValue(item[field], item.decimals, item.usdPrice)));
  return { available: total('available'), pending: total('pending'), claiming: total('claiming') };
}

export function availableUsd(item: AssetBalance): Decimal {
  return usdValue(item.available, item.decimals, item.usdPrice);
}

/** Largest available USD value first; ties by asset name so the order is stable. */
export function sortByAvailableUsd(items: AssetBalance[]): AssetBalance[] {
  return [...items].sort(
    (a, b) => compareDecimals(availableUsd(b), availableUsd(a)) || a.asset.localeCompare(b.asset),
  );
}
