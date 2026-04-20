type RateLimitState = {
  count: number;
  resetAt: number;
  blockedUntil?: number;
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
  blockDurationMs?: number;
};

const store = new Map<string, RateLimitState>();

function getNow(): number {
  return Date.now();
}

export function checkRateLimit(key: string, options: RateLimitOptions): { allowed: boolean; retryAfterMs: number } {
  const now = getNow();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.blockedUntil && existing.blockedUntil > now) {
    return { allowed: false, retryAfterMs: existing.blockedUntil - now };
  }

  existing.count += 1;

  if (existing.count > options.max) {
    if (options.blockDurationMs) {
      existing.blockedUntil = now + options.blockDurationMs;
      return { allowed: false, retryAfterMs: options.blockDurationMs };
    }
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function clearRateLimitStore(): void {
  store.clear();
}
