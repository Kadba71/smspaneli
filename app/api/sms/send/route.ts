import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClientIp } from '@/lib/request'
import { checkRateLimit, SMS_RATE_LIMIT } from '@/lib/rate-limit'
import { processSmsQueue } from '@/lib/sms-queue'
import { getTodayStartUTC } from '@/lib/utils'
import {
  DailySmsQuotaExceededError,
  enqueueSmsWithDailyQuota,
  getDailySmsQuotaForUser,
} from '@/lib/sms-quota'
import {
  buildTemplatedSmsMessage,
  validateCallbackNumber,
  validatePhoneNumber,
  validateSmsMessage,
} from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Rate limiting: Kullanıcı ID + IP bazında kontrol
    const ip = getClientIp(request)
    const rateLimitKey = `sms:${session.id}:${ip}`
    const rateLimit = await checkRateLimit(rateLimitKey, SMS_RATE_LIMIT)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Çok fazla istek. ${Math.ceil(rateLimit.resetIn / 1000)} saniye sonra tekrar deneyin.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const { phoneNumber, message, templateId, callbackNumber } = body

    // Validasyon
    if (!phoneNumber || (!message && !templateId)) {
      return NextResponse.json(
        { error: 'Telefon numarası ve mesaj şablonu gereklidir' },
        { status: 400 }
      )
    }

    const phoneValidation = validatePhoneNumber(phoneNumber)
    if (phoneValidation.error) {
      return NextResponse.json({ error: phoneValidation.error }, { status: 400 })
    }

    let finalMessage: string

    if (templateId) {
      const callbackValidation = validateCallbackNumber(callbackNumber)
      if (callbackValidation.error) {
        return NextResponse.json({ error: callbackValidation.error }, { status: 400 })
      }

      const template = await prisma.smsTemplate.findFirst({
        where: {
          id: templateId,
          isActive: true,
        },
      })

      if (!template) {
        return NextResponse.json({ error: 'Seçilen mesaj şablonu bulunamadı veya pasif.' }, { status: 404 })
      }

      finalMessage = buildTemplatedSmsMessage(template.message, callbackValidation.formattedNumber!)
    } else {
      if (session.role !== 'admin') {
        return NextResponse.json(
          { error: 'Manuel mesaj gönderimi kapalı. Paylaşılan mesaj şablonlarından birini seçin.' },
          { status: 400 }
        )
      }

      const messageValidation = validateSmsMessage(message)
      if (messageValidation.error) {
        return NextResponse.json({ error: messageValidation.error }, { status: 400 })
      }

      finalMessage = messageValidation.message!
    }

    const { log, quota } = await enqueueSmsWithDailyQuota({
      userId: session.id,
      phoneNumber: phoneValidation.cleanPhone!,
      message: finalMessage,
    })

    void processSmsQueue().catch((error) => {
      console.error('[SMS QUEUE TRIGGER]', error)
    })

    return NextResponse.json(
      {
        success: true,
        queued: true,
        logId: log.id,
        quota,
        message: 'SMS kuyruğa alındı ve arka planda gönderilecek.',
      },
      { status: 202 }
    )
  } catch (error) {
    if (error instanceof DailySmsQuotaExceededError) {
      return NextResponse.json(
        {
          error: 'Gunluk 500 mesaj hakkiniz doldu. Yeni haklar gece 00:00dan sonra yenilenir.',
          quota: error.quota,
        },
        { status: 403 }
      )
    }

    console.error('[SMS SEND]', error)
    return NextResponse.json({ error: 'SMS gönderilemedi, lütfen tekrar deneyin' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const todayStart = getTodayStartUTC()

    const [logs, quota] = await Promise.all([
      prisma.smsLog.findMany({
        where: {
          userId: session.id,
          createdAt: { gte: todayStart },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      getDailySmsQuotaForUser(session.id),
    ])

    return NextResponse.json({ logs, quota })
  } catch (error) {
    console.error('[SMS HISTORY]', error)
    return NextResponse.json({ error: 'Geçmiş alınamadı' }, { status: 500 })
  }
}
