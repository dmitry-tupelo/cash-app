import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';

const MAX_RETRIES = 2;
const MAX_RATE_LIMIT_RETRIES = 3;

function isTransient(error: ApiError) {
  return (
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    (error.status !== undefined && error.status >= 500)
  );
}

// These defaults are for reads only (GET is safe to repeat). Claims are POSTs and
// handle retries themselves with an Idempotency-Key.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Always try the request, so being offline shows up as an error with a Retry button
      // instead of a silently paused query.
      networkMode: 'always',
      retry: (failureCount, error) => {
        if (!(error instanceof ApiError)) return false;
        if (error.status === 429) return failureCount < MAX_RATE_LIMIT_RETRIES;
        return isTransient(error) && failureCount < MAX_RETRIES;
      },
      retryDelay: (failureCount, error) =>
        error instanceof ApiError && error.retryAfterMs !== undefined
          ? error.retryAfterMs
          : Math.min(1000 * 2 ** failureCount, 8000),
    },
  },
});
