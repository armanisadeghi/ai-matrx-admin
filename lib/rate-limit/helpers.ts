import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Extract the best identifier for rate limiting from a request.
 * Prefers x-forwarded-for (Vercel sets this), falls back to x-real-ip.
 */
export function getIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Check rate limit and return a 429 response if exceeded.
 * Returns null if the request is allowed.
 *
 * Usage:
 * ```ts
 * const limited = await checkRateLimit(request, getRatelimiter(), identifier);
 * if (limited) return limited;
 * ```
 */
export async function checkRateLimit(
  request: NextRequest,
  limiter: Ratelimit,
  identifier: string
): Promise<NextResponse | null> {
  // Skip rate limiting if Upstash is not configured (dev/test environments)
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return null;
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please slow down and try again.",
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    return null;
  } catch (err) {
    // If Redis is down, fail open (allow the request) but log the error
    console.error("[rate-limit] Redis check failed, failing open:", err);
    return null;
  }
}

/**
 * Convenience function: get IP + check rate limit in one call.
 */
export async function ipRateLimit(
  request: NextRequest,
  limiter: Ratelimit
): Promise<NextResponse | null> {
  const identifier = getIdentifier(request);
  return checkRateLimit(request, limiter, identifier);
}
