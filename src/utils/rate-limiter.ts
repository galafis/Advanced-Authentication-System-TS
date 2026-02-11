import { RateLimitExceededError } from "../errors";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly entries: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxAttempts: number, windowMs: number) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.startCleanup();
  }

  check(key: string): void {
    this.pruneExpired(key);

    const entry = this.entries.get(key);

    if (entry && entry.count >= this.maxAttempts) {
      const retryAfterMs = entry.resetAt - Date.now();
      throw new RateLimitExceededError(
        `Rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)} seconds`
      );
    }
  }

  record(key: string): void {
    this.pruneExpired(key);

    const entry = this.entries.get(key);

    if (entry) {
      entry.count += 1;
    } else {
      this.entries.set(key, {
        count: 1,
        resetAt: Date.now() + this.windowMs,
      });
    }
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  getRemainingAttempts(key: string): number {
    this.pruneExpired(key);
    const entry = this.entries.get(key);
    if (!entry) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - entry.count);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.entries.clear();
  }

  private pruneExpired(key: string): void {
    const entry = this.entries.get(key);
    if (entry && Date.now() >= entry.resetAt) {
      this.entries.delete(key);
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.entries) {
        if (now >= entry.resetAt) {
          this.entries.delete(key);
        }
      }
    }, this.windowMs);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
}
