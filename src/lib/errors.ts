import { ApiError } from '@/api/client';

export type ErrorInfo = {
  title: string;
  message: string;
  /** The token is missing, wrong or expired: offer to change it instead of retrying. */
  tokenProblem: boolean;
};

export function describeError(error: unknown): ErrorInfo {
  const info = (title: string, message: string, tokenProblem = false) => ({
    title,
    message,
    tokenProblem,
  });

  if (!(error instanceof ApiError)) {
    return info('Something went wrong', 'Please try again.');
  }
  switch (error.kind) {
    case 'network':
      return info('No connection', 'Check your internet connection and try again.');
    case 'timeout':
      return info('Server is not responding', 'The request took too long. Try again.');
    case 'invalid-response':
      return info('Unexpected response', 'The server sent data the app could not read.');
  }
  if (error.status === 401) {
    return info('Token not accepted', 'Your token is invalid or expired. Enter a new one.', true);
  }
  if (error.status === 429) {
    return info('Too many requests', 'Please wait a moment and try again.');
  }
  if (error.status !== undefined && error.status >= 500) {
    return info('Server problem', 'The server is having trouble right now. Try again.');
  }
  return info('Something went wrong', error.message);
}
