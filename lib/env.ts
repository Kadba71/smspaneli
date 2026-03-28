import { z } from 'zod'

const DISALLOWED_JWT_SECRETS = new Set([
  'fallback-secret-change-in-production',
  'sms-panel-super-secret-jwt-key-change-in-production-2024',
  'local-dev-jwt-secret-please-change-2026-very-strong',
])

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL gerekli'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET en az 32 karakter olmalı'),
  SMS_API_URL: z.string().optional().default(''),
  SMS_API_KEY: z.string().optional().default(''),
  SMS_DEV_MODE: z.enum(['true', 'false']).optional().default('false'),
  SMS_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).optional().default(10000),
  SMS_LOG_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).optional().default(30),
  SMS_QUEUE_BATCH_SIZE: z.coerce.number().int().min(1).max(100).optional().default(50),
  SMS_QUEUE_CONCURRENCY: z.coerce.number().int().min(1).max(20).optional().default(12),
  SMS_QUEUE_STALE_MINUTES: z.coerce.number().int().min(1).max(30).optional().default(2),
  ALLOW_PRODUCTION_SMS_DEV_MODE: z.enum(['true', 'false']).optional().default('false'),
  TRUST_PROXY_HEADERS: z.enum(['true', 'false']).optional().default('false'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  PROXY_API_KEY: z.string().optional().default(''),
  PROXY_ENABLED: z.enum(['true', 'false']).optional().default('false'),
  DECODO_PROXY_HOST: z.string().optional().default(''),
  DECODO_PROXY_PORT_START: z.coerce.number().int().min(1).max(65535).optional().default(10001),
  DECODO_PROXY_ENDPOINT_COUNT: z.coerce.number().int().min(1).max(10000).optional().default(100),
  DECODO_PROXY_USERNAME: z.string().optional().default(''),
  DECODO_PROXY_PASSWORD: z.string().optional().default(''),
  DECODO_PROXY_PROTOCOL: z.enum(['http', 'https', 'socks5']).optional().default('http'),
})

export type AppEnv = ReturnType<typeof buildEnv>

export function buildEnv(rawEnv: Record<string, string | undefined>) {
  const parsed = envSchema.parse(rawEnv)
  const smsApiUrl = parsed.SMS_API_URL.trim()
  const smsApiKey = parsed.SMS_API_KEY.trim()
  const requestedSmsDevMode = parsed.SMS_DEV_MODE === 'true'
  const allowProductionSmsDevMode = parsed.ALLOW_PRODUCTION_SMS_DEV_MODE === 'true'
  const smsDevMode = requestedSmsDevMode && !(smsApiUrl && smsApiKey)

  if (DISALLOWED_JWT_SECRETS.has(parsed.JWT_SECRET)) {
    throw new Error('JWT_SECRET varsayılan veya zayıf bir değer olamaz. Güçlü bir secret tanımlayın.')
  }

  if (parsed.NODE_ENV === 'production' && smsDevMode && !allowProductionSmsDevMode) {
    throw new Error('Production ortamında SMS_DEV_MODE=true kullanılamaz.')
  }

  if (!smsDevMode && (!smsApiUrl || !smsApiKey)) {
    throw new Error('SMS_API_URL ve SMS_API_KEY tanımlı değilse SMS_DEV_MODE=true olmalıdır.')
  }

  if (
    parsed.PROXY_ENABLED === 'true' &&
    (!parsed.DECODO_PROXY_HOST.trim() ||
      !parsed.DECODO_PROXY_USERNAME.trim() ||
      !parsed.DECODO_PROXY_PASSWORD.trim())
  ) {
    throw new Error('Proxy aktifse DECODO_PROXY_HOST, DECODO_PROXY_USERNAME ve DECODO_PROXY_PASSWORD zorunludur.')
  }

  return {
    NODE_ENV: parsed.NODE_ENV,
    DATABASE_URL: parsed.DATABASE_URL,
    JWT_SECRET: parsed.JWT_SECRET,
    SMS_API_URL: smsApiUrl,
    SMS_API_KEY: smsApiKey,
    SMS_DEV_MODE: smsDevMode,
    SMS_REQUEST_TIMEOUT_MS: parsed.SMS_REQUEST_TIMEOUT_MS,
    SMS_LOG_RETENTION_DAYS: parsed.SMS_LOG_RETENTION_DAYS,
    SMS_QUEUE_BATCH_SIZE: parsed.SMS_QUEUE_BATCH_SIZE,
    SMS_QUEUE_CONCURRENCY: parsed.SMS_QUEUE_CONCURRENCY,
    SMS_QUEUE_STALE_MINUTES: parsed.SMS_QUEUE_STALE_MINUTES,
    ALLOW_PRODUCTION_SMS_DEV_MODE: allowProductionSmsDevMode,
    TRUST_PROXY_HEADERS: parsed.TRUST_PROXY_HEADERS === 'true',
    NEXT_PUBLIC_APP_URL: parsed.NEXT_PUBLIC_APP_URL,
    PROXY_API_KEY: parsed.PROXY_API_KEY.trim(),
    PROXY_ENABLED: parsed.PROXY_ENABLED === 'true',
    DECODO_PROXY_HOST: parsed.DECODO_PROXY_HOST.trim(),
    DECODO_PROXY_PORT_START: parsed.DECODO_PROXY_PORT_START,
    DECODO_PROXY_ENDPOINT_COUNT: parsed.DECODO_PROXY_ENDPOINT_COUNT,
    DECODO_PROXY_USERNAME: parsed.DECODO_PROXY_USERNAME.trim(),
    DECODO_PROXY_PASSWORD: parsed.DECODO_PROXY_PASSWORD.trim(),
    DECODO_PROXY_PROTOCOL: parsed.DECODO_PROXY_PROTOCOL,
  }
}

let cachedEnv: AppEnv | undefined

export function getEnv(): AppEnv {
  cachedEnv ??= buildEnv(process.env)
  return cachedEnv
}

export const env = new Proxy({} as AppEnv, {
  get(_, key) {
    return getEnv()[key as keyof AppEnv]
  },
})