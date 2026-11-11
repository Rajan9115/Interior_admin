import "server-only";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const loginAttemptStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 10 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function pruneExpired(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, record] of loginAttemptStore.entries()) {
    if (now >= record.resetAt) {
      loginAttemptStore.delete(key);
    }
  }
}

/**
 * Checks if an action is currently rate-limited.
 */
export function isRateLimited(
  key: string,
  maxAttempts = 5
): { limited: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  pruneExpired(now);

  const record = loginAttemptStore.get(key);

  if (!record || now >= record.resetAt) {
    return {
      limited: false,
      remaining: maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      limited: true,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  return {
    limited: false,
    remaining: maxAttempts - record.count,
    retryAfterSeconds: 0,
  };
}

/**
 * Increments failed attempts for an identifier.
 */
export function recordFailure(key: string, windowMs = 15 * 60 * 1000): void {
  const now = Date.now();
  const record = loginAttemptStore.get(key);

  if (!record || now >= record.resetAt) {
    loginAttemptStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
  } else {
    record.count += 1;
  }
}

/**
 * Resets the rate limit counter upon successful action.
 */
export function resetLimit(key: string): void {
  loginAttemptStore.delete(key);
}
