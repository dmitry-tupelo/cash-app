import { ApiError } from '../client';
import { parseActivityPage } from '../activity';

const item = (overrides: Record<string, unknown> = {}) => ({
  id: 'act_1',
  type: 'accrual',
  asset: 'USDT',
  amount: '9.81',
  status: 'confirmed',
  exchange: 'Binance',
  createdAt: '2026-10-21T08:00:00.000Z',
  relatedId: null,
  ...overrides,
});

describe('parseActivityPage', () => {
  it('keeps items with a type or status the app does not know yet', () => {
    const page = parseActivityPage({
      items: [item(), item({ id: 'act_2', status: 'on_hold' }), item({ id: 'act_3', type: 'bonus' })],
      nextCursor: 'abc',
    });
    expect(page.items.map((i) => [i.type, i.status])).toEqual([
      ['accrual', 'confirmed'],
      ['accrual', 'on_hold'],
      ['bonus', 'confirmed'],
    ]);
    expect(page.nextCursor).toBe('abc');
  });

  it('accepts signed amounts and treats a missing nextCursor as the last page', () => {
    const page = parseActivityPage({ items: [item({ type: 'claim', amount: '-0.5' })] });
    expect(page.items[0].amount).toBe('-0.5');
    expect(page.nextCursor).toBeNull();
  });

  it('still rejects a malformed amount', () => {
    expect(() => parseActivityPage({ items: [item({ amount: '1e3' })], nextCursor: null })).toThrow(
      ApiError,
    );
  });
});
