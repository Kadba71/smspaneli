import { redirect } from 'next/navigation'
import { Activity } from 'lucide-react'
import type { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import QueueLiveMonitor from '@/components/queue-live-monitor'

export const metadata: Metadata = { title: 'Canlı Kuyruk' }

export default async function AdminQueuePage() {
  const session = await getSession()

  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/user')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <span className="gradient-text">Canlı SMS Kuyruğu</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Kuyrukta bekleyen, işlenen ve hata alan gönderimleri anlık olarak izleyin.
        </p>
      </div>

      <QueueLiveMonitor />
    </div>
  )
}