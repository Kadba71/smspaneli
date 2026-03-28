export const PASSWORD_MIN_LENGTH = 8
export const MAX_SMS_LENGTH = 640
export const USER_ROLES = ['admin', 'user'] as const
export const SMS_STATUSES = ['queued', 'processing', 'success', 'failed'] as const
export const AUTH_ATTEMPT_REASONS = ['success', 'invalid_credentials', 'validation_error', 'rate_limited'] as const

export type UserRole = (typeof USER_ROLES)[number]
export type SmsStatus = (typeof SMS_STATUSES)[number]
export type AuthAttemptReason = (typeof AUTH_ATTEMPT_REASONS)[number]

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidPassword(password: string): boolean {
  return password.trim().length >= PASSWORD_MIN_LENGTH
}

export function validatePassword(password: string): string | null {
  if (!isValidPassword(password)) {
    return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır`
  }

  return null
}

export function validatePhoneNumber(phoneNumber: string): { cleanPhone: string | null; error: string | null } {
  const cleanPhone = phoneNumber.replace(/\D/g, '')

  if (cleanPhone.length !== 10) {
    return {
      cleanPhone: null,
      error: 'Geçersiz telefon numarası. 10 haneli Türk numarası girin (5xx xxx xx xx)',
    }
  }

  if (!cleanPhone.startsWith('5')) {
    return {
      cleanPhone: null,
      error: 'Telefon numarası 5 ile başlamalıdır',
    }
  }

  return { cleanPhone, error: null }
}

export function validateCallbackNumber(callbackNumber: string): {
  formattedNumber: string | null
  error: string | null
} {
  const cleanNumber = callbackNumber.replace(/\D/g, '')

  let nationalNumber = cleanNumber

  if (cleanNumber.startsWith('90') && cleanNumber.length === 12) {
    nationalNumber = cleanNumber.slice(2)
  } else if (cleanNumber.startsWith('0') && cleanNumber.length === 11) {
    nationalNumber = cleanNumber.slice(1)
  }

  if (nationalNumber.length !== 10) {
    return {
      formattedNumber: null,
      error: 'Geri donus numarasi gecersiz. 10 haneli Turk numarasi girin (5xx xxx xx xx)',
    }
  }

  if (!nationalNumber.startsWith('5')) {
    return {
      formattedNumber: null,
      error: 'Geri donus numarasi 5 ile baslamalidir',
    }
  }

  return {
    formattedNumber: `+90${nationalNumber}`,
    error: null,
  }
}

export function validateSmsMessage(message: string): { message: string | null; error: string | null } {
  const trimmedMessage = message.trim()

  if (trimmedMessage.length < 1) {
    return { message: null, error: 'Mesaj boş olamaz' }
  }

  if (trimmedMessage.length > MAX_SMS_LENGTH) {
    return { message: null, error: `Mesaj en fazla ${MAX_SMS_LENGTH} karakter olabilir` }
  }

  return { message: trimmedMessage, error: null }
}

export function buildTemplatedSmsMessage(templateMessage: string, callbackNumber: string): string {
  return `${templateMessage.trimEnd()}\n${callbackNumber.trim()}`
}

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole)
}

export function isSmsStatus(value: string): value is SmsStatus {
  return SMS_STATUSES.includes(value as SmsStatus)
}

export function parseUserRole(value: string): UserRole {
  if (!isUserRole(value)) {
    throw new Error(`Geçersiz kullanıcı rolü: ${value}`)
  }

  return value
}

export function parseSmsStatus(value: string): SmsStatus {
  if (!isSmsStatus(value)) {
    throw new Error(`Geçersiz SMS durumu: ${value}`)
  }

  return value
}

export function getSmsStatusLabel(status: SmsStatus): string {
  switch (status) {
    case 'queued':
      return 'Kuyrukta'
    case 'processing':
      return 'İşleniyor'
    case 'success':
      return 'Başarılı'
    case 'failed':
      return 'Başarısız'
  }
}