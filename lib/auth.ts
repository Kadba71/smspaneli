import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { env } from './env'
import { runDueMaintenance } from './maintenance'
import { parseUserRole } from './validation'

export interface JWTPayload {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  tokenVersion: number
}

function getSecret() {
  return new TextEncoder().encode(env.JWT_SECRET)
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const tokenPayload = payload as unknown as JWTPayload

    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tokenVersion: true,
      },
    })

    if (!user) {
      return null
    }

    if (tokenPayload.tokenVersion !== user.tokenVersion || tokenPayload.email !== user.email) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: parseUserRole(user.role),
      tokenVersion: user.tokenVersion,
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  try {
    await runDueMaintenance().catch((error) => {
      console.error('[MAINTENANCE]', error)
    })

    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) return null
    return verifyToken(token)
  } catch {
    return null
  }
}
