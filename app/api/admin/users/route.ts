import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail, validatePassword } from '@/lib/validation'
import { assignProxyToNewUser } from '@/lib/proxy'

export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        proxy: {
          select: {
            host: true,
            port: true,
            protocol: true,
            assignedAt: true,
            expiresAt: true,
            lastError: true,
          },
        },
        _count: { select: { smsLogs: true } },
      },
    })

    return NextResponse.json({
      users: users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        proxy: user.proxy
          ? {
              ...user.proxy,
              assignedAt: user.proxy.assignedAt.toISOString(),
              expiresAt: user.proxy.expiresAt.toISOString(),
            }
          : null,
      })),
    })
  } catch (error) {
    console.error('[ADMIN USERS GET]', error)
    return NextResponse.json({ error: 'Kullanıcılar alınamadı' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, password, role = 'user' } = body

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, ad ve şifre zorunludur' },
        { status: 400 }
      )
    }

    if (!['admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Geçersiz rol' }, { status: 400 })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const normalizedEmail = normalizeEmail(email)
    const trimmedName = name.trim()

    if (!trimmedName) {
      return NextResponse.json({ error: 'Ad alanı boş bırakılamaz' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Bu email adresi zaten kullanılıyor' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: trimmedName,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    // Yeni kullanıcıya otomatik proxy ata (arka planda, hata olursa kullanıcı oluşturmayı engelleme)
    assignProxyToNewUser(user.id).catch((error) => {
      console.error(`[ADMIN USERS] Yeni kullanıcıya proxy atanamadı (${user.id}):`, error)
    })

    return NextResponse.json({ success: true, user }, { status: 201 })
  } catch (error) {
    console.error('[ADMIN USERS POST]', error)
    return NextResponse.json({ error: 'Kullanıcı oluşturulamadı' }, { status: 500 })
  }
}
