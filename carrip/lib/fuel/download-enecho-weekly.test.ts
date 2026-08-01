import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WEEKLY_EXCEL_URL,
  buildEnechoS5Url,
  extractExcelLinksFromHtml,
  formatYyMmDd,
  isCurrentSekiyuWeeklyUrl,
  normalizeEnechoExcelUrl,
  pickWeeklyExcelUrl,
  recentPublicationDateCandidates,
} from '@/lib/fuel/download-enecho-weekly'

describe('weekly excel url selection', () => {
  it('accepts only the current SekiyuWeekly.xls filename', () => {
    expect(
      isCurrentSekiyuWeeklyUrl(
        'https://oil-info.ieej.or.jp/price/data/SekiyuWeekly.xls'
      )
    ).toBe(true)
    expect(
      isCurrentSekiyuWeeklyUrl(
        'https://oil-info.ieej.or.jp/price/data/SekiyuWeekly1990082720040607.xls'
      )
    ).toBe(false)
  })

  it('ignores dated archive links from the listing page', () => {
    const html = `
      <a href="./data/SekiyuWeekly1990082720040607.xls"></a>
      <a href="./data/SekiyuWeekly2004061420090518.xls"></a>
      <a href="./data/SekiyuWeekly.xls"></a>
    `
    const links = extractExcelLinksFromHtml(
      html,
      'https://oil-info.ieej.or.jp/price/price.html'
    )
    expect(pickWeeklyExcelUrl(links)).toBe(DEFAULT_WEEKLY_EXCEL_URL)
  })

  it('rewrites detail YYMMDD.xlsx to weekly YYMMDDs5.xlsx on enecho', () => {
    expect(
      normalizeEnechoExcelUrl(
        'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/xlsx/260729.xlsx'
      )
    ).toBe(
      'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/xlsx/260729s5.xlsx'
    )
    expect(
      normalizeEnechoExcelUrl(
        'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/xlsx/260729s5.xlsx'
      )
    ).toBe(
      'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/xlsx/260729s5.xlsx'
    )
  })

  it('prefers *s5.xlsx links when present', () => {
    const html = `
      <a href="./xlsx/260722.xlsx"></a>
      <a href="./xlsx/260729.xlsx"></a>
      <a href="./xlsx/260722s5.xlsx"></a>
      <a href="./xlsx/260729s5.xlsx"></a>
    `
    const links = extractExcelLinksFromHtml(
      html,
      'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/results.html'
    )
    expect(pickWeeklyExcelUrl(links)).toBe(
      'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/xlsx/260729s5.xlsx'
    )
  })

  it('builds recent Wednesday-based s5 candidates', () => {
    // 2026-08-01 (土) JST 付近 → 直近水曜は 7/29
    const now = new Date('2026-08-01T05:00:00Z')
    const candidates = recentPublicationDateCandidates(now, 1)
    expect(formatYyMmDd(candidates[0]!)).toBe('260729')
    expect(buildEnechoS5Url('260729')).toContain('/xlsx/260729s5.xlsx')
  })
})
