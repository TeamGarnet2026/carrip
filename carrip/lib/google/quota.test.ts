import { describe, expect, it } from 'vitest'
import {
  isPlacesQuotaExceeded,
  PlacesQuotaExceededError,
  placesApiError,
} from '@/lib/google/quota'

const QUOTA_DETAIL = JSON.stringify({
  error: {
    code: 429,
    message: "Quota exceeded for quota metric 'SearchTextRequest'",
    status: 'RESOURCE_EXHAUSTED',
  },
})

describe('isPlacesQuotaExceeded', () => {
  it('detects the daily quota response', () => {
    expect(isPlacesQuotaExceeded(429, QUOTA_DETAIL)).toBe(true)
    expect(isPlacesQuotaExceeded(403, '{"status":"RESOURCE_EXHAUSTED"}')).toBe(true)
  })

  it('ignores other failures', () => {
    expect(isPlacesQuotaExceeded(500, 'internal')).toBe(false)
    expect(isPlacesQuotaExceeded(403, '{"status":"PERMISSION_DENIED"}')).toBe(false)
  })
})

describe('placesApiError', () => {
  it('returns a quota error only when the quota is exhausted', () => {
    expect(placesApiError(429, QUOTA_DETAIL)).toBeInstanceOf(PlacesQuotaExceededError)
    expect(placesApiError(500, 'internal')).not.toBeInstanceOf(PlacesQuotaExceededError)
  })
})
