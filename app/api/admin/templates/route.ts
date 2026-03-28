import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateSmsMessage } from '@/lib/validation'

function validateTemplateTitle(title: unknown) {
  if (typeof title !== 'string' || !title.trim()) {
    return 'Sablon basligi zorunludur'
  }

  if (title.trim().length > 80) {
    return 'Sablon basligi en fazla 80 karakter olabilir'
  }

  return null
}

export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 403 })
    }

    const templates = await prisma.smsTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      templates: templates.map((template) => ({
        ...template,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[ADMIN TEMPLATES GET]', error)
    return NextResponse.json({ error: 'Sablonlar alinamadi' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erisim' }, { status: 403 })
    }

    const body = await request.json()
    const titleError = validateTemplateTitle(body.title)

    if (titleError) {
      return NextResponse.json({ error: titleError }, { status: 400 })
    }

    const messageValidation = validateSmsMessage(body.message)
    if (messageValidation.error) {
      return NextResponse.json({ error: messageValidation.error }, { status: 400 })
    }

    const template = await prisma.smsTemplate.create({
      data: {
        title: body.title.trim(),
        message: messageValidation.message!,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        template: {
          ...template,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[ADMIN TEMPLATES POST]', error)
    return NextResponse.json({ error: 'Sablon kaydedilemedi' }, { status: 500 })
  }
}