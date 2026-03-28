import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { BarChart2 } from 'lucide-react'
import ReportsClient from '@/components/reports-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Raporlar' }

export default async function AdminReportsPage() {
  const session = await getSession()

  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/user')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <span className="gradient-text">Günlük Rapor</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Tüm SMS gönderim istatistikleri ve personel detayları
        </p>
      </div>

      <ReportsClient />
    </div>
  )
}
