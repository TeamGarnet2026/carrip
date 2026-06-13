import { describe, expect, it, vi, afterEach } from 'vitest'
import { checkGeminiHealth } from '@/lib/gemini/health'

describe('checkGeminiHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_MODEL
  })

  it('reports not configured when GEMINI_API_KEY is missing', async () => {
    process.env.GEMINI_API_KEY = ''
    const health = await checkGeminiHealth()
    expect(health.ok).toBe(false)
    expect(health.reason).toBe('not_configured')
  })

  it('reports ok when Gemini returns a candidate', async () => {
    process.env.GEMINI_API_KEY = 'test-key'

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        })
      )
    )

    const health = await checkGeminiHealth()
    expect(health.ok).toBe(true)
    expect(health.reason).toBe('ok')
    expect(health.sample_response).toBe('ok')
  })

  it('reports quota errors with fix steps', async () => {
    process.env.GEMINI_API_KEY = 'test-key'

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            error: {
              message: 'You exceeded your current quota',
              status: 'RESOURCE_EXHAUSTED',
            },
          },
          { status: 429 }
        )
      )
    )

    const health = await checkGeminiHealth()
    expect(health.ok).toBe(false)
    expect(health.reason).toBe('quota_exceeded')
    expect(health.configured).toBe(true)
    expect(health.http_status).toBe(429)
    expect(health.fix_steps.length).toBeGreaterThan(0)
  })
})
