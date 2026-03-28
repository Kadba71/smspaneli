import { describe, expect, it } from 'vitest'
import { getNextTurkeyMidnightUTC } from '@/lib/utils'

describe('getNextTurkeyMidnightUTC', () => {
  it('returns the next Turkey midnight in UTC', () => {
    const result = getNextTurkeyMidnightUTC(new Date('2026-03-28T20:15:00.000Z'))

    expect(result.toISOString()).toBe('2026-03-28T21:00:00.000Z')
  })
})