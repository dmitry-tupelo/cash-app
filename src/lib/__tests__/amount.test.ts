import {
  compareDecimals,
  formatAmount,
  formatDecimalString,
  formatUsd,
  parseAmount,
  parseDecimal,
  roundDecimal,
  sumDecimals,
  toAmountString,
  usdValue,
  type Decimal,
} from '../amount';

const dec = (input: string): Decimal => parseDecimal(input)!;

describe('parseAmount', () => {
  it.each<[string, number, bigint]>([
    ['0', 6, 0n],
    ['12', 6, 12_000_000n],
    ['0.5', 6, 500_000n],
    ['820.413207', 6, 820_413_207n],
    ['0.000001', 6, 1n],
    ['5', 0, 5n],
  ])('parses %p with %i decimals', (input, decimals, units) => {
    expect(parseAmount(input, decimals)).toEqual({ ok: true, units });
  });

  it('keeps precision that floating point would lose', () => {
    expect(parseAmount('123456789.123456789012345678', 18)).toEqual({
      ok: true,
      units: 123456789123456789012345678n,
    });
  });

  it.each(['', '.5', '1.', '05', '00.1', '1e-3', '-1', '+1', ' 1', '1,5', '1.2.3', 'abc'])(
    'rejects %p (not the API format)',
    (input) => {
      expect(parseAmount(input, 6)).toEqual({ ok: false, reason: 'format' });
    },
  );

  it('rejects more decimals than the asset allows, trailing zeros included', () => {
    expect(parseAmount('0.0000001', 6)).toEqual({ ok: false, reason: 'too-many-decimals' });
    expect(parseAmount('1.0000000', 6)).toEqual({ ok: false, reason: 'too-many-decimals' });
    expect(parseAmount('1.0', 0)).toEqual({ ok: false, reason: 'too-many-decimals' });
  });
});

describe('toAmountString and formatAmount', () => {
  it('writes the canonical API string without trailing zeros', () => {
    expect(toAmountString(50_120_000n, 6)).toBe('50.12');
    expect(toAmountString(12_000_000n, 6)).toBe('12');
    expect(toAmountString(1n, 6)).toBe('0.000001');
    expect(toAmountString(0n, 6)).toBe('0');
    expect(toAmountString(7n, 0)).toBe('7');
    expect(toAmountString(-1_500_000n, 6)).toBe('-1.5');
  });

  it('round-trips through parseAmount', () => {
    for (const units of [0n, 1n, 999_999n, 1_000_000n, 820_413_207n]) {
      expect(parseAmount(toAmountString(units, 6), 6)).toEqual({ ok: true, units });
    }
  });

  it('groups thousands and never rounds', () => {
    expect(formatAmount(1_234_567_891_234n, 6)).toBe('1,234,567.891234');
    expect(formatAmount(999_999_999n, 9)).toBe('0.999999999');
    expect(formatAmount(123n, 0)).toBe('123');
    expect(formatAmount(-1_234_500_000n, 6)).toBe('-1,234.5');
    expect(formatDecimalString('1234.5')).toBe('1,234.5');
    expect(formatDecimalString('-1234.5')).toBe('-1,234.5'); // signed activity amounts
  });
});

describe('USD values', () => {
  it('multiplies amount by price exactly', () => {
    // 820.413207 USDT × 1.0002 = 820.5772896414
    const value = usdValue(820_413_207n, 6, dec('1.0002'));
    expect(value).toEqual({ value: 8205772896414n, scale: 10 });
    expect(formatUsd(value)).toBe('$820.58');
  });

  it('has no floating point drift (0.1 + 0.2)', () => {
    const sum = sumDecimals([dec('0.1'), dec('0.2')]);
    expect(compareDecimals(sum, dec('0.3'))).toBe(0);
    expect(formatUsd(sum)).toBe('$0.30');
  });

  it('rounds once after summing, not per item', () => {
    // Three assets worth $0.005 each: $0.015 in total -> $0.02.
    // Rounding each first would show $0.03.
    const each = dec('0.005');
    expect(formatUsd(sumDecimals([each, each, each]))).toBe('$0.02');
  });

  it('rounds half away from zero', () => {
    expect(roundDecimal(dec('0.005'), 2)).toBe(1n);
    expect(roundDecimal(dec('0.004999'), 2)).toBe(0n);
    expect(roundDecimal({ value: -5n, scale: 3 }, 2)).toBe(-1n);
    expect(roundDecimal(dec('7'), 2)).toBe(700n);
  });

  it('formats cents, grouping and values below one cent', () => {
    expect(formatUsd(dec('1234567.89'))).toBe('$1,234,567.89');
    expect(formatUsd(dec('0'))).toBe('$0.00');
    expect(formatUsd(dec('0.00000001'))).toBe('<$0.01');
  });

  it('compares decimals with different scales', () => {
    expect(compareDecimals(dec('1.5'), dec('1.50'))).toBe(0);
    expect(compareDecimals(dec('2'), dec('1.999'))).toBe(1);
    expect(compareDecimals(dec('0.1'), dec('0.25'))).toBe(-1);
  });
});
