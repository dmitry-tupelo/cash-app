import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';

import type { ClaimRequest } from '@/api/claims';
import { useToken } from '@/auth/token-context';

import { createClaimsStore, type ClaimsState, type ClaimsStore, type SubmitResult } from './claims-store';

const ClaimsContext = createContext<ClaimsStore | null>(null);

const EMPTY: ClaimsState = { claims: [], submission: null };
const STOPPED: SubmitResult = { kind: 'stopped' };
const noopSubscribe = () => () => {};
const getEmpty = () => EMPTY;

/** One store per token. It lives above the screens so a claim keeps going while the user navigates. */
export function ClaimsProvider({ children }: { children: ReactNode }) {
  const { token } = useToken();
  const store = useMemo(() => (token ? createClaimsStore(token) : null), [token]);

  useEffect(() => {
    if (!store) return;
    store.resume();
    return () => store.dispose();
  }, [store]);

  return <ClaimsContext.Provider value={store}>{children}</ClaimsContext.Provider>;
}

export function useClaims() {
  const store = useContext(ClaimsContext);
  const state = useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.getState : getEmpty,
  );
  return {
    ...state,
    submit: (body: ClaimRequest) => (store ? store.submit(body) : Promise.resolve(STOPPED)),
    retry: () => (store ? store.retry() : Promise.resolve(STOPPED)),
    dismiss: () => store?.dismiss(),
  };
}
