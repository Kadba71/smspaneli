'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  UserPlus,
  Trash2,
  KeyRound,
  Shield,
  User,
  Loader2,
  Search,
  MoreHorizontal,
  Mail,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatTurkeyTime } from '@/lib/utils'

interface UserData {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  proxy: {
    host: string
    port: number
    protocol: string
    assignedAt: string
    expiresAt: string
    lastError: string | null
  } | null
  _count: { smsLogs: number }
}

interface UsersClientProps {
  initialUsers: UserData[]
}

export function UsersClient({ initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState<UserData[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  // Add user dialog
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')

  // Change password dialog
  const [passOpen, setPassOpen] = useState(false)
  const [targetUser, setTargetUser] = useState<UserData | null>(null)
  const [newPass, setNewPass] = useState('')

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null)

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function refreshUsers() {
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users)
    }
  }

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshUsers()
    }, 60 * 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  function getProxyState(user: UserData) {
    if (user.role === 'admin') {
      return 'admin'
    }

    if (!user.proxy) {
      return 'missing'
    }

    if (new Date(user.proxy.expiresAt) <= new Date()) {
      return 'expired'
    }

    if (user.proxy.lastError) {
      return 'error'
    }

    return 'active'
  }

  function renderProxyInfo(user: UserData) {
    const proxyState = getProxyState(user)

    if (proxyState === 'admin') {
      return <span className="text-xs text-muted-foreground">Admin hesabı</span>
    }

    if (!user.proxy) {
      return (
        <div className="space-y-1">
          <Badge variant="outline" className="text-xs border-yellow-500/40 text-yellow-500">
            <ShieldOff className="w-3 h-3 mr-1" />
            Proxy yok
          </Badge>
          <p className="text-xs text-muted-foreground">Atama bekleniyor</p>
        </div>
      )
    }

    const isExpired = proxyState === 'expired'
    const hasError = proxyState === 'error'

    return (
      <div className="space-y-1 min-w-[220px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs rounded bg-secondary/70 px-2 py-1">
            {user.proxy.protocol}://{user.proxy.host}:{user.proxy.port}
          </span>
          {isExpired ? (
            <Badge variant="destructive" className="text-xs">
              <ShieldAlert className="w-3 h-3 mr-1" />
              Süresi doldu
            </Badge>
          ) : hasError ? (
            <Badge variant="outline" className="text-xs border-yellow-500/40 text-yellow-500">
              <ShieldAlert className="w-3 h-3 mr-1" />
              Hata var
            </Badge>
          ) : (
            <Badge className="text-xs bg-green-600 hover:bg-green-600">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Aktif
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Atanma: {formatTurkeyTime(user.proxy.assignedAt, 'dd.MM.yyyy HH:mm')}
        </p>
        <p className="text-xs text-muted-foreground">
          Bitiş: {formatTurkeyTime(user.proxy.expiresAt, 'dd.MM.yyyy HH:mm')}
        </p>
        {user.proxy.lastError && (
          <p className="text-xs text-red-400" title={user.proxy.lastError}>
            {user.proxy.lastError.slice(0, 56)}{user.proxy.lastError.length > 56 ? '...' : ''}
          </p>
        )}
      </div>
    )
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, name: newName, password: newPassword, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success(`${newName} başarıyla eklendi`)
      setAddOpen(false)
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('user')
      await refreshUsers()
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success(`${deleteTarget.name} silindi`)
      setDeleteOpen(false)
      setDeleteTarget(null)
      await refreshUsers()
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!targetUser) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPass }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success('Şifre güncellendi')
      setPassOpen(false)
      setNewPass('')
      setTargetUser(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Arama + Ekle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="İsim veya email ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddOpen(true)} variant="gradient" className="gap-2 shrink-0">
          <UserPlus className="h-4 w-4" />
          Yeni Kullanıcı
        </Button>
      </div>

      {/* Kullanıcı tablosu */}
      <div className="glass rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="hidden md:table-cell">Toplam SMS</TableHead>
              <TableHead className="hidden lg:table-cell">Katılım</TableHead>
              <TableHead className="hidden xl:table-cell">Atanan Proxy</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {filtered.map((user) => {
                const initials = user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? (
                          <><Shield className="w-3 h-3 mr-1" />Admin</>
                        ) : (
                          <><User className="w-3 h-3 mr-1" />Personel</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums text-sm">
                      {user._count.smsLogs}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {formatTurkeyTime(user.createdAt, 'dd.MM.yyyy')}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell align-top">
                      {renderProxyInfo(user)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setTargetUser(user)
                              setPassOpen(true)
                            }}
                          >
                            <KeyRound className="h-4 w-4 mr-2" />
                            Şifre Değiştir
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setDeleteTarget(user)
                              setDeleteOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Kullanıcıyı Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Kullanıcı bulunamadı</p>
          </div>
        )}
      </div>

      {/* Yeni Kullanıcı Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
            <DialogDescription>Panele yeni bir kullanıcı ekleyin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input
                placeholder="Ahmet Yılmaz"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="ahmet@sirket.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Şifre</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'user' | 'admin')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Personel</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                İptal
              </Button>
              <Button type="submit" variant="gradient" loading={loading}>
                Kullanıcı Ekle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Şifre Değiştir Dialog */}
      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifre Değiştir</DialogTitle>
            <DialogDescription>
              <strong>{targetUser?.name}</strong> için yeni şifre belirleyin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Yeni Şifre</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPassOpen(false)}>
                İptal
              </Button>
              <Button type="submit" variant="gradient" loading={loading}>
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcıyı Sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> adlı kullanıcıyı silmek istediğinizden emin
              misiniz? Bu işlem geri alınamaz ve tüm SMS kayıtları da silinir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              loading={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
