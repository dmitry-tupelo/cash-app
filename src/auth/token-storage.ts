// The app ships as a web build, so the token lives in localStorage.
// A native build would use expo-secure-store here instead.
const KEY = 'cashmine.apiToken';

export const tokenStorage = {
  get(): string | null {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null; // storage blocked (e.g. private mode)
    }
  },
  set(token: string) {
    try {
      globalThis.localStorage?.setItem(KEY, token);
    } catch {
      // the token still works for this session
    }
  },
  remove() {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      // nothing to do
    }
  },
};
