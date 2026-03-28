import type { NextRequest } from 'next/server'
import { env } from './env'
import { resolveSecureCookieFlag } from './http-runtime'

export function shouldUseSecureCookies(request: NextRequest) {
  return resolveSecureCookieFlag({
    nodeEnv: env.NODE_ENV,
    host: request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '',
    forwardedProto: request.headers.get('x-forwarded-proto'),
    protocol: request.nextUrl.protocol,
  })
}