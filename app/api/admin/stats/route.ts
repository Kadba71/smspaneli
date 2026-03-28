import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayStartUTC } from '@/lib/utils'

export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const todayStart = getTodayStartUTC()

    const [
      totalPersonnel,
      todaySuccessCount,
      todayFailedCount,
      todayQueuedCount,
      todayProcessingCount,
      activeUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'user' } }),
      prisma.smsLog.count({ where: { createdAt: { gte: todayStart }, status: 'success' } }),
      prisma.smsLog.count({ where: { createdAt: { gte: todayStart }, status: 'failed' } }),
      prisma.smsLog.count({ where: { createdAt: { gte: todayStart }, status: 'queued' } }),
      prisma.smsLog.count({ where: { createdAt: { gte: todayStart }, status: 'processing' } }),
      prisma.smsLog.findMany({
        where: { createdAt: { gte: todayStart } },
        select: { userId: true },
        distinct: ['userId'],
      }).then((rows) => rows.length),
    ])

    const todaySmsCount = todaySuccessCount + todayFailedCount + todayQueuedCount + todayProcessingCount
    const completedCount = todaySuccessCount + todayFailedCount
    const successRate = completedCount > 0 ? Math.round((todaySuccessCount / completedCount) * 100) : 0

    return NextResponse.json({
      totalPersonnel,
      todaySmsCount,
      todaySuccessCount,
      todayFailedCount,
      todayQueuedCount,
      todayProcessingCount,
      successRate,
      activeUsers,
    })
  } catch (error) {
    console.error('[ADMIN STATS]', error)
    return NextResponse.json({ error: 'İstatistikler alınamadı' }, { status: 500 })
  }
}
