type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

type Entry = {
  count: number;
  resetAt: number;
};

const store = globalThis as typeof globalThis & {
  __selleeRateLimitStore?: Map<string, Entry>;
};

const memoryStore = store.__selleeRateLimitStore ?? new Map<string, Entry>();
store.__selleeRateLimitStore = memoryStore;

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      remaining: maxRequests - 1,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  existing.count += 1;
  memoryStore.set(key, existing);

  return {
    allowed: true,
    retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    remaining: maxRequests - existing.count,
  };
}

