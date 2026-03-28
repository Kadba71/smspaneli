import { describe, expect, it } from 'vitest'
import { buildEnv } from '@/lib/env'

const baseEnv = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5433/sms_panel?schema=public',
  JWT_SECRET: 'this-is-a-long-and-safe-development-secret-123456',
  SMS_API_URL: '',
  SMS_API_KEY: '',
  SMS_DEV_MODE: 'true',
  SMS_REQUEST_TIMEOUT_MS: '10000',
  SMS_LOG_RETENTION_DAYS: '30',
  SMS_QUEUE_BATCH_SIZE: '50',
  SMS_QUEUE_CONCURRENCY: '12',
  SMS_QUEUE_STALE_MINUTES: '2',
  ALLOW_PRODUCTION_SMS_DEV_MODE: 'false',
  TRUST_PROXY_HEADERS: 'false',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  PROXY_ENABLED: 'false',
  DECODO_PROXY_HOST: '',
  DECODO_PROXY_PORT_START: '10001',
  DECODO_PROXY_ENDPOINT_COUNT: '100',
  DECODO_PROXY_USERNAME: '',
  DECODO_PROXY_PASSWORD: '',
  DECODO_PROXY_PROTOCOL: 'http',
}

describe('buildEnv', () => {
  it('accepts development config with explicit SMS dev mode', () => {
    const env = buildEnv(baseEnv)

    expect(env.SMS_DEV_MODE).toBe(true)
    expect(env.JWT_SECRET).toBe(baseEnv.JWT_SECRET)
    expect(env.SMS_REQUEST_TIMEOUT_MS).toBe(10000)
    expect(env.SMS_LOG_RETENTION_DAYS).toBe(30)
    expect(env.SMS_QUEUE_BATCH_SIZE).toBe(50)
    expect(env.SMS_QUEUE_CONCURRENCY).toBe(12)
    expect(env.SMS_QUEUE_STALE_MINUTES).toBe(2)
    expect(env.ALLOW_PRODUCTION_SMS_DEV_MODE).toBe(false)
    expect(env.TRUST_PROXY_HEADERS).toBe(false)
    expect(env.PROXY_ENABLED).toBe(false)
    expect(env.DECODO_PROXY_PORT_START).toBe(10001)
    expect(env.DECODO_PROXY_ENDPOINT_COUNT).toBe(100)
  })

  it('rejects default or weak JWT secrets', () => {
    expect(() =>
      buildEnv({
        ...baseEnv,
        JWT_SECRET: 'sms-panel-super-secret-jwt-key-change-in-production-2024',
      })
    ).toThrow(/JWT_SECRET/)
  })

  it('rejects production SMS dev mode', () => {
    expect(() =>
      buildEnv({
        ...baseEnv,
        NODE_ENV: 'production',
      })
    ).toThrow(/SMS_DEV_MODE/)
  })

  it('allows explicit opt-in for production SMS dev mode', () => {
    const env = buildEnv({
      ...baseEnv,
      NODE_ENV: 'production',
      ALLOW_PRODUCTION_SMS_DEV_MODE: 'true',
    })

    expect(env.SMS_DEV_MODE).toBe(true)
    expect(env.ALLOW_PRODUCTION_SMS_DEV_MODE).toBe(true)
  })

  it('requires SMS credentials when dev mode is disabled', () => {
    expect(() =>
      buildEnv({
        ...baseEnv,
        SMS_DEV_MODE: 'false',
      })
    ).toThrow(/SMS_API_URL/)
  })

  it('requires Decodo gateway credentials when proxy is enabled', () => {
    expect(() =>
      buildEnv({
        ...baseEnv,
        PROXY_ENABLED: 'true',
      })
    ).toThrow(/DECODO_PROXY_HOST/)
  })
})