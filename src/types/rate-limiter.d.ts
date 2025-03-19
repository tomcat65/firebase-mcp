declare module '../utils/rate-limiter.js' {
  export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
  }

  export interface RequestRecord {
    count: number;
    resetTime: number;
  }

  export class RateLimiter {
    constructor(config?: Partial<RateLimitConfig>);
    checkRateLimit(key: string): void;
    reset(key: string): void;
    getStatus(key: string): { count: number; remainingTime: number } | null;
  }

  export const defaultRateLimiter: RateLimiter;
} 