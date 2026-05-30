import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Abuse / cost controls for the AI assistant endpoint.
 *
 * Graceful fallback: if Upstash is NOT configured (either env var missing),
 * the limiter always allows requests so the app still works in dev and before
 * Upstash is set up. We never throw at import time.
 */

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

type Limiters = { burst: Ratelimit; daily: Ratelimit }

let limiters: Limiters | null = null

if (url && token) {
  const redis = new Redis({ url, token })

  limiters = {
    // Burst limit: 10 requests per 60 seconds.
    burst: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: false,
      prefix: 'assistant:burst:',
    }),
    // Daily ceiling: 100 requests per 24 hours.
    daily: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '24 h'),
      analytics: false,
      prefix: 'assistant:day:',
    }),
  }
}

export type RateLimitResult = { success: boolean; retryAfterSeconds?: number }

/**
 * Check both the burst and daily limiters for a user. Returns
 * `{ success: true }` when allowed (including when Upstash is unconfigured).
 * On failure, `retryAfterSeconds` is derived from the limiter `reset` timestamp.
 */
export async function checkAssistantRateLimit(userId: string): Promise<RateLimitResult> {
  if (!limiters) return { success: true }

  const [daily, burst] = await Promise.all([
    limiters.daily.limit(userId),
    limiters.burst.limit(userId),
  ])

  if (!daily.success || !burst.success) {
    const now = Date.now()
    const resets = [
      ...(daily.success ? [] : [daily.reset]),
      ...(burst.success ? [] : [burst.reset]),
    ]
    const reset = Math.max(...resets)
    const retryAfterSeconds = Math.max(1, Math.ceil((reset - now) / 1000))
    return { success: false, retryAfterSeconds }
  }

  return { success: true }
}
