import { FirebaseMcpError, ErrorType } from './error-handler.js';

interface RateLimitConfig {
  maxRequests: number;  // Maximum number of requests allowed
  windowMs: number;     // Time window in milliseconds
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

/**
 * Simple in-memory rate limiter
 */
export class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private readonly config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequests: config.maxRequests || 100,  // Default 100 requests
      windowMs: config.windowMs || 60000,      // Default 1 minute window
    };
  }

  /**
   * Check if a request should be rate limited
   * @param key Identifier for the request (e.g., IP address, user ID)
   * @returns true if request is allowed, false if rate limited
   */
  check(key: string): boolean {
    try {
      this.checkRateLimit(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a request should be rate limited
   * @param key Identifier for the request (e.g., IP address, user ID)
   * @throws {FirebaseMcpError} if rate limit is exceeded
   */
  private checkRateLimit(key: string): void {
    const now = Date.now();
    let record = this.requests.get(key);

    // Clean up expired records
    this.cleanup();

    if (!record || now >= record.resetTime) {
      // First request or window expired, create new record
      record = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      this.requests.set(key, record);
      return;
    }

    // Increment request count
    record.count++;

    // Check if limit exceeded
    if (record.count > this.config.maxRequests) {
      const waitTime = Math.ceil((record.resetTime - now) / 1000);
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        `Rate limit exceeded. Please try again in ${waitTime} seconds.`
      );
    }
  }

  /**
   * Clean up expired rate limit records
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now >= record.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a key
   * @param key Identifier to reset
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Get current request count for a key
   * @param key Identifier to check
   * @returns Current request count and time until reset
   */
  getStatus(key: string): { count: number; remainingTime: number } | null {
    const record = this.requests.get(key);
    if (!record) return null;

    const now = Date.now();
    return {
      count: record.count,
      remainingTime: Math.max(0, record.resetTime - now)
    };
  }
}

// Create default instance with standard limits
export const defaultRateLimiter = new RateLimiter();
