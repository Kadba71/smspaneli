import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { buildWorkbookBuffer, createExcelHeaders } from '@/lib/excel'
import { prisma } from '@/lib/prisma'
import { getTodayRange } from '@/lib/utils'
import { getSmsStatusLabel, parseSmsStatus } from '@/lib/validation'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TURKEY_TZ = 'Europe/Istanbul'
type ExportLogItem = {
  phoneNumber: string
  status: string
  user: {
    name: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format_type = searchParams.get('format')
    const range = searchParams.get('range') === 'today' ? 'today' : 'all'
    const { start, end } = getTodayRange()
    const rangeFilter =
      range === 'today'
        ? {
            createdAt: {
              gte: start,
              lt: end,
            },
          }
        : {}

    if (format_type === 'xlsx') {
      const logs = await prisma.smsLog.findMany({
        where: rangeFilter,
        select: {
          phoneNumber: true,
          status: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      const rows = logs.map((log: ExportLogItem) => ({
        Personel: log.user.name,
        Numara: log.phoneNumber,
        Durum: getSmsStatusLabel(parseSmsStatus(log.status)),
      }))

      const today = format(toZonedTime(new Date(), TURKEY_TZ), 'yyyy-MM-dd')
      const buffer = buildWorkbookBuffer('AdminRaporu', rows)

      return new NextResponse(buffer, {
        headers: createExcelHeaders(`admin-raporu-${today}.xlsx`),
      })
    }

    const [totalCount, groupedStatuses, groupedUsers] = await Promise.all([
      prisma.smsLog.count({ where: rangeFilter }),
      prisma.smsLog.groupBy({
        by: ['status'],
        where: rangeFilter,
        _count: {
          _all: true,
        },
      }),
      prisma.smsLog.groupBy({
        by: ['userId', 'status'],
        where: rangeFilter,
        _count: {
          _all: true,
        },
      }),
    ])

    const statusCounts = {
      success: 0,
      failed: 0,
      queued: 0,
      processing: 0,
    }

    for (const item of groupedStatuses) {
      const status = parseSmsStatus(item.status)
      statusCounts[status] = item._count._all
    }

    const successCount = statusCounts.success
    const failedCount = statusCounts.failed
    const queuedCount = statusCounts.queued
    const processingCount = statusCounts.processing
    const completedCount = successCount + failedCount
    const successRate = completedCount > 0 ? Math.round((successCount / completedCount) * 100) : 0

    const userIds = [...new Set(groupedUsers.map((item) => item.userId))]
    const users = userIds.length
      ? await prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : []

    const userMap = new Map(users.map((user) => [user.id, user]))
    const userSummary = userIds.map((userId) => {
      const user = userMap.get(userId)

      return {
        userId,
        name: user?.name ?? 'Silinmiş kullanıcı',
        email: user?.email ?? '-',
        total: 0,
        success: 0,
        failed: 0,
        queued: 0,
        processing: 0,
      }
    })

    const summaryMap = new Map(userSummary.map((item) => [item.userId, item]))

    for (const item of groupedUsers) {
      const summary = summaryMap.get(item.userId)
      if (!summary) {
        continue
      }

      const status = parseSmsStatus(item.status)
      summary[status] = item._count._all
      summary.total += item._count._all
    }

    return NextResponse.json({
      totalCount,
      successCount,
      failedCount,
      queuedCount,
      processingCount,
      successRate,
      userSummary,
      range,
      date: format(toZonedTime(new Date(), TURKEY_TZ), 'dd/MM/yyyy'),
    })
  } catch (error) {
    console.error('[ADMIN REPORTS]', error)
    return NextResponse.json({ error: 'Rapor oluşturulamadı' }, { status: 500 })
  }
}
