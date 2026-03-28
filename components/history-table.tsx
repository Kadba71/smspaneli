'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, CheckCircle2, XCircle, Clock, History, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTurkeyTime, truncateMessage } from '@/lib/utils'
import { getSmsStatusLabel } from '@/lib/validation'
import type { DailySmsQuota, SmsLog } from '@/types'

interface HistoryTableProps {
  initialLogs: SmsLog[]
  showExportButton?: boolean
  onQuotaChange?: (quota: DailySmsQuota) => void
}

export function HistoryTable({
  initialLogs,
  showExportButton = false,
  onQuotaChange,
}: HistoryTableProps) {
  const [logs, setLogs] = useState<SmsLog[]>(initialLogs)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const refreshLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sms/history')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        if (data.quota && onQuotaChange) {
          onQuotaChange(data.quota)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const downloadReport = useCallback(async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/sms/report')
      if (!res.ok) {
        throw new Error('Rapor oluşturulamadı')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      a.href = url
      a.download = `kullanici-raporu-${dateStr}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }, [])

  // Telefon numarası formatla: 5xxxxxxxxx → 5xx xxx xx xx
  function formatPhone(phone: string): string {
    const p = phone.replace(/\D/g, '')
    if (p.length !== 10) return phone
    return `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 8)} ${p.slice(8)}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="w-full"
    >
      <div className="glass rounded-2xl overflow-hidden">
        {/* Tablo başlığı */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-sm">Bugünkü Geçmiş</h3>
              <p className="text-xs text-muted-foreground">
                {logs.length} kayıt · Türkiye saatine göre
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showExportButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadReport}
                disabled={downloading}
                className="gap-2 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                {downloading ? 'İndiriliyor' : 'Excel'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshLogs}
              disabled={loading}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Clock className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Bugün henüz gönderim yok</p>
            <p className="text-xs mt-1 opacity-70">İlk SMS&apos;inizi gönderin</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numara</TableHead>
                  <TableHead className="min-w-[200px]">Mesaj</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">Saat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence initial={false}>
                  {logs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                      className="border-b border-border transition-colors hover:bg-secondary/30"
                    >
                      <TableCell className="font-mono text-sm">
                        +90 {formatPhone(log.phoneNumber)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs">
                        <span title={log.message}>{truncateMessage(log.message, 45)}</span>
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' && (
                          <Badge variant="success" className="gap-1.5">
                            <CheckCircle2 className="w-3 h-3" />
                            {getSmsStatusLabel(log.status)}
                          </Badge>
                        )}
                        {log.status === 'failed' && (
                          <Badge variant="destructive" className="gap-1.5">
                            <XCircle className="w-3 h-3" />
                            {getSmsStatusLabel(log.status)}
                          </Badge>
                        )}
                        {log.status === 'queued' && (
                          <Badge variant="secondary" className="gap-1.5">
                            <Clock className="w-3 h-3" />
                            {getSmsStatusLabel(log.status)}
                          </Badge>
                        )}
                        {log.status === 'processing' && (
                          <Badge variant="outline" className="gap-1.5">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            {getSmsStatusLabel(log.status)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                        {formatTurkeyTime(log.createdAt, 'HH:mm')}
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
