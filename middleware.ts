import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/health']
const DISALLOWED_JWT_SECRETS = new Set([
  'fallback-secret-change-in-production',
  'sms-panel-super-secret-jwt-key-change-in-production-2024',
  'local-dev-jwt-secret-please-change-2026-very-strong',
])

function getSecret() {
  const jwtSecret = process.env.JWT_SECRET?.trim()

  if (!jwtSecret || jwtSecret.length < 32 || DISALLOWED_JWT_SECRETS.has(jwtSecret)) {
    throw new Error('JWT_SECRET eksik veya gecersiz.')
  }

  return new TextEncoder().encode(jwtSecret)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isLoginPage = pathname === '/login'
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Statik dosyalar ve public paths için geç
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    (isPublicPath && !isLoginPage)
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value

  if (isLoginPage) {
    if (!token) {
      return NextResponse.next()
    }

    try {
      await jwtVerify(token, getSecret())
      return NextResponse.next()
    } catch {
      const response = NextResponse.next()
      response.cookies.delete('token')
      return response
    }
  }

  // Token yoksa login'e yönlendir
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Token'ı doğrula
  try {
    await jwtVerify(token, getSecret())
    return NextResponse.next()
  } catch {
    // Geçersiz token - temizle ve login'e yönlendir
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
}
