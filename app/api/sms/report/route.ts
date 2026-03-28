import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { getSession } from '@/lib/auth'
import { buildWorkbookBuffer, createExcelHeaders } from '@/lib/excel'
import { prisma } from '@/lib/prisma'
import { getTodayStartUTC } from '@/lib/utils'
import { getSmsStatusLabel, parseSmsStatus } from '@/lib/validation'

const TURKEY_TZ = 'Europe/Istanbul'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const todayStart = getTodayStartUTC()
    const logs = await prisma.smsLog.findMany({
      where: {
        userId: session.id,
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        phoneNumber: true,
        status: true,
      },
    })

    const rows = logs.map((log) => ({
      Numara: log.phoneNumber,
      Durum: getSmsStatusLabel(parseSmsStatus(log.status)),
    }))

    const fileDate = format(toZonedTime(new Date(), TURKEY_TZ), 'yyyy-MM-dd')
    const buffer = buildWorkbookBuffer('KullaniciRaporu', rows)

    return new NextResponse(buffer, {
      headers: createExcelHeaders(`kullanici-raporu-${fileDate}.xlsx`),
    })
  } catch (error) {
    console.error('[SMS REPORT]', error)
    return NextResponse.json({ error: 'Rapor oluşturulamadı' }, { status: 500 })
  }
}