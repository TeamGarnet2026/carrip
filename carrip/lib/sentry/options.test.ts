import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  resolveSentryDsn,
  resolveTracesSampleRate,
  sentryBaseOptions,
} from '@/lib/sentry/options'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('resolveSentryDsn', () => {
  it('uses only the public DSN in the browser', () => {
    vi.stubEnv('SENTRY_DSN', 'https://server@sentry.example/1')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '')
    expect(resolveSentryDsn('client')).toBeUndefined()
    expect(resolveSentryDsn('server')).toBe('https://server@sentry.example/1')
  })

  it('falls back to the public DSN on the server and edge', () => {
    vi.stubEnv('SENTRY_DSN', undefined)
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', ' https://public@sentry.example/1 ')
    expect(resolveSentryDsn('edge')).toBe('https://public@sentry.example/1')
    expect(resolveSentryDsn('client')).toBe('https://public@sentry.example/1')
  })
})

describe('resolveTracesSampleRate', () => {
  it('defaults to 10% and clamps to 0..1', () => {
    expect(resolveTracesSampleRate(undefined)).toBe(0.1)
    expect(resolveTracesSampleRate('')).toBe(0.1)
    expect(resolveTracesSampleRate('abc')).toBe(0.1)
    expect(resolveTracesSampleRate('0.5')).toBe(0.5)
    expect(resolveTracesSampleRate('3')).toBe(1)
    expect(resolveTracesSampleRate('-1')).toBe(0)
  })
})

describe('sentryBaseOptions', () => {
  it('is disabled without a DSN', () => {
    vi.stubEnv('SENTRY_DSN', undefined)
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', undefined)
    expect(sentryBaseOptions('server')).toMatchObject({ dsn: undefined, enabled: false })
  })

  it('enables sending, never sends PII and uses the Vercel environment', () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@sentry.example/1')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview')
    expect(sentryBaseOptions('client')).toEqual({
      dsn: 'https://public@sentry.example/1',
      enabled: true,
      environment: 'preview',
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    })
  })

  it('falls back to NODE_ENV for the environment', () => {
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', undefined)
    vi.stubEnv('VERCEL_ENV', undefined)
    vi.stubEnv('NODE_ENV', 'production')
    expect(sentryBaseOptions('server').environment).toBe('production')
  })
})
