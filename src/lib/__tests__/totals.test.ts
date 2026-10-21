import type { AssetBalance } from '@/api/balances';

import { formatUsd, parseAmount, parseDecimal } from '../amount';
import { sortByAvailableUsd, usdTotals } from '../totals';

function asset(
  name: string,
  decimals: number,
  amounts: { available: string; pending?: string; claiming?: string },
  usdPrice: string,
): AssetBalance {
  const units = (value = '0') => {
    const parsed = parseAmount(value, decimals);
    if (!parsed.ok) throw new Error(`bad test amount ${value}`);
    return parsed.units;
  };
  return {
    asset: name,
    decimals,
    available: units(amounts.available),
    pending: units(amounts.pending),
    claiming: units(amounts.claiming),
    usdPrice: parseDecimal(usdPrice)!,
  };
}

const btc = asset('BTC', 8, { available: '0.00012345', claiming: '0.001' }, '67890.12');
const usdt = asset('USDT', 6, { available: '820.413207', pending: '50.12' }, '1.0002');

describe('usdTotals', () => {
  it('sums each balance type across assets exactly and rounds only the total', () => {
    const totals = usdTotals([btc, usdt]);
    // available: 0.00012345 × 67890.12 + 820.413207 × 1.0002 = 8.381035314 + 820.5772896414
    expect(formatUsd(totals.available)).toBe('$828.96');
    // pending: 50.12 × 1.0002 = 50.130024
    expect(formatUsd(totals.pending)).toBe('$50.13');
    // claiming: 0.001 × 67890.12 = 67.89012
    expect(formatUsd(totals.claiming)).toBe('$67.89');
  });

  it('is zero for no assets', () => {
    expect(formatUsd(usdTotals([]).available)).toBe('$0.00');
  });
});

describe('sortByAvailableUsd', () => {
  it('puts the largest USD value first and breaks ties by name', () => {
    const eth = asset('ETH', 18, { available: '0' }, '2500');
    const aaa = asset('AAA', 2, { available: '0' }, '1');
    expect(sortByAvailableUsd([eth, btc, aaa, usdt]).map((item) => item.asset)).toEqual([
      'USDT',
      'BTC',
      'AAA',
      'ETH',
    ]);
  });

  it('does not reorder the array it is given', () => {
    const items = [btc, usdt];
    sortByAvailableUsd(items);
    expect(items.map((item) => item.asset)).toEqual(['BTC', 'USDT']);
  });
});
