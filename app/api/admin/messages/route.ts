import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayRange } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const range = searchParams.get('range') === 'today' ? 'today' : 'all'
    const { start, end } = getTodayRange()

    const where: Record<string, unknown> = {
    }

    if (range === 'today') {
      where.createdAt = { gte: start, lt: end }
    }

    if (userId) {
      where.userId = userId
    }

    const messages = await prisma.smsLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('[ADMIN MESSAGES]', error)
    return NextResponse.json({ error: 'Mesajlar alınamadı' }, { status: 500 })
  }
}
