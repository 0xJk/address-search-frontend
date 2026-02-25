import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const redis = createRedis()

/** API rate limiter: 100 requests per 3 hours per IP (sliding window) */
export const apiRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '3 h'),
      prefix: 'ratelimit:api',
    })
  : null

/** Login rate limiter: 10 attempts per 15 minutes per IP (sliding window) */
export const loginRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '15 m'),
      prefix: 'ratelimit:login',
    })
  : null

export interface RateLimitResult {
  limited: boolean
  remaining?: number
  reset?: number
}

/** Check rate limit with fail-open. Returns { limited: false } on any error. */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<RateLimitResult> {
  if (!limiter) return { limited: false }
  try {
    const { success, remaining, reset } = await limiter.limit(identifier)
    return { limited: !success, remaining, reset }
  } catch (error) {
    console.error('Rate limit check failed (fail-open):', error)
    return { limited: false }
  }
}
