'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Edit3, Eye, EyeOff, Plus, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SmsTemplate } from '@/types'

interface AdminTemplatesManagerProps {
  initialTemplates: SmsTemplate[]
}

export function AdminTemplatesManager({ initialTemplates }: AdminTemplatesManagerProps) {
  const [templates, setTemplates] = useState<SmsTemplate[]>(initialTemplates)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function refreshTemplates() {
    const res = await fetch('/api/admin/templates')
    if (!res.ok) {
      throw new Error('Sablonlar yuklenemedi')
    }

    const data = await res.json()
    setTemplates(data.templates)
  }

  function resetForm() {
    setTitle('')
    setMessage('')
    setEditingId(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch(editingId ? `/api/admin/templates/${editingId}` : '/api/admin/templates', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Sablon kaydedilemedi')
        return
      }

      toast.success(editingId ? 'Mesaj sablonu guncellendi' : 'Mesaj sablonu paylasildi')
      resetForm()
      await refreshTemplates()
    } catch {
      toast.error('Islem sirasinda hata olustu')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleTemplate(template: SmsTemplate) {
    setBusyId(template.id)
    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Sablon durumu guncellenemedi')
        return
      }

      toast.success(template.isActive ? 'Sablon pasife alindi' : 'Sablon aktif edildi')
      await refreshTemplates()
    } catch {
      toast.error('Sablon durumu guncellenemedi')
    } finally {
      setBusyId(null)
    }
  }

  async function deleteTemplate(template: SmsTemplate) {
    setBusyId(template.id)
    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Sablon silinemedi')
        return
      }

      toast.success('Sablon silindi')
      if (editingId === template.id) {
        resetForm()
      }
      await refreshTemplates()
    } catch {
      toast.error('Sablon silinemedi')
    } finally {
      setBusyId(null)
    }
  }

  function startEdit(template: SmsTemplate) {
    setEditingId(template.id)
    setTitle(template.title)
    setMessage(template.message)
  }

  const activeCount = templates.filter((template) => template.isActive).length

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Mesaj Hazirlama Alani
          </CardTitle>
          <CardDescription>
            Paylas butonuyla tum kullanicilarin gorecegi mesaj sablonlarini olusturun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-title">Sablon Basligi</Label>
              <Input
                id="template-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Orn. Randevu Hatirlatma"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-message">Mesaj Icerigi</Label>
              <Textarea
                id="template-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Kullanicilarin gonderecegi sablon mesaji yazin..."
                className="min-h-[180px]"
                required
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="gradient" loading={submitting}>
                <Plus className="w-4 h-4" />
                {editingId ? 'Guncelle' : 'Paylas'}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Vazgec
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Paylasilan Mesaj Sablonlari</CardTitle>
          <CardDescription>
            {templates.length} toplam sablon · {activeCount} tanesi kullanicilara acik
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Henuz paylasilmis mesaj sablonu yok.
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{template.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{template.message}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${template.isActive ? 'bg-green-500/10 text-green-400' : 'bg-secondary text-muted-foreground'}`}>
                    {template.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(template)}>
                    <Edit3 className="w-3.5 h-3.5" />
                    Duzenle
                  </Button>
                  <Button type="button" size="sm" variant="outline" loading={busyId === template.id} onClick={() => toggleTemplate(template)}>
                    {template.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {template.isActive ? 'Pasife Al' : 'Aktif Et'}
                  </Button>
                  <Button type="button" size="sm" variant="destructive" loading={busyId === template.id} onClick={() => deleteTemplate(template)}>
                    <Trash2 className="w-3.5 h-3.5" />
                    Sil
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}