import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { refreshAllUserProxies } from '@/lib/proxy'

interface ProxyWithUser {
  id: string
  userId: string
  host: string
  port: number
  username: string | null
  password: string | null
  protocol: string
  assignedAt: Date
  expiresAt: Date
  lastError: string | null
  user: { id: string; name: string; email: string }
}

export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proxies: ProxyWithUser[] = await (prisma as any).userProxy.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    })

    const userCount = await prisma.user.count()
    const assignedCount = proxies.length
    const expiredCount = proxies.filter((p) => p.expiresAt < new Date()).length

    return NextResponse.json({
      proxies: proxies.map((p) => ({
        id: p.id,
        userId: p.userId,
        userName: p.user.name,
        userEmail: p.user.email,
        host: p.host,
        port: p.port,
        protocol: p.protocol,
        assignedAt: p.assignedAt.toISOString(),
        expiresAt: p.expiresAt.toISOString(),
        lastError: p.lastError,
        hasCredentials: !!(p.username && p.password),
      })),
      summary: {
        totalUsers: userCount,
        assignedCount,
        expiredCount,
        unassignedCount: userCount - assignedCount,
      },
    })
  } catch (error) {
    console.error('[ADMIN PROXY GET]', error)
    return NextResponse.json({ error: 'Proxy bilgileri alınamadı' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    console.log(`[ADMIN PROXY] Manuel proxy yenileme tetiklendi. Admin: ${session.email}`)
    const result = await refreshAllUserProxies()

    return NextResponse.json({
      message: `Proxy yenileme tamamlandı: ${result.success} başarılı, ${result.failed} başarısız`,
      ...result,
    })
  } catch (error) {
    console.error('[ADMIN PROXY POST]', error)
    return NextResponse.json({ error: 'Proxy yenileme başarısız' }, { status: 500 })
  }
}
