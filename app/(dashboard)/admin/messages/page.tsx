import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MessagesClient } from '@/components/messages-client'
import { MessageSquare } from 'lucide-react'
import type { Metadata } from 'next'
import type { SmsLog } from '@/types'

export const metadata: Metadata = { title: 'Tüm Gönderimler' }

export default async function AdminMessagesPage() {
  const session = await getSession()

  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/user')

  const rawMessages = await prisma.smsLog.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const messages = rawMessages.map((m: (typeof rawMessages)[0]) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <span className="gradient-text">Tüm Gönderimler</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {messages.length} kayıt · Tüm SMS gönderim geçmişi
        </p>
      </div>

      <MessagesClient messages={messages as unknown as (SmsLog & { user: { id: string; name: string; email: string } })[]} />
    </div>
  )
}
