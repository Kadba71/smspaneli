import { describe, expect, it } from 'vitest'
import { extractIpAddress, resolveSecureCookieFlag } from '@/lib/http-runtime'

describe('http runtime helpers', () => {
  it('extracts first forwarded IPv4 address', () => {
    expect(extractIpAddress('203.0.113.7, 10.0.0.2')).toBe('203.0.113.7')
  })

  it('normalizes ipv6 mapped ipv4 addresses', () => {
    expect(extractIpAddress('::ffff:198.51.100.4')).toBe('198.51.100.4')
  })

  it('rejects invalid ip values', () => {
    expect(extractIpAddress('not-an-ip')).toBeNull()
  })

  it('uses secure cookies for production https hosts', () => {
    expect(
      resolveSecureCookieFlag({
        nodeEnv: 'production',
        host: 'panel.example.com',
        forwardedProto: 'https',
        protocol: 'http:',
      })
    ).toBe(true)
  })

  it('disables secure cookies on localhost', () => {
    expect(
      resolveSecureCookieFlag({
        nodeEnv: 'production',
        host: 'localhost:3000',
        forwardedProto: null,
        protocol: 'http:',
      })
    ).toBe(false)
  })
})