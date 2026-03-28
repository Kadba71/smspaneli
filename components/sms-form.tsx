'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Send, Phone, MessageSquare, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatPhoneNumber } from '@/lib/utils'

const MAX_MESSAGE_LENGTH = 640
const SMS_UNIT_LENGTH = 160

interface SmsFormProps {
  onSmsSent?: () => void
}

function getSmsUnits(length: number): string {
  if (length === 0) return '0 karakter'
  const units = Math.ceil(length / SMS_UNIT_LENGTH)
  return `${length} karakter · ${units} SMS`
}

export function SmsForm({ onSmsSent }: SmsFormProps) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<'success' | 'failed' | null>(null)

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhone(formatted)
  }, [])

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
      setMessage(e.target.value)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const cleanPhone = phone.replace(/\s/g, '')

    if (cleanPhone.length !== 10) {
      toast.error('Lütfen geçerli bir telefon numarası girin (5xx xxx xx xx)')
      return
    }

    if (!message.trim()) {
      toast.error('Mesaj boş olamaz')
      return
    }

    setLoading(true)
    setLastResult(null)

    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleanPhone, message: message.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'SMS gönderilemedi')
        setLastResult('failed')
        return
      }

      if (data.success) {
        toast.success(data.message || 'SMS kuyruğa alındı')
        setLastResult('success')
        setPhone('')
        setMessage('')
        router.refresh()
        onSmsSent?.()
      } else {
        toast.error('SMS gönderilemedi ❌')
        setLastResult('failed')
        onSmsSent?.()
      }
    } catch {
      toast.error('Bağlantı hatası. Sunucu kontrol edin.')
      setLastResult('failed')
    } finally {
      setLoading(false)
    }
  }

  const characterPercent = Math.min((message.length / MAX_MESSAGE_LENGTH) * 100, 100)
  const isAlmostFull = message.length > MAX_MESSAGE_LENGTH * 0.8

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="glass-strong rounded-2xl p-8 relative overflow-hidden">
        {/* Arka plan dekor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        {/* Başlık */}
        <div className="relative flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">SMS Gönder</h2>
            <p className="text-sm text-muted-foreground">Tek mesaj gönderimi</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-6">
          {/* Telefon Numarası */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Telefon Numarası
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground border-r border-border pr-2">+90</span>
              </div>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="5xx xxx xx xx"
                value={phone}
                onChange={handlePhoneChange}
                className="pl-20 text-base tracking-wider font-mono"
                maxLength={13}
                required
              />
            </div>
          </div>

          {/* Mesaj */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message" className="text-sm font-medium">
                Mesaj İçeriği
              </Label>
              <span
                className={`text-xs transition-colors ${
                  isAlmostFull ? 'text-yellow-400' : 'text-muted-foreground'
                }`}
              >
                {getSmsUnits(message.length)}
              </span>
            </div>
            <div className="relative">
              <Textarea
                id="message"
                placeholder="Mesajınızı buraya yazın..."
                value={message}
                onChange={handleMessageChange}
                className="min-h-[140px] text-sm leading-relaxed"
                required
              />
            </div>
            {/* Karakter çubuğu */}
            <div className="w-full bg-secondary rounded-full h-1 overflow-hidden">
              <motion.div
                className={`h-full rounded-full transition-colors ${
                  isAlmostFull ? 'bg-yellow-400' : 'bg-primary'
                }`}
                animate={{ width: `${characterPercent}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>

          {/* Gönder Butonu */}
          <Button
            type="submit"
            size="xl"
            variant="gradient"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Gönder
              </>
            )}
          </Button>
        </form>

        {/* Sonuç gösterimi */}
        <AnimatePresence>
          {lastResult && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border ${
                lastResult === 'success'
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {lastResult === 'success' ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">
                {lastResult === 'success'
                  ? 'SMS başarıyla iletildi'
                  : 'SMS iletilemedi, lütfen tekrar deneyin'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
