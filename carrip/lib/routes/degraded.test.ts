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
        'gemini'
      )
    ).toEqual(['government_fuel', 'navitime', 'gemini'])
  })

  it('returns user-facing banner messages', () => {
    const messages = getDegradedBannerMessages(['navitime', 'government_fuel'])

    expect(messages).toHaveLength(2)
    expect(messages[0]).toContain('NAVITIME')
    expect(messages[1]).toContain('燃料価格API')
  })
})
