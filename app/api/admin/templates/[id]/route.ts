import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateSmsMessage } from '@/lib/validation'

interface Params {
  params: Promise<{ id: string }>
}

function validateTemplateTitle(title: unknown) {
  if (typeof title !== 'string' || !title.trim()) {
    return 'Sablon basligi zorunludur'
  }

  if (title.trim().length > 80) {
    return 'Sablon basligi en fazla 80 karakter olabilir'
  }

  return null
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const updateData: { title?: string; message?: string; isActive?: boolean } = {}

    if (body.title !== undefined) {
      const titleError = validateTemplateTitle(body.title)
      if (titleError) {
        return NextResponse.json({ error: titleError }, { status: 400 })
      }

      updateData.title = body.title.trim()
    }

    if (body.message !== undefined) {
      const messageValidation = validateSmsMessage(body.message)
      if (messageValidation.error) {
        return NextResponse.json({ error: messageValidation.error }, { status: 400 })
      }

      updateData.message = messageValidation.message!
    }

    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive)
    }

    const template = await prisma.smsTemplate.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[ADMIN TEMPLATE PATCH]', error)
    return NextResponse.json({ error: 'Sablon guncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 403 })
    }

    const { id } = await params

    await prisma.smsTemplate.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN TEMPLATE DELETE]', error)
    return NextResponse.json({ error: 'Sablon silinemedi' }, { status: 500 })
  }
}