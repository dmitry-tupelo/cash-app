/**
 * Exact money math.
 *
 * Asset amounts are kept as bigint counts of the asset's smallest unit
 * (e.g. "820.413207" USDT with 6 decimals -> 820413207n), so they never pass
 * through floating point. Prices and USD values use `Decimal` (value / 10^scale),
 * and are rounded only once, when formatted for display.
 */

export type Decimal = { value: bigint; scale: number };

export type ParseAmountResult =
  | { ok: true; units: bigint }
  | { ok: false; reason: 'format' | 'too-many-decimals' };

// API format: digits, optional dot followed by digits, no leading zeros.
// "0.5" and "12" are valid; ".5", "1.", "05", "1e-3", "-1" are not.
const DECIMAL_RE = /^(0|[1-9]\d*)(?:\.(\d+))?$/;

const pow10 = (n: number) => 10n ** BigInt(n);

export function parseDecimal(input: string): Decimal | null {
  const match = DECIMAL_RE.exec(input);
  if (!match) return null;
  const fraction = match[2] ?? '';
  return { value: BigInt(match[1] + fraction), scale: fraction.length };
}

/** Parses an asset amount, allowing at most `decimals` fraction digits (same rule as the API). */
export function parseAmount(input: string, decimals: number): ParseAmountResult {
  const parsed = parseDecimal(input);
  if (!parsed) return { ok: false, reason: 'format' };
  if (parsed.scale > decimals) return { ok: false, reason: 'too-many-decimals' };
  return { ok: true, units: parsed.value * pow10(decimals - parsed.scale) };
}

/** Canonical API string: "820.413207", "12", "0.5" (no trailing zeros, no grouping). */
export function toAmountString(units: bigint, decimals: number): string {
  const sign = units < 0n ? '-' : '';
  const abs = units < 0n ? -units : units;
  const base = pow10(decimals);
  const integer = (abs / base).toString();
  const fraction = (abs % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return sign + integer + (fraction ? '.' + fraction : '');
}

/** Display string with thousands separators. Never rounds: every unit is shown. */
export function formatAmount(units: bigint, decimals: number): string {
  const [integer, fraction] = toAmountString(units, decimals).split('.');
  return groupThousands(integer) + (fraction ? '.' + fraction : '');
}

export function usdValue(units: bigint, decimals: number, usdPrice: Decimal): Decimal {
  return { value: units * usdPrice.value, scale: decimals + usdPrice.scale };
}

export function addDecimals(a: Decimal, b: Decimal): Decimal {
  const scale = Math.max(a.scale, b.scale);
  return {
    value: a.value * pow10(scale - a.scale) + b.value * pow10(scale - b.scale),
    scale,
  };
}

export function sumDecimals(values: Decimal[]): Decimal {
  return values.reduce(addDecimals, { value: 0n, scale: 0 });
}

export function compareDecimals(a: Decimal, b: Decimal): number {
  const diff = addDecimals(a, { value: -b.value, scale: b.scale }).value;
  return diff === 0n ? 0 : diff > 0n ? 1 : -1;
}

/** Rounds half away from zero to `scale` digits; returns the integer count of 10^-scale units. */
export function roundDecimal(d: Decimal, scale: number): bigint {
  if (d.scale <= scale) return d.value * pow10(scale - d.scale);
  const divisor = pow10(d.scale - scale);
  const abs = d.value < 0n ? -d.value : d.value;
  const rounded = (abs + divisor / 2n) / divisor;
  return d.value < 0n ? -rounded : rounded;
}

/** "$1,234.56". A non-zero value that rounds to 0 cents shows as "<$0.01". */
export function formatUsd(d: Decimal): string {
  const cents = roundDecimal(d, 2);
  if (cents === 0n && d.value > 0n) return '<$0.01';
  const sign = cents < 0n ? '-' : '';
  const abs = cents < 0n ? -cents : cents;
  const fraction = (abs % 100n).toString().padStart(2, '0');
  return `${sign}$${groupThousands((abs / 100n).toString())}.${fraction}`;
}

function groupThousands(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
