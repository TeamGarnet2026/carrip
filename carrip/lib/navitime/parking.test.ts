import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PARKING_YEN_PER_HOUR,
  DEFAULT_STAY_MINUTES,
  REST_AREA_PARKING_YEN_PER_HOUR,
} from '@/lib/navitime/parking'

describe('parking fee calculation helpers', () => {
  it('charges at least one hour for partial stays', () => {
    const hourlyYen = DEFAULT_PARKING_YEN_PER_HOUR
    const stayMinutes = 90
    const hours = Math.max(1, Math.ceil(stayMinutes / 60))
    expect(hourlyYen * hours).toBe(600)
  })

  it('treats rest areas as free parking', () => {
    expect(REST_AREA_PARKING_YEN_PER_HOUR).toBe(0)
    expect(DEFAULT_STAY_MINUTES).toBeGreaterThan(0)
  })
})
