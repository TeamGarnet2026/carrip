import { describe, expect, it } from 'vitest'
import { moveItem } from '@/lib/routes/reorder-stops'

describe('moveItem', () => {
  it('moves an item forward', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item backward', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('returns an unchanged copy when from equals to', () => {
    const items = ['a', 'b']
    const result = moveItem(items, 1, 1)
    expect(result).toEqual(items)
    expect(result).not.toBe(items)
  })

  it('ignores out-of-range indexes', () => {
    expect(moveItem(['a', 'b'], -1, 0)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 0, 2)).toEqual(['a', 'b'])
  })

  it('does not mutate the input', () => {
    const items = ['a', 'b', 'c']
    moveItem(items, 0, 2)
    expect(items).toEqual(['a', 'b', 'c'])
  })
})
