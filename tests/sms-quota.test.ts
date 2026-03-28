import { describe, expect, it } from 'vitest'
import { DAILY_SMS_LIMIT, buildDailySmsQuota } from '@/lib/sms-quota'

describe('sms quota helpers', () => {
  it('builds a remaining quota snapshot', () => {
    expect(buildDailySmsQuota(125)).toEqual({
      limit: DAILY_SMS_LIMIT,
      used: 125,
      remaining: 375,
      exhausted: false,
    })
  })

  it('marks quota as exhausted at the daily limit', () => {
    expect(buildDailySmsQuota(DAILY_SMS_LIMIT)).toEqual({
      limit: DAILY_SMS_LIMIT,
      used: DAILY_SMS_LIMIT,
      remaining: 0,
      exhausted: true,
    })
  })
})