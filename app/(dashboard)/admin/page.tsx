import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayStartUTC } from '@/lib/utils'
import { StatsCard } from '@/components/stats-card'
import { AdminTemplatesManager } from '@/components/admin-templates-manager'
import { AdminBalanceRefreshButton } from '@/components/admin-balance-refresh-button'
import { Activity } from 'lucide-react'
import type { Metadata } from 'next'
import type { SmsTemplate } from '@/types'
import { extractSmsBalanceFromApiResponse } from '@/lib/sms'
import { parseSmsStatus } from '@/lib/validation'

export const metadata: Metadata = { title: 'Admin Dashboard' }

export default async function AdminPage() {
  const session = await getSession()

  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/user')

  const todayStart = getTodayStartUTC()

  const [
    totalPersonnel,
    todaySuccessCount,
    todayFailedCount,
    todayQueuedCount,
    todayProcessingCount,
    activeUsers,
    rawTemplates,
    latestSuccessfulLog,
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
    prisma.smsTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
    prisma.smsLog.findFirst({
      where: {
        status: 'success',
        apiResponse: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { apiResponse: true },
    }),
  ])

  const todaySmsCount = todaySuccessCount + todayFailedCount + todayQueuedCount + todayProcessingCount
  const completedCount = todaySuccessCount + todayFailedCount
  const successRate = completedCount > 0 ? Math.round((todaySuccessCount / completedCount) * 100) : 0
  const lastKnownBalance = extractSmsBalanceFromApiResponse(latestSuccessfulLog?.apiResponse) ?? 'Bilinmiyor'
  const templates: SmsTemplate[] = rawTemplates.map((template: (typeof rawTemplates)[0]) => ({
    ...template,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-8">
      {/* Sayfa başlığı */}
      <div>
        <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bugünkü SMS istatistikleri ve panel özeti
        </p>
      </div>

      {/* İstatistik kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatsCard
          title="Toplam Personel"
          value={totalPersonnel}
          description="Kayıtlı kullanıcı sayısı"
          icon="users"
          variant="primary"
          index={0}
        />
        <StatsCard
          title="Bugün Gönderilen SMS"
          value={todaySmsCount}
          description="Toplam gönderim denemesi"
          icon="messageSquare"
          variant="default"
          index={1}
        />
        <StatsCard
          title="Başarıyla İletildi"
          value={todaySuccessCount}
          description={completedCount > 0 ? `%${successRate} başarı oranı` : 'Tamamlanan gönderim yok'}
          icon="checkCircle2"
          variant="success"
          trendValue={completedCount > 0 ? `%${successRate} başarı` : undefined}
          trend="up"
          index={2}
        />
        <StatsCard
          title="Başarısız Gönderim"
          value={todayFailedCount}
          description="İletilemeyen mesaj sayısı"
          icon="xCircle"
          variant={todayFailedCount > 0 ? 'destructive' : 'default'}
          index={3}
        />
        <StatsCard
          title="Kuyrukta / İşleniyor"
          value={`${todayQueuedCount} / ${todayProcessingCount}`}
          description="Arka planda gönderilmeyi bekleyen SMS'ler"
          icon="activity"
          variant={todayQueuedCount + todayProcessingCount > 0 ? 'primary' : 'default'}
          index={4}
        />
        <StatsCard
          title="Aktif Personel"
          value={activeUsers}
          description="Bugün SMS gönderen kişi sayısı"
          icon="activity"
          variant="primary"
          index={5}
        />
        <StatsCard
          title="Başarı Oranı"
          value={`%${successRate}`}
          description="Başarılı / Tamamlanan gönderim"
          icon="trendingUp"
          variant={successRate >= 80 ? 'success' : successRate >= 50 ? 'default' : 'destructive'}
          index={6}
        />
        <StatsCard
          title="Kalan SMS Bakiyesi"
          value={`€${lastKnownBalance}`}
          description="MsgRush son bilinen bakiye"
          icon="wallet"
          action={<AdminBalanceRefreshButton />}
          variant="primary"
          index={7}
        />
      </div>

      {/* Hızlı özet */}
      {completedCount > 0 && (
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Bugünkü Özet
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-primary rounded-full transition-all duration-1000"
                style={{ width: `${successRate}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {todaySuccessCount} / {completedCount} tamamlanan gönderim başarılı
            </span>
          </div>
        </div>
      )}

      <AdminTemplatesManager initialTemplates={templates} />
    </div>
  )
}
