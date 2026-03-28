import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { addDays, format, startOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { tr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Türkiye saat dilimi
const TURKEY_TZ = 'Europe/Istanbul'

/**
 * Bugünün Türkiye saatiyle başlangıcını UTC olarak döndürür
 */
export function getTodayStartUTC(): Date {
  const nowUtc = new Date()
  const nowTurkey = toZonedTime(nowUtc, TURKEY_TZ)
  const startOfTodayTurkey = startOfDay(nowTurkey)
  return fromZonedTime(startOfTodayTurkey, TURKEY_TZ)
}

export function getNextTurkeyMidnightUTC(baseDate = new Date()): Date {
  const turkeyDate = toZonedTime(baseDate, TURKEY_TZ)
  return fromZonedTime(addDays(startOfDay(turkeyDate), 1), TURKEY_TZ)
}

/**
 * UTC tarihi Türkiye saatine çevir ve formatla
 */
export function formatTurkeyTime(date: Date | string, fmt = 'HH:mm'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const zonedDate = toZonedTime(d, TURKEY_TZ)
  return format(zonedDate, fmt, { locale: tr })
}

/**
 * Telefon numarasını Türk formatına çevir: 5xx xxx xx xx
 */
export function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  const limited = cleaned.slice(0, 10)

  if (limited.length <= 3) return limited
  if (limited.length <= 6) return `${limited.slice(0, 3)} ${limited.slice(3)}`
  if (limited.length <= 8) return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`
  return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6, 8)} ${limited.slice(8)}`
}

/**
 * Telefon numarasını API için temizle (sadece rakamlar)
 */
export function cleanPhoneNumber(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Mesajı kısalt
 */
export function truncateMessage(message: string, maxLength = 40): string {
  if (message.length <= maxLength) return message
  return message.slice(0, maxLength) + '...'
}

/**
 * Bugünün başlangıcını UTC'de döndür (Türkiye saatine göre)
 */
export function getTodayRange() {
  const start = getTodayStartUTC()
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}
