'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, MessageSquare, Phone, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatPhoneNumber } from '@/lib/utils'
import type { DailySmsQuota, SmsTemplate } from '@/types'

interface TemplateSmsFormProps {
  templates: SmsTemplate[]
  quota: DailySmsQuota
  onQuotaChange: (quota: DailySmsQuota) => void
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

export function TemplateSmsForm({ templates, quota, onQuotaChange }: TemplateSmsFormProps) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [callbackNumber, setCallbackNumber] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id ?? '')
  const [loading, setLoading] = useState(false)

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates]
  )

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhoneNumber(e.target.value))
  }

  function handleCallbackNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCallbackNumber(formatPhoneNumber(e.target.value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const cleanPhone = phone.replace(/\s/g, '')
    const cleanCallbackNumber = callbackNumber.replace(/\s/g, '')

    if (cleanPhone.length !== 10) {
      toast.error('Lütfen geçerli bir telefon numarası girin (5xx xxx xx xx)')
      return
    }

    if (cleanCallbackNumber.length !== 10) {
      toast.error('Lütfen gecerli bir geri donus numarasi girin (5xx xxx xx xx)')
      return
    }

    if (!selectedTemplate) {
      toast.error('Önce bir mesaj şablonu seçin')
      return
    }

    if (quota.exhausted) {
      toast.error('Gunluk 500 mesaj hakkiniz doldu. Yeni haklar gece 00:00dan sonra yenilenir.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          templateId: selectedTemplate.id,
          callbackNumber: cleanCallbackNumber,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.quota) {
          onQuotaChange(data.quota)
        }
        toast.error(data.error || 'SMS gönderilemedi')
        return
      }

      if (data.quota) {
        onQuotaChange(data.quota)
      }

      toast.success(data.message || 'SMS kuyruğa alındı')
      setPhone('')
      setCallbackNumber('')
      router.refresh()
    } catch {
      toast.error('Bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass-strong overflow-hidden">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              SMS Gonder
            </CardTitle>
            <CardDescription>
              Mesaj icerigi admin tarafindan belirlenir. Manuel mesaj gonderimi pasif durumda.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full border border-border bg-background/70 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Kalan hak</span>
            <Badge variant={getQuotaVariant(quota)} className="tabular-nums">
              {quota.remaining} / {quota.limit}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Henuz paylasilmis mesaj sablonu yok. Admin bir sablon paylastiginda burada goreceksiniz.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {templates.map((template) => {
                  const isSelected = template.id === selectedTemplateId

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                          : 'border-border bg-card/60 hover:border-primary/40 hover:bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{template.title}</p>
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{template.message}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon Numarasi</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="message-preview">Secilen Mesaj Sablonu</Label>
                  <Textarea
                    id="message-preview"
                    value={selectedTemplate?.message ?? ''}
                    readOnly
                    className="min-h-[140px] bg-secondary/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callback-number">Mesaja Eklenecek Geri Donus Numarasi</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground border-r border-border pr-2">+90</span>
                    </div>
                    <Input
                      id="callback-number"
                      type="tel"
                      inputMode="numeric"
                      placeholder="5xx xxx xx xx"
                      value={callbackNumber}
                      onChange={handleCallbackNumberChange}
                      className="pl-20 text-base tracking-wider font-mono"
                      maxLength={13}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bu numara, sablon mesajinin alt satirina otomatik eklenir.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="final-message-preview">Gidecek Mesaj Onizlemesi</Label>
                  <Textarea
                    id="final-message-preview"
                    value={selectedTemplate ? `${selectedTemplate.message}${callbackNumber ? `\n+90${callbackNumber.replace(/\s/g, '')}` : ''}` : ''}
                    readOnly
                    className="min-h-[180px] bg-secondary/30"
                  />
                </div>

                <Button
                  type="submit"
                  size="xl"
                  variant="gradient"
                  className="w-full"
                  disabled={loading || !selectedTemplate || quota.exhausted}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Gonderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      {quota.exhausted ? 'Gunluk hak doldu' : 'Secilen Sablonu Gonder'}
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}