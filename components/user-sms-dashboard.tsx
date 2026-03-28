'use client'

import { useState } from 'react'
import { HistoryTable } from '@/components/history-table'
import { TemplateSmsForm } from '@/components/template-sms-form'
import { Badge } from '@/components/ui/badge'
import type { DailySmsQuota, SmsLog, SmsTemplate } from '@/types'

interface UserSmsDashboardProps {
  sessionName: string
  templates: SmsTemplate[]
  logs: SmsLog[]
  initialQuota: DailySmsQuota
}

function getQuotaVariant(quota: DailySmsQuota): 'success' | 'warning' | 'destructive' {
  if (quota.exhausted) {
    return 'destructive'
  }

  if (quota.remaining <= 50) {
    return 'warning'
  }

  return 'success'
}

export function UserSmsDashboard({ sessionName, templates, logs, initialQuota }: UserSmsDashboardProps) {
  const [quota, setQuota] = useState(initialQuota)

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Merhaba, <span className="gradient-text">{sessionName}</span> 👋
          </h1>
          <p className="text-muted-foreground mt-1">SMS gönderimi paneline hoş geldiniz.</p>
        </div>

        <div className="self-start rounded-2xl border border-border bg-card/80 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Gunluk Hak
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-bold tabular-nums">{quota.remaining}</span>
                <span className="pb-1 text-sm text-muted-foreground">/ {quota.limit}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Bugun {quota.used} mesaj kullanildi. Haklar 00:00da yenilenir.
              </p>
            </div>
            <Badge variant={getQuotaVariant(quota)} className="whitespace-nowrap">
              {quota.exhausted ? 'Hak doldu' : 'Kalan hak'}
            </Badge>
          </div>
        </div>
      </div>

      <TemplateSmsForm templates={templates} quota={quota} onQuotaChange={setQuota} />

      <HistoryTable initialLogs={logs} showExportButton onQuotaChange={setQuota} />
    </div>
  )
}