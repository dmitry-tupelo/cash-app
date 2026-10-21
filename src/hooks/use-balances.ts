import { skipToken, useQuery } from '@tanstack/react-query';

import { fetchBalances } from '@/api/balances';
import { useToken } from '@/auth/token-context';

/** The server recomputes the balance snapshot every 15 seconds. */
export const BALANCES_REFRESH_MS = 15_000;

export function useBalances() {
  const { token } = useToken();
  return useQuery({
    queryKey: ['balances', token],
    queryFn: token ? ({ signal }) => fetchBalances(token, signal) : skipToken,
    // Polls only while the page is visible. React Query restarts this interval whenever the
    // query fetches, so a manual refresh also pushes the next automatic one a full 15s away.
    refetchInterval: BALANCES_REFRESH_MS,
  });
}
