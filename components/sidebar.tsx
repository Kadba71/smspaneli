'use client'

import { usePathname, useRouter } from 'next/navigation'
import { startTransition, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  MessageSquare,
  Users,
  BarChart3,
  Send,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Activity,
  Menu,
  X,
  Shield,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/queue', label: 'Canlı Kuyruk', icon: Activity },
  { href: '/admin/users', label: 'Kullanıcılar', icon: Users },
  { href: '/admin/messages', label: 'Tüm Gönderimler', icon: MessageSquare },
  { href: '/admin/reports', label: 'Raporlar', icon: BarChart3 },
  { href: '/admin/proxy', label: 'Proxy Yönetimi', icon: Shield },
]

const userNavItems: NavItem[] = [
  { href: '/user', label: 'SMS Gönder', icon: Send },
]

interface SidebarProps {
  role: 'admin' | 'user'
  userName: string
  userEmail: string
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const [isNavigating, startNavigationTransition] = useTransition()

  const navItems = role === 'admin' ? adminNavItems : userNavItems

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Çıkış yapıldı')
      router.replace('/login')
    } catch {
      toast.error('Çıkış yapılırken hata oluştu')
    } finally {
      setLoggingOut(false)
    }
  }

  function navigateTo(href: string) {
    if (pathname === href) {
      setMobileOpen(false)
      return
    }

    setPendingPath(href)
    setMobileOpen(false)

    startNavigationTransition(() => {
      router.push(href)
    })
  }

  function warmRoute(href: string) {
    startTransition(() => {
      router.prefetch(href)
    })
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 p-4', collapsed && 'justify-center px-3')}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-base gradient-text">SMS Panel</span>
          </div>
        )}
      </div>

      <Separator className="mb-2" />

      {/* Navigasyon */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/admin' || item.href === '/user'
              ? pathname === item.href
              : pathname.startsWith(item.href)
          const isPendingItem = isNavigating && pendingPath === item.href

          return (
            <button
              key={item.href}
              type="button"
              onClick={() => navigateTo(item.href)}
              onMouseEnter={() => warmRoute(item.href)}
              onFocus={() => warmRoute(item.href)}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                isPendingItem && 'bg-secondary text-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavItem"
                  className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/20"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  'relative z-10 flex-shrink-0 transition-all',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                  collapsed ? 'w-5 h-5' : 'w-4 h-4'
                )}
              />
              {!collapsed && (
                <span className="relative z-10 truncate">{item.label}</span>
              )}
              {isPendingItem && !collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative z-10 ml-auto"
                >
                  <ArrowRight className="h-4 w-4 animate-pulse text-primary" />
                </motion.div>
              )}
              {isActive && !isPendingItem && !collapsed && (
                <div className="relative z-10 ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Alt bölüm */}
      <div className="mt-auto">
        <Separator className="mb-3" />

        <div className={cn('px-2 pb-3 space-y-2')}>
          {/* Kullanıcı bilgisi */}
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg',
              collapsed && 'justify-center px-2'
            )}
          >
            <Avatar className={cn(collapsed ? 'w-8 h-8' : 'w-8 h-8 flex-shrink-0')}>
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            )}
          </div>

          {/* Çıkış butonu */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              collapsed && 'justify-center px-2'
            )}
          >
            <LogOut className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
            {!collapsed && <span>Çıkış Yap</span>}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col relative h-screen border-r border-border bg-card/50 overflow-hidden flex-shrink-0"
      >
        <SidebarContent />

        {/* Collapse butonu */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition-colors z-10"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </motion.aside>

      {/* Mobile Hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 z-50 bg-card border-r border-border"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-4 top-4 w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
