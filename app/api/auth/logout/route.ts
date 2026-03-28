import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { shouldUseSecureCookies } from '@/lib/cookies'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getSession()

  if (session) {
    await prisma.user.update({
      where: { id: session.id },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    }).catch((error) => {
      console.error('[AUTH LOGOUT]', error)
    })
  }

  const response = NextResponse.json({ success: true, message: 'Çıkış yapıldı' })
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: shouldUseSecureCookies(request),
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return response
}
