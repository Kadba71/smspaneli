import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayStartUTC } from '@/lib/utils'
import { UserSmsDashboard } from '@/components/user-sms-dashboard'
import { parseSmsStatus } from '@/lib/validation'
import { getDailySmsQuotaForUser } from '@/lib/sms-quota'
import type { Metadata } from 'next'
import type { SmsLog, SmsTemplate } from '@/types'

export const metadata: Metadata = { title: 'SMS Gönder' }

export default async function UserPage() {
  const session = await getSession()

  if (!session) redirect('/login')
  if (session.role === 'admin') redirect('/admin')

  const todayStart = getTodayStartUTC()

  const [rawLogs, rawTemplates, quota] = await Promise.all([
    prisma.smsLog.findMany({
      where: {
        userId: session.id,
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.smsTemplate.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    getDailySmsQuotaForUser(session.id),
  ])

  // Serialize dates
  const logs: SmsLog[] = rawLogs.map((l: (typeof rawLogs)[0]) => ({
    ...l,
    status: parseSmsStatus(l.status),
    createdAt: l.createdAt.toISOString(),
  }))

  const templates: SmsTemplate[] = rawTemplates.map((template: (typeof rawTemplates)[0]) => ({
    ...template,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }))

  return <UserSmsDashboard sessionName={session.name} templates={templates} logs={logs} initialQuota={quota} />
}
