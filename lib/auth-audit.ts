import { prisma } from './prisma'
import type { AuthAttemptReason } from './validation'

interface LogAuthAttemptInput {
  email: string
  ipAddress: string
  success: boolean
  reason: AuthAttemptReason
}

export async function logAuthAttempt(input: LogAuthAttemptInput) {
  try {
    await prisma.authAuditLog.create({
      data: input,
    })
  } catch (error) {
    console.error('[AUTH AUDIT]', error)
  }
}