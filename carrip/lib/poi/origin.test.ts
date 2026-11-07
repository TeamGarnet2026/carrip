import { describe, expect, it } from 'vitest'
import { splitPrefecture, toOriginCandidate } from '@/lib/poi/origin'

describe('splitPrefecture', () => {
  it('drops the country and postal code and splits off the prefecture', () => {
    expect(splitPrefecture('日本、〒600-8216 京都府京都市下京区東塩小路町')).toEqual({
      prefecture: '京都府',
      locality: '京都市下京区東塩小路町',
    })
  })

  it('handles 北海道 and addresses without a postal code', () => {
    expect(splitPrefecture('日本、北海道札幌市北区北6条西4丁目')).toEqual({
      prefecture: '北海道',
      locality: '札幌市北区北6条西4丁目',
    })
  })

  it('returns no prefecture when the address does not start with one', () => {
    expect(splitPrefecture('Shinjuku City, Tokyo')).toEqual({
      locality: 'Shinjuku City, Tokyo',
    })
  })
})

describe('toOriginCandidate', () => {
  it('maps a place to a candidate with its prefecture', () => {
    expect(
      toOriginCandidate({
        id: 'p1',
        name: '京都駅',
        address: '日本、〒600-8216 京都府京都市下京区東塩小路町',
        lat: 34.98,
        lng: 135.75,
      })
    ).toEqual({
      place_id: 'p1',
      name: '京都駅',
      prefecture: '京都府',
      locality: '京都市下京区東塩小路町',
      lat: 34.98,
      lng: 135.75,
    })
  })
})
