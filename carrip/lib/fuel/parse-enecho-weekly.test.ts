import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseEnechoWeeklyWorkbook } from '@/lib/fuel/parse-enecho-weekly'
import { toPrefectureName } from '@/lib/fuel/enecho-prefectures'

function buildRowTimeseriesFixture(): Buffer {
  // Excel シリアル: 45800 ≈ 2025-06-18 付近
  const dates = [45786, 45793, 45800]
  const regularRows = [
    ['項目', 'レギュラー', '', '店頭現金価格'],
    ['地域', ...dates],
    ['青  森', 170.1, 170.5, 171.2],
    ['岩  手', 169.0, 169.2, 169.8],
    ['宮  城', 168.5, 168.7, 169.1],
    ['秋  田', 170.0, 170.1, 170.4],
    ['山  形', 171.0, 171.2, 171.5],
    ['福  島', 169.5, 169.6, 169.9],
    ['茨  城', 167.0, 167.2, 167.5],
    ['栃  木', 167.1, 167.3, 167.6],
    ['群  馬', 167.2, 167.4, 167.7],
    ['埼  玉', 166.8, 167.0, 167.3],
    ['千  葉', 166.9, 167.1, 167.4],
    ['東  京', 172.0, 172.2, 172.5],
    ['神奈川', 171.0, 171.1, 171.4],
    ['新  潟', 170.2, 170.3, 170.6],
    ['富  山', 169.8, 169.9, 170.1],
    ['石  川', 169.7, 169.8, 170.0],
    ['福  井', 169.6, 169.7, 169.9],
    ['山  梨', 168.8, 168.9, 169.2],
    ['長  野', 170.5, 170.6, 170.9],
    ['岐  阜', 168.0, 168.1, 168.4],
    ['静  岡', 168.2, 168.3, 168.6],
    ['愛  知', 165.0, 165.1, 165.4],
    ['三  重', 167.5, 167.6, 167.9],
    ['滋  賀', 168.3, 168.4, 168.7],
    ['京  都', 169.0, 169.1, 169.5],
    ['大  阪', 168.1, 168.2, 168.5],
    ['兵  庫', 167.8, 167.9, 168.2],
    ['奈  良', 168.4, 168.5, 168.8],
    ['和歌山', 169.2, 169.3, 169.6],
    ['鳥  取', 170.0, 170.1, 170.3],
    ['島  根', 170.4, 170.5, 170.7],
    ['岡  山', 168.6, 168.7, 169.0],
    ['広  島', 168.9, 169.0, 169.3],
    ['山  口', 169.1, 169.2, 169.4],
    ['徳  島', 167.7, 167.8, 168.0],
    ['香  川', 167.4, 167.5, 167.7],
    ['愛\u3000媛', 167.3, 167.4, 167.6],
    ['高  知', 168.0, 168.1, 168.3],
    ['福  岡', 170.8, 170.9, 171.1],
    ['佐  賀', 170.6, 170.7, 170.9],
    ['長  崎', 172.1, 172.2, 172.4],
    ['熊  本', 169.4, 169.5, 169.7],
    ['大  分', 170.2, 170.3, 170.5],
    ['宮\u3000崎', 169.8, 169.9, 170.1],
    ['鹿児島', 171.5, 171.6, 171.8],
    ['北 海 道 局', 173.0, 173.1, 173.3],
    ['沖  縄', 175.0, 175.1, 175.4],
    ['全         国', 169.5, 169.6, 169.9],
  ]

  const wb = XLSX.utils.book_new()
  for (const sheetName of ['レギュラー', 'ハイオク', '軽油'] as const) {
    const offset =
      sheetName === 'ハイオク' ? 10 : sheetName === '軽油' ? -15 : 0
    const rows = regularRows.map((row, index) => {
      if (index < 2) return [...row]
      return row.map((cell, col) =>
        col === 0 || typeof cell !== 'number' ? cell : Number((cell + offset).toFixed(1))
      )
    })
    if (sheetName === 'ハイオク') rows[0][1] = 'ハイオク'
    if (sheetName === '軽油') rows[0][1] = '軽油'
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, sheet, sheetName)
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/** 資源エネルギー庁 *s5.xlsx 形式（列=地域） */
function buildColumnarFixture(): Buffer {
  const header = [
    'レギュラー',
    '調査日',
    '全         国',
    '北 海 道 局',
    '青  森',
    '岩  手',
    '宮  城',
    '秋  田',
    '山  形',
    '福  島',
    '茨  城',
    '栃  木',
    '群  馬',
    '埼  玉',
    '千  葉',
    '東  京',
    '神奈川',
    '新  潟',
    '富  山',
    '石  川',
    '福  井',
    '山  梨',
    '長  野',
    '岐  阜',
    '静  岡',
    '愛  知',
    '三  重',
    '滋  賀',
    '京  都',
    '大  阪',
    '兵  庫',
    '奈  良',
    '和歌山',
    '鳥  取',
    '島  根',
    '岡  山',
    '広  島',
    '山  口',
    '徳  島',
    '香  川',
    '愛　媛',
    '高  知',
    '福  岡',
    '佐  賀',
    '長  崎',
    '熊  本',
    '大  分',
    '宮　崎',
    '鹿児島',
    '沖  縄  局',
  ]

  const older = [
    null,
    new Date(Date.UTC(2026, 6, 19, 15)), // JST 2026-07-20
    169.9,
    ...Array.from({ length: header.length - 3 }, (_, i) => 160 + (i % 10) * 0.1),
  ]
  const latest = [
    null,
    new Date(Date.UTC(2026, 6, 26, 15)), // JST 2026-07-27
    170.1,
    171.4, // 北海道
    ...Array.from({ length: 45 }, (_, i) => 165 + (i % 8) * 0.2),
    178.5, // 沖縄
  ]
  // 京都列を明示
  const kyotoIdx = header.indexOf('京  都')
  latest[kyotoIdx] = 169.8

  const wb = XLSX.utils.book_new()
  for (const sheetName of ['レギュラー', 'ハイオク', '軽油'] as const) {
    const offset =
      sheetName === 'ハイオク' ? 10 : sheetName === '軽油' ? -15 : 0
    const bump = (row: unknown[]) =>
      row.map((cell, col) =>
        col < 2 || typeof cell !== 'number'
          ? cell
          : Number((cell + offset).toFixed(1))
      )
    const sheet = XLSX.utils.aoa_to_sheet([
      [...header],
      bump(older),
      bump(latest),
      ['※注記'],
    ])
    XLSX.utils.book_append_sheet(wb, sheet, sheetName)
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('enecho prefecture labels', () => {
  it('normalizes spaced labels to prefecture names', () => {
    expect(toPrefectureName('京  都')).toBe('京都府')
    expect(toPrefectureName('東  京')).toBe('東京都')
    expect(toPrefectureName('北 海 道 局')).toBe('北海道')
    expect(toPrefectureName('沖  縄  局')).toBe('沖縄県')
    expect(toPrefectureName('関  東  局')).toBeNull()
    expect(toPrefectureName('全         国')).toBeNull()
  })
})

describe('parseEnechoWeeklyWorkbook', () => {
  it('extracts latest weekly prices from row-timeseries (oil-info) format', () => {
    const parsed = parseEnechoWeeklyWorkbook(buildRowTimeseriesFixture())

    expect(parsed.format).toBe('row_timeseries')
    expect(parsed.surveyDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(parsed.rows.length).toBeGreaterThanOrEqual(40)

    const kyoto = parsed.rows.find((row) => row.prefectureName === '京都府')
    expect(kyoto?.regular).toBe(169.5)
    expect(kyoto?.premium).toBe(179.5)
    expect(kyoto?.diesel).toBe(154.5)
    expect(kyoto?.prefectureCode).toBe('26')

    expect(parsed.national?.regular).toBe(169.9)
  })

  it('extracts latest weekly prices from columnar (*s5.xlsx) format', () => {
    const parsed = parseEnechoWeeklyWorkbook(
      buildColumnarFixture(),
      '260729s5.xlsx'
    )

    expect(parsed.format).toBe('columnar')
    expect(parsed.surveyDate).toBe('2026-07-27')
    expect(parsed.rows.length).toBe(47)

    const kyoto = parsed.rows.find((row) => row.prefectureName === '京都府')
    expect(kyoto?.regular).toBe(169.8)
    expect(kyoto?.premium).toBe(179.8)
    expect(kyoto?.diesel).toBe(154.8)

    const hokkaido = parsed.rows.find((row) => row.prefectureName === '北海道')
    expect(hokkaido?.regular).toBe(171.4)

    const okinawa = parsed.rows.find((row) => row.prefectureName === '沖縄県')
    expect(okinawa?.regular).toBe(178.5)

    expect(parsed.national?.regular).toBe(170.1)
  })
})
