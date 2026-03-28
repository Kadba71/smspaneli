import { prisma } from '../../lib/prisma'

function getArg(name: string) {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return null
  }

  return process.argv[index + 1] ?? null
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))
  return sorted[index]
}

async function loginUser(baseUrl: string, password: string, sequence: number) {
  const email = `loadtest.user.${String(sequence).padStart(3, '0')}@panel.local`
  const loginStartedAt = performance.now()

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const loginDuration = performance.now() - loginStartedAt
  const setCookie = loginResponse.headers.get('set-cookie')

  if (!loginResponse.ok || !setCookie) {
    const loginBody = await loginResponse.text()
    throw new Error(`Login başarısız: ${email} ${loginResponse.status} ${loginBody}`)
  }

  return {
    email,
    cookie: setCookie,
    loginDuration,
  }
}

async function sendSms(baseUrl: string, cookie: string, templateId: string, sequence: number) {
  const sendStartedAt = performance.now()
  const sendResponse = await fetch(`${baseUrl}/api/sms/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      phoneNumber: `555000${String(sequence).padStart(4, '0')}`.slice(0, 10),
      templateId,
    }),
  })

  const sendDuration = performance.now() - sendStartedAt
  const sendBody = await sendResponse.text()

  if (sendResponse.status !== 202) {
    throw new Error(`Gönderim başarısız: ${sequence} ${sendResponse.status} ${sendBody}`)
  }

  return {
    sendDuration,
  }
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

async function main() {
  const baseUrl = getArg('--url') ?? process.env.LOAD_TEST_TARGET_URL ?? 'http://127.0.0.1:3000'
  const users = Number(getArg('--users') ?? process.env.LOAD_TEST_USER_COUNT ?? '100')
  const authConcurrency = Number(getArg('--auth-concurrency') ?? process.env.LOAD_TEST_AUTH_CONCURRENCY ?? '25')
  const sendConcurrency = Number(getArg('--send-concurrency') ?? process.env.LOAD_TEST_SEND_CONCURRENCY ?? getArg('--concurrency') ?? process.env.LOAD_TEST_CONCURRENCY ?? String(users))
  const password = process.env.LOAD_TEST_PASSWORD ?? 'LoadTestPassword123!'

  const template = await prisma.smsTemplate.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  if (!template) {
    throw new Error('Aktif SMS şablonu bulunamadı. Önce loadtest:seed çalıştırın.')
  }

  const loginDurations: number[] = []
  const sendDurations: number[] = []
  const authenticatedUsers: Array<{ sequence: number; cookie: string }> = []
  let successCount = 0
  let failureCount = 0
  let loginFailureCount = 0

  const startedAt = performance.now()

  await runWithConcurrency(
    Array.from({ length: users }, (_, index) => index + 1),
    authConcurrency,
    async (sequence) => {
      try {
        const loginResult = await loginUser(baseUrl, password, sequence)
        loginDurations.push(loginResult.loginDuration)
        authenticatedUsers.push({ sequence, cookie: loginResult.cookie })
      } catch (error) {
        loginFailureCount++
        console.error('[LOADTEST RUN]', error instanceof Error ? error.message : error)
      }
    }
  )

  await runWithConcurrency(authenticatedUsers, sendConcurrency, async (item) => {
    try {
      const result = await sendSms(baseUrl, item.cookie, template.id, item.sequence)
      sendDurations.push(result.sendDuration)
      successCount++
    } catch (error) {
      failureCount++
      console.error('[LOADTEST RUN]', error instanceof Error ? error.message : error)
    }
  })

  const totalDuration = performance.now() - startedAt
  const averageLogin = loginDurations.length > 0 ? loginDurations.reduce((sum, item) => sum + item, 0) / loginDurations.length : 0
  const averageSend = sendDurations.length > 0 ? sendDurations.reduce((sum, item) => sum + item, 0) / sendDurations.length : 0

  console.log(JSON.stringify({
    users,
    authConcurrency,
    sendConcurrency,
    authenticatedUsers: authenticatedUsers.length,
    loginFailureCount,
    successCount,
    failureCount,
    totalDurationMs: Math.round(totalDuration),
    averageLoginMs: Math.round(averageLogin),
    averageQueueAcceptMs: Math.round(averageSend),
    loginP95Ms: Math.round(percentile(loginDurations, 0.95)),
    queueAcceptP95Ms: Math.round(percentile(sendDurations, 0.95)),
  }, null, 2))
}

main()
  .catch((error) => {
    console.error('[LOADTEST]', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })