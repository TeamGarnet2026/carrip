import { describe, expect, it, vi, afterEach } from 'vitest'
import { checkGoogleMapsHealth } from '@/lib/google/maps-health'

describe('checkGoogleMapsHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete process.env.GOOGLE_CLOUD_API_KEY
  })

  it('returns ok when Places and Maps JS succeed even if Static Maps is disabled', async () => {
    process.env.GOOGLE_CLOUD_API_KEY = 'test-key'

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input)
        if (url.includes('places.googleapis.com')) {
          return new Response(JSON.stringify({ places: [{ id: 'x' }] }), {
            status: 200,
          })
        }
        if (url.includes('maps/api/js')) {
          return new Response('/* maps js */', { status: 200 })
        }
        if (url.includes('staticmap')) {
          return new Response('not activated on your API project', {
            status: 403,
          })
        }
        return new Response('not found', { status: 404 })
      })
    )

    const health = await checkGoogleMapsHealth()

    expect(health.ok).toBe(true)
    expect(health.places_api).toBe('ok')
    expect(health.maps_javascript_loader).toBe('ok')
    expect(health.static_maps_api).toBe('not_enabled')
    expect(health.warnings?.length).toBeGreaterThan(0)
  })
})
