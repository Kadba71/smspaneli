'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'
import {
  Download,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface UserSummary {
  userId: string
  name: string
  email: string
  total: number
  success: number
  failed: number
  queued: number
  processing: number
}

interface ReportData {
  totalCount: number
  successCount: number
  failedCount: number
  queuedCount: number
  processingCount: number
  successRate: number
  userSummary: UserSummary[]
}

export default function ReportsClient() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reports')
      if (!res.ok) throw new Error('Veri alınamadı')
      const json = await res.json()
      setData(json)
    } catch {
      toast.error('Rapor verileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExcelDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/admin/reports?format=xlsx')
      if (!res.ok) throw new Error('Excel oluşturulamadı')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      a.href = url
      a.download = `admin-raporu-${dateStr}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Excel raporu indirildi')
    } catch {
      toast.error('Excel indirilemedi')
    } finally {
      setDownloading(false)
    }
  }

  const statCards = data
    ? [
        {
          title: 'Toplam Gönderim',
          value: data.totalCount,
          icon: TrendingUp,
          color: 'text-primary',
          bg: 'bg-primary/10',
        },
        {
          title: 'Başarılı',
          value: data.successCount,
          icon: CheckCircle2,
          color: 'text-green-400',
          bg: 'bg-green-400/10',
        },
        {
          title: 'Başarısız',
          value: data.failedCount,
          icon: XCircle,
          color: 'text-red-400',
          bg: 'bg-red-400/10',
        },
        {
          title: 'Başarı Oranı',
          value: `%${data.successRate}`,
          icon: Users,
          color: 'text-yellow-400',
          bg: 'bg-yellow-400/10',
        },
        {
          title: 'Kuyrukta / İşleniyor',
          value: `${data.queuedCount} / ${data.processingCount}`,
          icon: RefreshCw,
          color: 'text-primary',
          bg: 'bg-primary/10',
        },
      ]
    : []

  const chartData = data?.userSummary.map((u) => ({
    name: u.name.split(' ')[0],
    Başarılı: u.success,
    Başarısız: u.failed,
  }))

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {loading
        ? Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="glass animate-pulse">
                    <CardContent className="pt-6 pb-4 h-28" />
                  </Card>
                </motion.div>
              ))
            : statCards.map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="glass">
                    <CardContent className="pt-6 pb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                          <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{card.title}</p>
                          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
      </div>

      {/* Chart */}
      {!loading && chartData && chartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base">Personel Başarı Grafiği</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: 12,
                    }}
                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  />
                  <Bar dataKey="Başarılı" fill="hsl(142.1 76.2% 36.3%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Başarısız" fill="hsl(0 84.2% 60.2%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* User Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">Personel Detayları</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Yenile
                </Button>
                <Button
                  size="sm"
                  onClick={handleExcelDownload}
                  disabled={downloading || loading}
                  className="gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloading ? 'İndiriliyor…' : 'Excel İndir'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Yükleniyor…
              </div>
            ) : !data || data.userSummary.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Bugün henüz gönderim yapılmadı
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personel</TableHead>
                    <TableHead className="text-center">Toplam</TableHead>
                    <TableHead className="text-center">Başarılı</TableHead>
                    <TableHead className="text-center">Başarısız</TableHead>
                    <TableHead className="text-center hidden xl:table-cell">Kuyruk</TableHead>
                    <TableHead className="text-center">Oran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {data.userSummary.map((u) => {
                      const completed = u.success + u.failed
                      const rate =
                        completed > 0 ? Math.round((u.success / completed) * 100) : 0
                      return (
                        <TableRow key={u.userId}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{u.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10">
                              {u.success}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-red-400 border-red-400/30 bg-red-400/10">
                              {u.failed}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center hidden xl:table-cell">
                            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                              {u.queued + u.processing}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`text-sm font-semibold ${
                                rate >= 80
                                  ? 'text-green-400'
                                  : rate >= 50
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}
                            >
                              %{rate}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
