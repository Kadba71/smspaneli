import type { NextRequest } from 'next/server'
import { env } from './env'
import { extractIpAddress } from './http-runtime'

export function getClientIp(request: NextRequest): string {
  if (env.TRUST_PROXY_HEADERS) {
    return (
      extractIpAddress(request.headers.get('cf-connecting-ip')) ??
      extractIpAddress(request.headers.get('x-real-ip')) ??
      extractIpAddress(request.headers.get('x-forwarded-for')) ??
      extractIpAddress(request.headers.get('x-vercel-forwarded-for')) ??
      'unknown'
    )
  }

  if (env.NODE_ENV !== 'production') {
    return 'local'
  }

  return (
    extractIpAddress(request.headers.get('cf-connecting-ip')) ??
    extractIpAddress(request.headers.get('x-vercel-forwarded-for')) ??
    'unknown'
  )
}