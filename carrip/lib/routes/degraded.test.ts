import { describe, expect, it } from 'vitest'
import {
  collectDegradedReasons,
  getDegradedBannerMessages,
} from '@/lib/routes/degraded'

describe('degraded reasons', () => {
  it('collects unique reasons in order', () => {
    expect(
      collectDegradedReasons(
        'government_fuel',
        ['navitime', 'government_fuel'],
        'google_routes'
      )
    ).toEqual(['government_fuel', 'navitime', 'google_routes'])
  })

  it('returns user-facing banner messages', () => {
    const messages = getDegradedBannerMessages(['navitime', 'government_fuel'])

    expect(messages).toHaveLength(2)
    expect(messages[0]).toContain('NAVITIME')
    expect(messages[1]).toContain('給油所価格')
  })
})
