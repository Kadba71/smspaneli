import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const [queuedCount, processingCount, failedCount, successCount, recentItems] = await Promise.all([
      prisma.smsLog.count({ where: { status: 'queued' } }),
      prisma.smsLog.count({ where: { status: 'processing' } }),
      prisma.smsLog.count({ where: { status: 'failed' } }),
      prisma.smsLog.count({ where: { status: 'success' } }),
      prisma.smsLog.findMany({
        where: {
          status: {
            in: ['queued', 'processing', 'failed'],
          },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 25,
      }),
    ])

    return NextResponse.json({
      queuedCount,
      processingCount,
      failedCount,
      successCount,
      recentItems: recentItems.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        processingStartedAt: item.processingStartedAt?.toISOString() ?? null,
      })),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[ADMIN QUEUE]', error)
    return NextResponse.json({ error: 'Canlı kuyruk verisi alınamadı' }, { status: 500 })
  }
}