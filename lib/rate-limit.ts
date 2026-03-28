import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number
}

interface RateLimitOptions {
  limit: number
  windowMs: number
}

export const SMS_RATE_LIMIT = { limit: 20, windowMs: 5 * 60 * 1000 } satisfies RateLimitOptions
export const LOGIN_RATE_LIMIT_IP = { limit: 500, windowMs: 15 * 60 * 1000 } satisfies RateLimitOptions
export const LOGIN_RATE_LIMIT_EMAIL = { limit: 10, windowMs: 15 * 60 * 1000 } satisfies RateLimitOptions

export async function checkRateLimit(identifier: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date()

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const entry = await tx.rateLimitBucket.findUnique({
      where: { key: identifier },
    })

    if (!entry || entry.resetAt <= now) {
      const resetAt = new Date(now.getTime() + options.windowMs)
      await tx.rateLimitBucket.upsert({
        where: { key: identifier },
        update: {
          count: 1,
          resetAt,
        },
        create: {
          key: identifier,
          count: 1,
          resetAt,
        },
      })

      return {
        allowed: true,
        remaining: options.limit - 1,
        resetIn: options.windowMs,
      }
    }

    if (entry.count >= options.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetAt.getTime() - now.getTime(),
      }
    }

    const updated = await tx.rateLimitBucket.update({
      where: { key: identifier },
      data: {
        count: {
          increment: 1,
        },
      },
    })

    return {
      allowed: true,
      remaining: options.limit - updated.count,
      resetIn: updated.resetAt.getTime() - now.getTime(),
    }
  })
}

export async function deleteExpiredRateLimits() {
  await prisma.rateLimitBucket.deleteMany({
    where: {
      resetAt: {
        lt: new Date(),
      },
    },
  })
}
