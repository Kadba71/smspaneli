import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        role={session.role}
        userName={session.name}
        userEmail={session.email}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8 min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
