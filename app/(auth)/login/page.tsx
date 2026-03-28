'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Eye, EyeOff, MessageSquare, Lock, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !password) {
      toast.error('Lütfen tüm alanları doldurun')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Giriş başarısız')
        return
      }

      toast.success(`Hoş geldiniz, ${data.user.name}!`)

      const target = data.user.role === 'admin' ? '/admin' : '/user'
      window.location.replace(target)
    } catch {
      toast.error('Bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Arka plan efektleri */}
      <div className="absolute inset-0 bg-gradient-glow" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo & Başlık */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary shadow-lg shadow-primary/30 mb-4"
          >
            <MessageSquare className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-3xl font-bold gradient-text"
          >
            SMS Panel
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground mt-2"
          >
            Hesabınıza giriş yapın
          </motion.p>
        </div>

        {/* Login Formu */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="glass-strong rounded-2xl p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Adresi
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@panel.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Şifre */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Şifre
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Giriş Butonu */}
            <Button
              type="submit"
              size="lg"
              variant="gradient"
              className="w-full mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>
          </form>

          {/* Alt bilgi */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-center text-xs text-muted-foreground">
              Erişim için ağ yöneticinizle iletişime geçin
            </p>
          </div>
        </motion.div>

        {/* Telif hakkı */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} SMS Panel. Tüm hakları saklıdır.
        </p>
      </motion.div>
    </div>
  )
}
