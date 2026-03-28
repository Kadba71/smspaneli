export function extractIpAddress(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const candidate = value.split(',')[0]?.trim().replace(/^::ffff:/i, '')
  if (!candidate) {
    return null
  }

  if (candidate.toLowerCase() === 'localhost') {
    return 'localhost'
  }

  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(candidate)
  const isIpv6 = /^[a-f0-9:]+$/i.test(candidate) && candidate.includes(':')

  return isIpv4 || isIpv6 ? candidate : null
}

export function resolveSecureCookieFlag(options: {
  nodeEnv: string
  host: string
  forwardedProto: string | null | undefined
  protocol: string
}) {
  if (options.nodeEnv !== 'production') {
    return false
  }

  const host = options.host.trim()
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
    return false
  }

  const forwardedProto = options.forwardedProto?.split(',')[0]?.trim().toLowerCase()
  if (forwardedProto) {
    return forwardedProto === 'https'
  }

  return options.protocol === 'https:' || options.nodeEnv === 'production'
}