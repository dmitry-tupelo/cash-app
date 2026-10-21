// The app ships as a web build, so persistent data lives in localStorage.
// A native build would use expo-secure-store (token) and AsyncStorage (claims) instead.
// Every call is wrapped because storage can throw (private mode, blocked site data).
export const storage = {
  get(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // keep working in memory for this session
    }
  },
  remove(key: string) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // nothing to do
    }
  },
};
