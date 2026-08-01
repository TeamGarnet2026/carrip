import { describe, expect, it } from 'vitest'
import { buildTollCacheKey } from '@/lib/prices/toll'
import { tollPriceQuerySchema } from '@/lib/prices/schema'

describe('tollPriceQuerySchema', () => {
  it('accepts a valid toll query payload', async () => {
    const parsed = tollPriceQuerySchema.parse({
      start: { lat: 35.0116, lng: 135.7681 },
      goal: { lat: 35.0394, lng: 135.7292 },
      vehicle_type: 'compact',
    })

    expect(parsed.use_highway).toBe(true)
    await expect(buildTollCacheKey(parsed)).resolves.toMatch(/^prices:toll:/)
  })
})
