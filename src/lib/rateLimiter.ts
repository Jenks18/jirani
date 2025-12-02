/**
 * Simple in-memory rate limiter for webhook endpoints
 * Prevents abuse and excessive API calls
 * 
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly maxRequests: number = 10,
    private readonly windowMs: number = 60000 // 1 minute
  ) {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if a request should be allowed
   * @param identifier - Unique identifier (e.g., phone number, IP)
   * @returns true if allowed, false if rate limited
   */
  public checkLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      // New window or expired entry
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
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetTime - now
      };
    }

    // Increment and allow
    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetIn: entry.resetTime - now
    };
  }

  /**
   * Remove expired entries from memory
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Clear all rate limit data (useful for testing)
   */
  public clear(): void {
    this.requests.clear();
  }

  /**
   * Cleanup on shutdown
   */
  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

// Export singleton instances for different use cases
export const webhookRateLimiter = new RateLimiter(20, 60000); // 20 requests per minute
export const testEndpointRateLimiter = new RateLimiter(5, 60000); // 5 requests per minute for test endpoint

export default RateLimiter;
