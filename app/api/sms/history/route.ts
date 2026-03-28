import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayStartUTC } from '@/lib/utils'
import { getDailySmsQuotaForUser } from '@/lib/sms-quota'

export async function GET() {
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
        take: 200,
      }),
      getDailySmsQuotaForUser(session.id),
    ])

    return NextResponse.json({ logs, quota })
  } catch (error) {
    console.error('[SMS HISTORY]', error)
    return NextResponse.json({ error: 'Geçmiş alınamadı' }, { status: 500 })
  }
}
