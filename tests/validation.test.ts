import { describe, expect, it } from 'vitest'
import {
  PASSWORD_MIN_LENGTH,
  buildTemplatedSmsMessage,
  isSmsStatus,
  isUserRole,
  normalizeEmail,
  validateCallbackNumber,
  validatePassword,
  validatePhoneNumber,
  validateSmsMessage,
} from '@/lib/validation'

describe('validation helpers', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  ADMIN@Panel.Com ')).toBe('admin@panel.com')
  })

  it('enforces password minimum length', () => {
    expect(validatePassword('1234')).toBe(`Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır`)
    expect(validatePassword('12345678')).toBeNull()
  })

  it('validates Turkish mobile phone numbers', () => {
    expect(validatePhoneNumber('555 123 45 67')).toEqual({
      cleanPhone: '5551234567',
      error: null,
    })
    expect(validatePhoneNumber('4441234567').error).toMatch(/5 ile başlamalıdır/)
  })

  it('validates callback numbers and normalizes them to +90 format', () => {
    expect(validateCallbackNumber('+90 555 123 45 67')).toEqual({
      formattedNumber: '+905551234567',
      error: null,
    })
    expect(validateCallbackNumber('05551234567')).toEqual({
      formattedNumber: '+905551234567',
      error: null,
    })
    expect(validateCallbackNumber('4441234567').error).toMatch(/5 ile baslamalidir/)
  })

  it('validates SMS message length', () => {
    expect(validateSmsMessage('   ').error).toMatch(/boş olamaz/)
    expect(validateSmsMessage('Merhaba').message).toBe('Merhaba')
  })

  it('builds a templated SMS message with callback number on a new line', () => {
    expect(
      buildTemplatedSmsMessage('Detayli bilgi icin ;', '+905551234567')
    ).toBe('Detayli bilgi icin ;\n+905551234567')
  })

  it('validates allowed role and status values', () => {
    expect(isUserRole('admin')).toBe(true)
    expect(isUserRole('owner')).toBe(false)
    expect(isSmsStatus('success')).toBe(true)
    expect(isSmsStatus('queued')).toBe(true)
    expect(isSmsStatus('processing')).toBe(true)
    expect(isSmsStatus('unknown')).toBe(false)
  })
})