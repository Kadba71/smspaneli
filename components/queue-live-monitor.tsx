'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { toast } from 'sonner'

interface QueueLogItem {
  id: string
  phoneNumber: string
  message: string
  status: 'queued' | 'processing' | 'failed'
  lastError: string | null
  attemptCount: number
  createdAt: string
  updatedAt: string
  processingStartedAt: string | null
  user: {
    id: string
    name: string
    email: string
  }
}

interface QueueSnapshot {
  queuedCount: number
  processingCount: number
  failedCount: number
  successCount: number
  recentItems: QueueLogItem[]
  updatedAt: string
}

export default function QueueLiveMonitor() {
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSnapshot = useCallback(async (showErrorToast = false) => {
    try {
      const response = await fetch('/api/admin/queue', { cache: 'no-store' })

      if (!response.ok) {
        throw new Error('Canlı kuyruk verisi alınamadı')
      }

      const data = (await response.json()) as QueueSnapshot
      setSnapshot(data)
    } catch (error) {
      if (showErrorToast) {
        toast.error(error instanceof Error ? error.message : 'Canlı kuyruk verisi alınamadı')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSnapshot()

    const intervalId = window.setInterval(() => {
      void fetchSnapshot()
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [fetchSnapshot])

  const cards = [
    {
      title: 'Kuyrukta',
      value: snapshot?.queuedCount ?? 0,
      icon: Clock3,
      className: 'text-primary',
    },
    {
      title: 'İşleniyor',
      value: snapshot?.processingCount ?? 0,
      icon: RefreshCw,
      className: 'text-yellow-400',
    },
    {
      title: 'Başarısız',
      value: snapshot?.failedCount ?? 0,
      icon: AlertTriangle,
      className: 'text-red-400',
    },
    {
      title: 'Tamamlanan',
      value: snapshot?.successCount ?? 0,
      icon: CheckCircle2,
      className: 'text-green-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className={`text-3xl font-bold ${card.className}`}>{card.value}</p>
                </div>
                <card.icon className={`w-6 h-6 ${card.className} ${card.title === 'İşleniyor' ? 'animate-spin' : ''}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Son Kuyruk Hareketleri
            </CardTitle>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Son güncelleme: {snapshot ? formatTurkeyTime(snapshot.updatedAt, 'HH:mm:ss') : '--:--:--'}
              </p>
              <Button variant="outline" size="sm" onClick={() => void fetchSnapshot(true)} disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {snapshot && snapshot.recentItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personel</TableHead>
                  <TableHead>Numara</TableHead>
                  <TableHead>Mesaj</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Deneme</TableHead>
                  <TableHead>Güncellendi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.recentItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{item.user.name}</p>
                        <p className="text-xs text-muted-foreground">{item.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">+90 {item.phoneNumber}</TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      <span title={item.message}>{truncateMessage(item.message, 60)}</span>
                      {item.lastError && (
                        <p className="text-xs text-red-400 mt-1">{truncateMessage(item.lastError, 80)}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === 'failed'
                            ? 'destructive'
                            : item.status === 'processing'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {getSmsStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.attemptCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTurkeyTime(item.updatedAt, 'HH:mm:ss')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              Kuyrukta bekleyen veya hata alan kayıt bulunmuyor.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}