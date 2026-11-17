
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly maxRequests: number = 10,
    private readonly windowMs: number = 60000
  ) {
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    // Housekeeping must never be the reason a process stays alive (tests, scripts, a draining server).
    this.cleanupInterval.unref?.();
  }

  public checkLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetIn: this.windowMs
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetTime - now
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetIn: entry.resetTime - now
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  public clear(): void {
    this.requests.clear();
  }

  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

export const webhookRateLimiter = new RateLimiter(20, 60000);
export const testEndpointRateLimiter = new RateLimiter(5, 60000);

// Mesh gateways: a gateway may flush a backlog, so the per-address allowance is generous;
// the per-author one is what stops a single key flooding the map.
export const meshIpRateLimiter = new RateLimiter(60, 60000);
export const meshAuthorRateLimiter = new RateLimiter(20, 3600000);

export const loginRateLimiter = new RateLimiter(10, 15 * 60000);

export default RateLimiter;
