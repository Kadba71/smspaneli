'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Activity,
  CheckCircle2,
  MessageSquare,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'

const iconMap = {
  users: Users,
  messageSquare: MessageSquare,
  checkCircle2: CheckCircle2,
  xCircle: XCircle,
  activity: Activity,
  trendingUp: TrendingUp,
  wallet: Wallet,
} as const

type StatsCardIcon = keyof typeof iconMap

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: StatsCardIcon
  action?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  variant?: 'default' | 'success' | 'destructive' | 'primary'
  index?: number
}

const variantStyles = {
  default: {
    iconBg: 'bg-secondary',
    iconColor: 'text-muted-foreground',
    border: 'border-border',
  },
  success: {
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    border: 'border-green-500/20',
  },
  destructive: {
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    border: 'border-red-500/20',
  },
  primary: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    border: 'border-primary/20',
  },
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  action,
  variant = 'default',
  trendValue,
  trend,
  index = 0,
}: StatsCardProps) {
  const styles = variantStyles[variant]
  const Icon = iconMap[icon]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
      className={cn(
        'relative rounded-xl border bg-card p-6 overflow-hidden group',
        'hover:border-primary/30 transition-all duration-300',
        styles.border
      )}
    >
      {/* Arka plan parlaması */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          variant === 'primary' && 'bg-gradient-radial from-primary/5 via-transparent to-transparent',
          variant === 'success' && 'bg-gradient-radial from-green-500/5 via-transparent to-transparent',
          variant === 'destructive' && 'bg-gradient-radial from-red-500/5 via-transparent to-transparent'
        )}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {action ? <div className="flex-shrink-0">{action}</div> : null}
          </div>
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 + 0.2, duration: 0.3 }}
            className="text-3xl font-bold text-foreground tabular-nums"
          >
            {value}
          </motion.p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
          )}
          {trendValue && (
            <p
              className={cn(
                'text-xs font-medium mt-2',
                trend === 'up' && 'text-green-400',
                trend === 'down' && 'text-red-400',
                trend === 'neutral' && 'text-muted-foreground'
              )}
            >
              {trendValue}
            </p>
          )}
        </div>

        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
            styles.iconBg
          )}
        >
          <Icon className={cn('w-6 h-6', styles.iconColor)} />
        </div>
      </div>
    </motion.div>
  )
}
