import { storage } from '@/lib/storage';

const KEY = 'cashmine.apiToken';

export const tokenStorage = {
  get: () => storage.get(KEY),
  set: (token: string) => storage.set(KEY, token),
  remove: () => storage.remove(KEY),
};
