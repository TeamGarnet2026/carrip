import { describe, expect, it } from 'vitest'
import { detectLongDriveSegmentIndexes } from '@/lib/poi/rest-area'
import type { RouteSection } from '@/lib/routes/types'

describe('detectLongDriveSegmentIndexes', () => {
  it('finds move segments longer than max drive minutes', () => {
    const sections: RouteSection[] = [
      { type: 'move', name: '走行1', duration_min: 80 },
      { type: 'point', name: 'POI', duration_min: 30 },
      { type: 'move', name: '走行2', duration_min: 140 },
    ]

    expect(detectLongDriveSegmentIndexes(sections, 120)).toEqual([2])
  })
})
