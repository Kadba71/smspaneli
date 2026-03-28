import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validatePassword } from '@/lib/validation'

interface Params {
  params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const { id } = await params

    // Admin kendini silemez
    if (id === session.id) {
      return NextResponse.json(
        { error: 'Kendi hesabınızı silemezsiniz' },
        { status: 400 }
      )
    }

    const user = (await prisma.user.findUnique({
      where: { id },
    })) as {
      id: string
      tokenVersion: number
    } | null

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Kullanıcı silindi' })
  } catch (error) {
    console.error('[ADMIN USER DELETE]', error)
    return NextResponse.json({ error: 'Kullanıcı silinemedi' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { password, name } = body

    const user = (await prisma.user.findUnique({ where: { id } })) as {
      id: string
      tokenVersion: number
    } | null

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const updatePayload: {
      password?: string
      name?: string
      tokenVersion?: number
    } = {}

    if (password) {
      const passwordError = validatePassword(password)
      if (passwordError) {
        return NextResponse.json(
          { error: passwordError },
          { status: 400 }
        )
      }
      updatePayload.password = await bcrypt.hash(password, 12)
      updatePayload.tokenVersion = user.tokenVersion + 1
    }

    if (name) {
      const trimmedName = name.trim()

      if (!trimmedName) {
        return NextResponse.json({ error: 'Ad alanı boş bırakılamaz' }, { status: 400 })
      }

      updatePayload.name = trimmedName
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updatePayload,
      select: { id: true, email: true, name: true, role: true },
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    console.error('[ADMIN USER PATCH]', error)
    return NextResponse.json({ error: 'Kullanıcı güncellenemedi' }, { status: 500 })
  }
}
