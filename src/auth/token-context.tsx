import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';

import { tokenStorage } from './token-storage';

type TokenContextValue = {
  token: string | null;
  saveToken: (token: string) => void;
  clearToken: () => void;
};

const TokenContext = createContext<TokenContextValue | null>(null);

export function TokenProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => tokenStorage.get());

  // Data is private to each token, so drop everything cached for the previous one.
  function saveToken(value: string) {
    const next = value.trim();
    if (!next) return;
    tokenStorage.set(next);
    queryClient.clear();
    setToken(next);
  }

  function clearToken() {
    tokenStorage.remove();
    queryClient.clear();
    setToken(null);
  }

  return (
    <TokenContext.Provider value={{ token, saveToken, clearToken }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const value = useContext(TokenContext);
  if (!value) throw new Error('useToken must be used inside TokenProvider');
  return value;
}
