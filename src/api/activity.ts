import { parseDecimal } from '@/lib/amount';

import { apiRequest, invalidResponse, isRecord } from './client';

export type ActivityItem = {
  id: string;
  /** Known: accrual, reversal, claim. Kept as a string so a new type doesn't break the list. */
  type: string;
  asset: string;
  /** Signed decimal string: negative for reversals and claims. */
  amount: string;
  /** Known: accrual pending | confirmed, reversal confirmed, claim pending | completed | failed. */
  status: string;
  exchange: string | null;
  createdAt: string;
  /** reversal: the accrual it takes back; claim: the claim id (null for older claims). */
  relatedId: string | null;
};

export type ActivityPage = { items: ActivityItem[]; nextCursor: string | null };

export const ACTIVITY_PAGE_SIZE = 20;

export async function fetchActivity(
  token: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<ActivityPage> {
  const query = `limit=${ACTIVITY_PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  return parseActivityPage(await apiRequest(`/v1/activity?${query}`, { token, signal }));
}

export function parseActivityPage(json: unknown): ActivityPage {
  if (!isRecord(json) || !Array.isArray(json.items)) throw invalidResponse('activity');
  const nextCursor = json.nextCursor ?? null;
  if (nextCursor !== null && typeof nextCursor !== 'string') throw invalidResponse('nextCursor');
  return { items: json.items.map(parseActivityItem), nextCursor };
}

function parseActivityItem(raw: unknown): ActivityItem {
  if (!isRecord(raw)) throw invalidResponse('activity item');
  const { id, type, asset, amount, status, exchange, createdAt, relatedId } = raw;

  if (typeof id !== 'string' || typeof asset !== 'string') throw invalidResponse('activity item');
  // Type and status are not checked against the known lists: this is a read-only history, so
  // an unknown value is shown as is instead of failing the whole page.
  if (typeof type !== 'string' || !type) throw invalidResponse('activity type');
  if (typeof status !== 'string' || !status) throw invalidResponse('activity status');
  if (
    typeof amount !== 'string' ||
    !parseDecimal(amount.startsWith('-') ? amount.slice(1) : amount)
  ) {
    throw invalidResponse('activity amount');
  }
  if (typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt))) {
    throw invalidResponse('activity createdAt');
  }
  const optionalText = (value: unknown, field: string) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string') throw invalidResponse(`activity ${field}`);
    return value;
  };

  return {
    id,
    type,
    asset,
    amount,
    status,
    exchange: optionalText(exchange, 'exchange'),
    createdAt,
    relatedId: optionalText(relatedId, 'relatedId'),
  };
}
