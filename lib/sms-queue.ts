import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { env } from './env'
import { getSmsErrorMessage, sendSMS } from './sms'
import { getUserProxy, buildProxyUrl } from './proxy'

interface QueuedSmsInput {
  userId: string
  phoneNumber: string
  message: string
}

interface QueueProcessLog {
  id: string
  userId: string
  phoneNumber: string
  message: string
}

const globalForSmsQueue = globalThis as typeof globalThis & {
  smsQueueProcessing?: boolean
}

export async function enqueueSms(
  input: QueuedSmsInput,
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  return db.smsLog.create({
    data: {
      userId: input.userId,
      phoneNumber: input.phoneNumber,
      message: input.message,
      status: 'queued',
      apiResponse: null,
      lastError: null,
      attemptCount: 0,
      processingStartedAt: null,
    },
  })
}

async function claimQueuedLogs(limit: number): Promise<QueueProcessLog[]> {
  const staleBefore = new Date(Date.now() - env.SMS_QUEUE_STALE_MINUTES * 60 * 1000)
  const candidates = await prisma.smsLog.findMany({
    where: {
      OR: [
        { status: 'queued' },
        {
          status: 'processing',
          processingStartedAt: { lt: staleBefore },
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      userId: true,
      phoneNumber: true,
      message: true,
      status: true,
      processingStartedAt: true,
    },
  })

  const claimed: QueueProcessLog[] = []

  for (const candidate of candidates) {
    const claimResult = await prisma.smsLog.updateMany({
      where: {
        id: candidate.id,
        OR: [
          { status: 'queued' },
          {
            status: 'processing',
            processingStartedAt: { lt: staleBefore },
          },
        ],
      },
      data: {
        status: 'processing',
        processingStartedAt: new Date(),
        attemptCount: {
          increment: 1,
        },
        lastError: null,
      },
    })

    if (claimResult.count === 1) {
      claimed.push({
        id: candidate.id,
        userId: candidate.userId,
        phoneNumber: candidate.phoneNumber,
        message: candidate.message,
      })
    }
  }

  return claimed
}

async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  const queue = [...items]
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) {
        return
      }

      await worker(item)
    }
  })

  await Promise.all(workers)
}

async function processClaimedLog(log: QueueProcessLog) {
  // Kullanıcının proxy'sini al (varsa ve proxy etkinse)
  let proxyUrl: string | undefined

  if (env.PROXY_ENABLED) {
    try {
      const proxy = await getUserProxy(log.userId)

      if (proxy) {
        proxyUrl = buildProxyUrl(proxy)
      }
    } catch (error) {
      console.error(`[SMS QUEUE] Proxy alınamadı (user: ${log.userId}):`, error)
    }
  }

  const smsResult = await sendSMS(log.phoneNumber, log.message, proxyUrl)

  await prisma.smsLog.update({
    where: { id: log.id },
    data: {
      status: smsResult.success ? 'success' : 'failed',
      apiResponse: JSON.stringify(smsResult.response),
      lastError: smsResult.success ? null : getSmsErrorMessage(smsResult.response),
      processingStartedAt: null,
    },
  })
}

export async function processSmsQueue() {
  if (globalForSmsQueue.smsQueueProcessing) {
    return
  }

  globalForSmsQueue.smsQueueProcessing = true

  try {
    for (let index = 0; index < 5; index++) {
      const claimed = await claimQueuedLogs(env.SMS_QUEUE_BATCH_SIZE)

      if (claimed.length === 0) {
        break
      }

      await runWithConcurrency(claimed, env.SMS_QUEUE_CONCURRENCY, async (log) => {
        try {
          await processClaimedLog(log)
        } catch (error) {
          console.error('[SMS QUEUE PROCESS]', error)
          await prisma.smsLog.update({
            where: { id: log.id },
            data: {
              status: 'failed',
              processingStartedAt: null,
              lastError: error instanceof Error ? error.message : 'Bilinmeyen kuyruk hatası',
            },
          })
        }
      })
    }
  } finally {
    globalForSmsQueue.smsQueueProcessing = false
  }
}