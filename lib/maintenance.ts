import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { env } from './env'
import { deleteExpiredRateLimits } from './rate-limit'
import { refreshAllUserProxies } from './proxy'
import { processSmsQueue } from './sms-queue'
import { getNextTurkeyMidnightUTC, getTodayStartUTC } from './utils'

const SMS_QUEUE_JOB_KEY = 'job:sms-queue'
const DAILY_LOG_CLEANUP_JOB_KEY = 'job:daily-log-cleanup'
const DAILY_PROXY_REFRESH_JOB_KEY = 'job:daily-proxy-refresh'
const SMS_QUEUE_INTERVAL_MS = 5 * 1000
const MAINTENANCE_THROTTLE_MS = 1000

const globalForMaintenance = globalThis as typeof globalThis & {
  smsPanelMaintenancePromise?: Promise<void>
  smsPanelMaintenanceLastKickAt?: number
}

function isUniqueConstraintError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return true
  }

  return error instanceof Error && /unique constraint failed/i.test(error.message)
}

async function tryAcquireScheduledJob(key: string, nextRunAt: Date) {
  const now = new Date()
  const existing = await prisma.rateLimitBucket.findUnique({
    where: { key },
    select: { resetAt: true },
  })

  if (existing) {
    if (existing.resetAt > now) {
      return false
    }

    const updated = await prisma.rateLimitBucket.updateMany({
      where: {
        key,
        resetAt: {
          lte: now,
        },
      },
      data: {
        resetAt: nextRunAt,
        count: {
          increment: 1,
        },
      },
    })

    return updated.count === 1
  }

  try {
    await prisma.rateLimitBucket.create({
      data: {
        key,
        count: 1,
        resetAt: nextRunAt,
      },
    })

    return true
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return false
    }

    throw error
  }
}

export async function cleanupSmsLogsBeforeToday() {
  const todayStart = getTodayStartUTC()

  const result = await prisma.smsLog.deleteMany({
    where: {
      createdAt: {
        lt: todayStart,
      },
    },
  })

  if (result.count > 0) {
    console.log(`[MAINTENANCE] ${result.count} adet eski SMS logu temizlendi.`)
  }

  await deleteExpiredRateLimits()
}

export async function runSmsQueueIfDue() {
  const acquired = await tryAcquireScheduledJob(
    SMS_QUEUE_JOB_KEY,
    new Date(Date.now() + SMS_QUEUE_INTERVAL_MS)
  )

  if (!acquired) {
    return false
  }

  await processSmsQueue()
  return true
}

export async function runDailyLogCleanupIfDue() {
  const acquired = await tryAcquireScheduledJob(
    DAILY_LOG_CLEANUP_JOB_KEY,
    getNextTurkeyMidnightUTC()
  )

  if (!acquired) {
    return false
  }

  await cleanupSmsLogsBeforeToday()
  return true
}

export async function runDailyProxyRefreshIfDue() {
  if (!env.PROXY_ENABLED) {
    return false
  }

  const acquired = await tryAcquireScheduledJob(
    DAILY_PROXY_REFRESH_JOB_KEY,
    getNextTurkeyMidnightUTC()
  )

  if (!acquired) {
    return false
  }

  const result = await refreshAllUserProxies()
  console.log(
    `[MAINTENANCE] Proxy yenileme tamamlandı: ${result.success} başarılı, ${result.failed} başarısız`
  )
  return true
}

export async function runDueMaintenance() {
  const now = Date.now()

  if (globalForMaintenance.smsPanelMaintenancePromise) {
    await globalForMaintenance.smsPanelMaintenancePromise
    return
  }

  if (
    globalForMaintenance.smsPanelMaintenanceLastKickAt &&
    now - globalForMaintenance.smsPanelMaintenanceLastKickAt < MAINTENANCE_THROTTLE_MS
  ) {
    return
  }

  globalForMaintenance.smsPanelMaintenanceLastKickAt = now
  globalForMaintenance.smsPanelMaintenancePromise = (async () => {
    await runDailyLogCleanupIfDue()
    await runDailyProxyRefreshIfDue()
    await runSmsQueueIfDue()
  })().finally(() => {
    globalForMaintenance.smsPanelMaintenancePromise = undefined
  })

  await globalForMaintenance.smsPanelMaintenancePromise
}