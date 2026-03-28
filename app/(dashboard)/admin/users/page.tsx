import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UsersClient } from '@/components/users-client'
import { Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Kullanıcı Yönetimi' }

export default async function AdminUsersPage() {
  const session = await getSession()

  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/user')

  const rawUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      proxy: {
        select: {
          host: true,
          port: true,
          protocol: true,
          assignedAt: true,
          expiresAt: true,
          lastError: true,
        },
      },
      _count: { select: { smsLogs: true } },
    },
  })

  const users = rawUsers.map((u: (typeof rawUsers)[0]) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    proxy: u.proxy
      ? {
          ...u.proxy,
          assignedAt: u.proxy.assignedAt.toISOString(),
          expiresAt: u.proxy.expiresAt.toISOString(),
        }
      : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <span className="gradient-text">Kullanıcılar</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {users.length} kayıtlı kullanıcı · Personel yönetimi
        </p>
      </div>

      <UsersClient initialUsers={users} />
    </div>
  )
}
