/**
 * SMS Gönderme Fonksiyonu
 * Bu fonksiyon içine kendi SMS API'nizi entegre edin.
 *
 * Örnek entegrasyon:
 * const response = await fetch(process.env.SMS_API_URL!, {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({ to: phone, message }),
 * })
 * const data = await response.json()
 * return { success: response.ok, response: data }
 */

import { ProxyAgent } from 'undici'
import { env } from './env'

export interface SMSResult {
  success: boolean
  response: unknown
}

export function extractSmsBalance(response: unknown): string | null {
  if (!response || typeof response !== 'object') {
    return null
  }

  const candidate = response as Record<string, unknown>
  const balance = candidate.balance

  if (typeof balance === 'number') {
    return balance.toFixed(4)
  }

  if (typeof balance === 'string' && balance.trim()) {
    return balance.trim()
  }

  return null
}

export function extractSmsBalanceFromApiResponse(apiResponse: string | null | undefined): string | null {
  if (!apiResponse) {
    return null
  }

  try {
    return extractSmsBalance(JSON.parse(apiResponse))
  } catch {
    return null
  }
}

function resolveMsgRushEndpoint(url: string) {
  const trimmedUrl = url.trim().replace(/\/+$/, '')

  if (trimmedUrl.endsWith('/api/sms-api/send') || trimmedUrl.endsWith('/sms-api/send')) {
    return trimmedUrl
  }

  if (trimmedUrl.endsWith('/api')) {
    return `${trimmedUrl}/sms-api/send`
  }

  return `${trimmedUrl}/api/sms-api/send`
}

function toE164TurkeyPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')

  if (digits.startsWith('90') && digits.length === 12) {
    return `+${digits}`
  }

  return `+90${digits}`
}

function looksLikeHtmlDocument(value: string) {
  return /<\s*!doctype html|<\s*html|<\s*head|<\s*body/i.test(value)
}

function parseProviderResponse(contentType: string, rawBody: string): unknown {
  if (!rawBody) {
    return null
  }

  const shouldParseJson =
    contentType.includes('application/json') ||
    contentType.includes('+json') ||
    rawBody.trim().startsWith('{') ||
    rawBody.trim().startsWith('[')

  if (!shouldParseJson) {
    return rawBody
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    return rawBody
  }
}

export function getSmsErrorMessage(response: unknown): string {
  if (!response) {
    return 'SMS sağlayıcısından boş cevap alındı.'
  }

  if (typeof response === 'string') {
    if (looksLikeHtmlDocument(response)) {
      return 'SMS sağlayıcısı JSON yerine HTML sayfa döndürdü. SMS_API_URL büyük olasılıkla panel veya kayıt sayfası, gerçek gönderim endpointi değil.'
    }

    return response.slice(0, 300)
  }

  if (typeof response === 'object') {
    const candidate = response as Record<string, unknown>
    const directError =
      candidate.error ?? candidate.message ?? candidate.detail ?? candidate.description ?? candidate.msg

    if (typeof directError === 'string' && directError.trim()) {
      return directError
    }

    if (typeof candidate.body === 'string' && looksLikeHtmlDocument(candidate.body)) {
      return 'SMS sağlayıcısı HTML sayfa döndürdü. SMS_API_URL büyük olasılıkla yanlış.'
    }
  }

  return 'SMS sağlayıcısı isteği reddetti.'
}

export async function sendSMS(phone: string, message: string, proxyUrl?: string): Promise<SMSResult> {
  try {
    if (env.SMS_DEV_MODE) {
      console.log(`[SMS DEV] Gönderilecek numara: ${phone}`)
      console.log(`[SMS DEV] Mesaj: ${message}`)
      console.log(`[SMS DEV] Proxy: ${proxyUrl ?? 'yok'}`)

      return {
        success: true,
        response: {
          status: 'sent',
          messageId: `dev-${Date.now()}`,
          phone,
          proxy: proxyUrl ? 'aktif' : 'yok',
          timestamp: new Date().toISOString(),
          note: 'SMS_DEV_MODE=true olduğu için geliştirme modu aktif.',
        },
      }
    }

    const endpoint = resolveMsgRushEndpoint(env.SMS_API_URL)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), env.SMS_REQUEST_TIMEOUT_MS)

    // Proxy agent oluştur (varsa)
    const fetchOptions: RequestInit & { dispatcher?: ProxyAgent } = {
      method: 'POST',
      headers: {
        'X-API-Key': env.SMS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender_id: 'MsgRush',
        recipients: [toE164TurkeyPhone(phone)],
        message,
      }),
      signal: controller.signal,
    }

    if (proxyUrl) {
      fetchOptions.dispatcher = new ProxyAgent(proxyUrl)
      console.log(`[SMS] Proxy kullanılıyor: ${proxyUrl.replace(/:[^:@]+@/, ':***@')}`)
    }

    let response: Response

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response = await fetch(endpoint, fetchOptions as any)
    } finally {
      clearTimeout(timeoutId)
    }

    const contentType = response.headers.get('content-type') ?? ''
    const rawBody = await response.text()
    const data = parseProviderResponse(contentType, rawBody)

    if (looksLikeHtmlDocument(rawBody)) {
      return {
        success: false,
        response: {
          error:
            'SMS sağlayıcısı HTML sayfa döndürdü. SMS_API_URL büyük olasılıkla panel veya kayıt bağlantısı; gerçek API gönderim endpointi gerekli.',
          status: response.status,
          body: rawBody.slice(0, 500),
        },
      }
    }

    return {
      success: response.ok,
      response:
        typeof data === 'string'
          ? {
              status: response.status,
              body: data,
            }
          : data,
    }
  } catch (error) {
    console.error('[SMS ERROR]', error)

    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `SMS sağlayıcısı ${env.SMS_REQUEST_TIMEOUT_MS} ms içinde yanıt vermedi.`
        : error instanceof Error
        ? error.message
        : 'Bilinmeyen hata'

    return {
      success: false,
      response: {
        error: message,
        timestamp: new Date().toISOString(),
      },
    }
  }
}
