import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, clearRateLimitStore } from '../lib/server/rate-limit';

describe('rate limit helper', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it('allows requests under the threshold', () => {
    const first = checkRateLimit('key-1', { windowMs: 60000, max: 2 });
    const second = checkRateLimit('key-1', { windowMs: 60000, max: 2 });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it('blocks requests after threshold', () => {
    checkRateLimit('key-2', { windowMs: 60000, max: 1, blockDurationMs: 1000 });
    const blocked = checkRateLimit('key-2', { windowMs: 60000, max: 1, blockDurationMs: 1000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
});
