import { skipToken, useInfiniteQuery } from '@tanstack/react-query';

import { fetchActivity, type ActivityItem } from '@/api/activity';
import { useToken } from '@/auth/token-context';

export function useActivity() {
  const { token } = useToken();
  const query = useInfiniteQuery({
    queryKey: ['activity', token],
    queryFn: token
      ? ({ pageParam, signal }) => fetchActivity(token, pageParam, signal)
      : skipToken,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // A refetch reloads from the first page and follows fresh cursors, so pages stay consistent.
  // Still drop repeated ids: if new activity arrives between "load more" calls, a page could
  // start with an item we already show.
  const seen = new Set<string>();
  const items: ActivityItem[] = [];
  for (const page of query.data?.pages ?? []) {
    for (const item of page.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
  }

  return { ...query, items };
}
