import { ApiError } from '@/api/client';

import { shouldRetryClaim } from '../claims-store';

const http = (status: number, details: { code?: string; field?: string; retryAfterMs?: number } = {}) =>
  new ApiError('http', `HTTP ${status}`, { status, ...details });

describe('shouldRetryClaim', () => {
  // Repeating the same request with the same Idempotency-Key is safe: the server returns the
  // original claim if it exists and never creates a second one.
  it.each([
    ['a network error (outcome unknown)', new ApiError('network', 'offline')],
    ['our client timeout (outcome unknown)', new ApiError('timeout', 'too slow')],
    ['an unreadable success body (claim probably created)', new ApiError('invalid-response', 'bad JSON')],
    ['500', http(500, { code: 'SERVER' })],
    ['503', http(503, { code: 'SERVER' })],
    ['504 (outcome unknown)', http(504, { code: 'TIMEOUT' })],
    ['429 (not processed, wait retryAfterMs)', http(429, { code: 'RATE_LIMITED', retryAfterMs: 2300 })],
  ])('retries the same request after %s', (_, error) => {
    expect(shouldRetryClaim(error)).toBe(true);
  });

  // A definite answer: the claim was not created, and sending it again can't change that.
  it.each([
    ['400 validation', http(400, { code: 'VALIDATION', field: 'amount' })],
    ['401 bad or expired token', http(401, { code: 'UNAUTHORIZED' })],
    ['404', http(404, { code: 'NOT_FOUND' })],
    ['409 key reused with a different body', http(409, { code: 'IDEMPOTENCY_MISMATCH' })],
  ])('stops after %s', (_, error) => {
    expect(shouldRetryClaim(error)).toBe(false);
  });

  it('does not retry errors that did not come from the API client', () => {
    expect(shouldRetryClaim(new Error('bug'))).toBe(false);
    expect(shouldRetryClaim(undefined)).toBe(false);
  });
});
