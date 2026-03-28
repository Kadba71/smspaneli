'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Shield, ShieldCheck, ShieldAlert, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

interface ProxyEntry {
  id: string
  userId: string
  userName: string
  userEmail: string
  host: string
  port: number
  protocol: string
  assignedAt: string
  expiresAt: string
  lastError: string | null
  hasCredentials: boolean
}

interface ProxySummary {
  totalUsers: number
  assignedCount: number
  expiredCount: number
  unassignedCount: number
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isExpired(dateStr: string) {
  return new Date(dateStr) < new Date()
}

export function ProxyClient() {
  const [proxies, setProxies] = useState<ProxyEntry[]>([])
  const [summary, setSummary] = useState<ProxySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchProxies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/proxy')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Proxy bilgileri alınamadı')
      }

      setProxies(data.proxies)
      setSummary(data.summary)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Proxy bilgileri alınamadı')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProxies()
  }, [fetchProxies])

  async function handleRefreshAll() {
    setRefreshing(true)

    try {
      const res = await fetch('/api/admin/proxy', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Proxy yenileme başarısız')
      }

      toast.success(data.message)
      await fetchProxies()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Proxy yenileme başarısız')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Özet Kartları */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proxy Atanmış</CardTitle>
              <ShieldCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.assignedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Süresi Dolmuş</CardTitle>
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.expiredCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atanmamış</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.unassignedCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kontrol Paneli */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Proxy Listesi</CardTitle>
              <CardDescription>Kullanıcılara atanmış proxy bilgileri. Her gece 00:00&apos;da otomatik yenilenir.</CardDescription>
            </div>
            <Button onClick={handleRefreshAll} disabled={refreshing} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Yenileniyor...' : 'Tümünü Yenile'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {proxies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Henüz proxy atanmamış.</p>
              <p className="text-sm mt-1">Otomatik atama gece 00:00&apos;da yapılacak veya &quot;Tümünü Yenile&quot; butonuna tıklayın.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Proxy</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Atanma</TableHead>
                    <TableHead>Bitiş</TableHead>
                    <TableHead>Hata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proxies.map((proxy) => (
                    <TableRow key={proxy.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{proxy.userName}</div>
                          <div className="text-sm text-muted-foreground">{proxy.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {proxy.protocol}://{proxy.host}:{proxy.port}
                        </code>
                        {proxy.hasCredentials && (
                          <Badge variant="outline" className="ml-2 text-xs">Auth</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isExpired(proxy.expiresAt) ? (
                          <Badge variant="destructive">Süresi Dolmuş</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(proxy.assignedAt)}</TableCell>
                      <TableCell className="text-sm">{formatDate(proxy.expiresAt)}</TableCell>
                      <TableCell>
                        {proxy.lastError ? (
                          <span className="text-xs text-red-500" title={proxy.lastError}>
                            {proxy.lastError.slice(0, 50)}{proxy.lastError.length > 50 ? '...' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
