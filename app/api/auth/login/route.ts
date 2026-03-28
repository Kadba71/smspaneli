import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { logAuthAttempt } from '@/lib/auth-audit'
import { shouldUseSecureCookies } from '@/lib/cookies'
import { runDueMaintenance } from '@/lib/maintenance'
import { getClientIp } from '@/lib/request'
import { checkRateLimit, LOGIN_RATE_LIMIT_EMAIL, LOGIN_RATE_LIMIT_IP } from '@/lib/rate-limit'
import { normalizeEmail, parseUserRole } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    await runDueMaintenance()

    const body = await request.json()
    const ipAddress = getClientIp(request)
    const { email, password } = body

    if (!email || !password) {
      void logAuthAttempt({
        email: typeof email === 'string' ? normalizeEmail(email) : 'unknown',
        ipAddress,
        success: false,
        reason: 'validation_error',
      })

      return NextResponse.json(
        { error: 'Email ve şifre gereklidir' },
        { status: 400 }
      )
    }

    const normalizedEmail = normalizeEmail(email)

    const ipRateLimit = await checkRateLimit(`login:ip:${ipAddress}`, LOGIN_RATE_LIMIT_IP)

    if (!ipRateLimit.allowed) {
      const resetIn = ipRateLimit.resetIn

      void logAuthAttempt({
        email: normalizedEmail,
        ipAddress,
        success: false,
        reason: 'rate_limited',
      })

      return NextResponse.json(
        {
          error: `Çok fazla giriş denemesi. ${Math.ceil(resetIn / 1000)} saniye sonra tekrar deneyin.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(resetIn / 1000)),
          },
        }
      )
    }

    const emailRateLimit = await checkRateLimit(`login:email:${normalizedEmail}`, LOGIN_RATE_LIMIT_EMAIL)

    if (!emailRateLimit.allowed) {
      const resetIn = emailRateLimit.resetIn

      void logAuthAttempt({
        email: normalizedEmail,
        ipAddress,
        success: false,
        reason: 'rate_limited',
      })

      return NextResponse.json(
        {
          error: `Çok fazla giriş denemesi. ${Math.ceil(resetIn / 1000)} saniye sonra tekrar deneyin.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(resetIn / 1000)),
          },
        }
      )
    }

    const user = (await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })) as {
      id: string
      email: string
      name: string
      password: string
      role: string
      tokenVersion: number
    } | null

    if (!user) {
      void logAuthAttempt({
        email: normalizedEmail,
        ipAddress,
        success: false,
        reason: 'invalid_credentials',
      })

      return NextResponse.json(
        { error: 'Geçersiz email veya şifre' },
        { status: 401 }
      )
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      void logAuthAttempt({
        email: normalizedEmail,
        ipAddress,
        success: false,
        reason: 'invalid_credentials',
      })

      return NextResponse.json(
        { error: 'Geçersiz email veya şifre' },
        { status: 401 }
      )
    }

    const parsedRole = parseUserRole(user.role)

    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: parsedRole,
      tokenVersion: user.tokenVersion,
    })

    void logAuthAttempt({
      email: normalizedEmail,
      ipAddress,
      success: true,
      reason: 'success',
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: shouldUseSecureCookies(request),
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 gün
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[AUTH LOGIN]', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
