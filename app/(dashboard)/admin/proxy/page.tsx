import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ProxyClient } from '@/components/proxy-client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Proxy Yönetimi' }

export default async function ProxyPage() {
  const session = await getSession()

  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/user')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Proxy Yönetimi</h1>
        <p className="text-muted-foreground mt-1">
          Kullanıcı bazlı proxy atamaları. Her gece 00:00&apos;da Decodo API&apos;den otomatik yenilenir.
        </p>
      </div>

      <ProxyClient />
    </div>
  )
}
