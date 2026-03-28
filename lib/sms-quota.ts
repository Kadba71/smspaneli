import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getTodayStartUTC } from '@/lib/utils'
import { enqueueSms } from '@/lib/sms-queue'

export const DAILY_SMS_LIMIT = 500

export interface DailySmsQuota {
  limit: number
  used: number
  remaining: number
  exhausted: boolean
}

interface QuotaEnqueueInput {
  userId: string
  phoneNumber: string
  message: string
}

const SERIALIZABLE_RETRY_LIMIT = 3

export class DailySmsQuotaExceededError extends Error {
  quota: DailySmsQuota

  constructor(quota: DailySmsQuota) {
    super('Gunluk SMS hakki doldu')
    this.name = 'DailySmsQuotaExceededError'
    this.quota = quota
  }
}

export function buildDailySmsQuota(used: number, limit = DAILY_SMS_LIMIT): DailySmsQuota {
  const normalizedUsed = Math.max(0, used)
  const remaining = Math.max(limit - normalizedUsed, 0)

  return {
    limit,
    used: normalizedUsed,
    remaining,
    exhausted: remaining === 0,
  }
}

export async function getDailySmsQuotaForUser(
  userId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  const used = await db.smsLog.count({
    where: {
      userId,
      createdAt: { gte: getTodayStartUTC() },
    },
  })

  return buildDailySmsQuota(used)
}

export async function enqueueSmsWithDailyQuota(input: QuotaEnqueueInput) {
  for (let attempt = 0; attempt < SERIALIZABLE_RETRY_LIMIT; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const quota = await getDailySmsQuotaForUser(input.userId, tx)

          if (quota.exhausted) {
            throw new DailySmsQuotaExceededError(quota)
          }

          const log = await enqueueSms(input, tx)

          return {
            log,
            quota: buildDailySmsQuota(quota.used + 1),
          }
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      )
    } catch (error) {
      if (error instanceof DailySmsQuotaExceededError) {
        throw error
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < SERIALIZABLE_RETRY_LIMIT - 1
      ) {
        continue
      }

      throw error
    }
  }

  throw new Error('Gunluk SMS kotasi islenirken tekrar denenemeyen bir hata olustu')
}