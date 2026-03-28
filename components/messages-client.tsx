'use client'

import { useState } from 'react'
import { Search, CheckCircle2, XCircle, Filter, Clock, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatTurkeyTime, truncateMessage } from '@/lib/utils'
import { getSmsStatusLabel } from '@/lib/validation'
import type { SmsLog } from '@/types'

interface MessagesClientProps {
  messages: (SmsLog & { user: { id: string; name: string; email: string } })[]
}

export function MessagesClient({ messages }: MessagesClientProps) {
  const [search, setSearch] = useState('')
  const [filterUser, setFilterUser] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Benzersiz kullanıcı listesi
  const uniqueUsers = Array.from(
    new Map(messages.map((m) => [m.user.id, m.user])).values()
  )

  const filtered = messages.filter((m) => {
    const matchSearch =
      m.phoneNumber.includes(search) ||
      m.message.toLowerCase().includes(search.toLowerCase()) ||
      m.user.name.toLowerCase().includes(search.toLowerCase())
    const matchUser = filterUser === 'all' || m.userId === filterUser
    const matchStatus = filterStatus === 'all' || m.status === filterStatus
    return matchSearch && matchUser && matchStatus
  })

  function formatPhone(phone: string): string {
    const p = phone.replace(/\D/g, '')
    if (p.length !== 10) return phone
    return `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 8)} ${p.slice(8)}`
  }

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Numara, mesaj veya personel ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Personel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Personel</SelectItem>
              {uniqueUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durum</SelectItem>
              <SelectItem value="queued">Kuyrukta</SelectItem>
              <SelectItem value="processing">İşleniyor</SelectItem>
              <SelectItem value="success">İletildi</SelectItem>
              <SelectItem value="failed">Başarısız</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tablo */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{filtered.length} kayıt</span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personel</TableHead>
                <TableHead>Numara</TableHead>
                <TableHead className="min-w-[200px] hidden md:table-cell">Mesaj</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Saat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {filtered.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{msg.user.name}</p>
                        <p className="text-xs text-muted-foreground">{msg.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      +90 {formatPhone(msg.phoneNumber)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      <span title={msg.message}>{truncateMessage(msg.message, 40)}</span>
                    </TableCell>
                    <TableCell>
                      {msg.status === 'success' && (
                        <Badge variant="success" className="gap-1.5">
                          <CheckCircle2 className="w-3 h-3" />
                          {getSmsStatusLabel(msg.status)}
                        </Badge>
                      )}
                      {msg.status === 'failed' && (
                        <Badge variant="destructive" className="gap-1.5">
                          <XCircle className="w-3 h-3" />
                          {getSmsStatusLabel(msg.status)}
                        </Badge>
                      )}
                      {msg.status === 'queued' && (
                        <Badge variant="secondary" className="gap-1.5">
                          <Clock className="w-3 h-3" />
                          {getSmsStatusLabel(msg.status)}
                        </Badge>
                      )}
                      {msg.status === 'processing' && (
                        <Badge variant="outline" className="gap-1.5">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          {getSmsStatusLabel(msg.status)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                      {formatTurkeyTime(msg.createdAt, 'HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Kayıt bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  )
}
