import { prisma } from './prisma'
import { env } from './env'
import { getTodayStartUTC, getNextTurkeyMidnightUTC } from './utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any

interface ProxyConfig {
  host: string
  port: number
  username: string | null
  password: string | null
  protocol: string
}

function getTurkeyMidnight(): Date {
  return getNextTurkeyMidnightUTC()
}

function getTurkeyDayKey() {
  return Math.floor(getTodayStartUTC().getTime() / (24 * 60 * 60 * 1000))
}

function buildGatewayProxyPool(): ProxyConfig[] {
  return Array.from({ length: env.DECODO_PROXY_ENDPOINT_COUNT }, (_, index) => ({
    host: env.DECODO_PROXY_HOST,
    port: env.DECODO_PROXY_PORT_START + index,
    username: env.DECODO_PROXY_USERNAME,
    password: env.DECODO_PROXY_PASSWORD,
    protocol: env.DECODO_PROXY_PROTOCOL,
  }))
}

function getRotatedProxyPool() {
  const proxyPool = buildGatewayProxyPool()

  if (proxyPool.length === 0) {
    return proxyPool
  }

  const rotationOffset = getTurkeyDayKey() % proxyPool.length
  return proxyPool.map((_, index) => proxyPool[(index + rotationOffset) % proxyPool.length])
}

function ensureEnoughProxyCapacity(userCount: number, proxyCount: number) {
  if (userCount > proxyCount) {
    throw new Error(
      `Proxy havuzu yetersiz. ${userCount} kullanıcı için en az ${userCount} endpoint gerekli, mevcut ${proxyCount}.`
    )
  }
}

async function getCurrentlyAssignedPorts() {
  const records = await db.userProxy.findMany({
    select: {
      port: true,
      expiresAt: true,
    },
  })

  const now = new Date()
  return new Set(
    records.filter((record: { port: number; expiresAt: Date }) => record.expiresAt > now).map((record: { port: number }) => record.port)
  )
}

/**
 * Tek bir kullanıcıya proxy atar/günceller.
 */
async function assignProxyToUser(userId: string, proxy: ProxyConfig): Promise<void> {
  const expiresAt = getTurkeyMidnight()

  await db.userProxy.upsert({
    where: { userId },
    create: {
      userId,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
      protocol: proxy.protocol,
      assignedAt: new Date(),
      expiresAt,
      lastError: null,
    },
    update: {
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
      password: proxy.password,
      protocol: proxy.protocol,
      assignedAt: new Date(),
      expiresAt,
      lastError: null,
    },
  })
}

/**
 * Tüm kullanıcılara yeni proxy atar.
 * Her gece 00:00'da çağrılır.
 */
export async function refreshAllUserProxies(): Promise<{ success: number; failed: number }> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  if (users.length === 0) {
    console.log('[PROXY] Proxy atanacak kullanıcı bulunamadı.')
    return { success: 0, failed: 0 }
  }

  console.log(`[PROXY] ${users.length} kullanıcı için gateway proxy ataması hazırlanıyor...`)

  let proxies: ProxyConfig[]

  try {
    proxies = getRotatedProxyPool()
    ensureEnoughProxyCapacity(users.length, proxies.length)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    console.error(`[PROXY] ❌ Gateway proxy hazırlığı başarısız: ${message}`)

    await db.userProxy.updateMany({
      data: { lastError: `Proxy yenileme başarısız: ${message}` },
    })

    return { success: 0, failed: users.length }
  }

  let success = 0
  let failed = 0

  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const proxy = proxies[i]

    try {
      await assignProxyToUser(user.id, proxy)
      success++
    } catch (error) {
      failed++
      console.error(`[PROXY] ❌ Kullanıcı ${user.id} proxy ataması başarısız:`, error)
    }
  }

  console.log(`[PROXY] ✅ Proxy yenileme tamamlandı: ${success} başarılı, ${failed} başarısız`)
  return { success, failed }
}

/**
 * Belirli bir kullanıcının aktif proxy'sini döndürür.
 */
export async function getUserProxy(userId: string): Promise<ProxyConfig | null> {
  const record = await db.userProxy.findUnique({
    where: { userId },
  })

  if (!record) {
    return null
  }

  return {
    host: record.host,
    port: record.port,
    username: record.username,
    password: record.password,
    protocol: record.protocol,
  }
}

/**
 * Proxy URL'ini oluşturur (fetch agent için).
 * Format: http://user:pass@host:port
 */
export function buildProxyUrl(proxy: ProxyConfig): string {
  const auth = proxy.username && proxy.password
    ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
    : ''

  return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`
}

/**
 * Yeni eklenen bir kullanıcıya hemen proxy atar.
 * Decodo API'den 1 adet proxy çekip kullanıcıya atar.
 */
export async function assignProxyToNewUser(userId: string): Promise<void> {
  if (!env.PROXY_ENABLED) {
    return
  }

  console.log(`[PROXY] Yeni kullanıcıya proxy atanıyor: ${userId}`)

  const proxies = getRotatedProxyPool()
  const assignedPorts = await getCurrentlyAssignedPorts()
  const availableProxy = proxies.find((proxy) => !assignedPorts.has(proxy.port))

  if (!availableProxy) {
    throw new Error('Yeni kullanıcı için boş proxy endpoint bulunamadı. Endpoint sayısını artırın.')
  }

  await assignProxyToUser(userId, availableProxy)

  console.log(`[PROXY] ✅ Yeni kullanıcıya proxy atandı: ${userId}`)
}
