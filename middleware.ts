import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { env } from '@/lib/env'

const PUBLIC_PATHS = ['/login', '/api/auth/login']

function getSecret() {
  return new TextEncoder().encode(env.JWT_SECRET)
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
