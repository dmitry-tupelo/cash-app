import { skipToken, useQueries, useQuery } from '@tanstack/react-query';

import { fetchClaim, fetchClaimOptions, type Claim } from '@/api/claims';
import { useToken } from '@/auth/token-context';
import { useClaims } from '@/claims/claims-context';
import { applyLocalClaims } from '@/lib/claim';

import { useBalances } from './use-balances';

/** A pending claim settles in about 20 seconds. */
export const CLAIM_POLL_MS = 2000;

export function claimQuery(token: string | null, id: string, initial?: Claim) {
  return {
    queryKey: ['claim', token, id],
    queryFn: token ? ({ signal }: { signal: AbortSignal }) => fetchClaim(token, id, signal) : skipToken,
    initialData: initial,
    // A settled claim never changes again, so only a pending one is polled.
    staleTime: (query: { state: { data?: Claim } }) =>
      query.state.data?.status === 'pending' ? 0 : Infinity,
    refetchInterval: (query: { state: { data?: Claim } }) =>
      query.state.data?.status === 'pending' ? CLAIM_POLL_MS : false,
  };
}

export function useClaim(id: string) {
  const { token } = useToken();
  const { claims } = useClaims();
  return useQuery(claimQuery(token, id, claims.find((claim) => claim.id === id)));
}

/** Claims created in this browser, with their latest known status (pending ones are polled). */
export function useTrackedClaims(): Claim[] {
  const { token } = useToken();
  const { claims } = useClaims();
  const results = useQueries({ queries: claims.map((claim) => claimQuery(token, claim.id, claim)) });
  return claims.map((claim, i) => results[i]?.data ?? claim);
}

/**
 * Balances as shown to the user: the server snapshot adjusted at render for our own claims
 * (the query cache itself is never edited). Also returns those claims.
 */
export function useDisplayBalances() {
  const query = useBalances();
  const claims = useTrackedClaims();
  return { ...query, data: query.data && applyLocalClaims(query.data, claims), claims };
}

export function useClaimOptions(asset: string | undefined, decimals: number | undefined) {
  const { token } = useToken();
  return useQuery({
    queryKey: ['claim-options', token, asset],
    queryFn:
      token && asset !== undefined && decimals !== undefined
        ? ({ signal }) => fetchClaimOptions(token, asset, decimals, signal)
        : skipToken,
    staleTime: 60_000,
  });
}
