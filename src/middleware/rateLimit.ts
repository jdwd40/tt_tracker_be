import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from './error';

// Simple in-memory store for rate limiting
// In production, use Redis or a database
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiting middleware
 * Limits requests per IP address within a time window
 */
export const rateLimit = (
  windowMs: number = env.RATE_LIMIT_WINDOW_MS,
  maxRequests: number = env.RATE_LIMIT_MAX_REQUESTS
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }
    
    // Increment request count
    entry.count++;
    
    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      res.set('Retry-After', retryAfter.toString());
      next(new AppError(
        'TOO_MANY_REQUESTS',
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      ));
      return;
    }
    
    // Add rate limit headers
    res.set('X-RateLimit-Limit', maxRequests.toString());
    res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
    res.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
    
    next();
  };
};

/**
 * Stricter rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimit(15 * 60 * 1000, 5); // 5 requests per 15 minutes

/**
 * General API rate limiting
 */
export const apiRateLimit = rateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute
