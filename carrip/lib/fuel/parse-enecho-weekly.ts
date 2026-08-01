import * as XLSX from 'xlsx'
import {
  PREFECTURE_CODE_BY_NAME,
  isNationalLabel,
  normalizeRegionLabel,
  toPrefectureName,
} from '@/lib/fuel/enecho-prefectures'

export type EnechoFuelRow = {
  surveyDate: string
  prefectureCode: string
  prefectureName: string
  regular: number
  premium: number | null
  diesel: number | null
}

export type EnechoWeeklyParseResult = {
  surveyDate: string
  national: {
    regular: number
    premium: number | null
    diesel: number | null
  } | null
  rows: EnechoFuelRow[]
  sourceFileHint?: string
  format: 'columnar' | 'row_timeseries' | 'detail'
}

function excelSerialToIso(serial: number): string {
  const utc = Date.UTC(1899, 11, 30) + serial * 86400000
  return dateToIsoJst(new Date(utc))
}

/** Excel の日付セルは UTC 深夜ずれがあるため Asia/Tokyo で YYYY-MM-DD にする */
function dateToIsoJst(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function toNumber(value: unknown): number | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return null
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function cellText(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return dateToIsoJst(value)
  return String(value)
}

function cellToIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return dateToIsoJst(value)
  }
  const text = cellText(value)
  const iso = text.match(/(\d{4})[/-年](\d{1,2})[/-月](\d{1,2})/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }
  const serial = toNumber(value)
  if (serial != null && serial > 36526 && serial < 50000) {
    return excelSerialToIso(serial)
  }
  return null
}

function sheetToRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  })
}

function guessSurveyDateFromHint(hint?: string): string | null {
  if (!hint) return null
  // 例: 260729.xlsx / 260729s5.xlsx → 公開日 2026-07-29（調査日ではない）
  const m = hint.match(/(?:^|[\\/])(\d{2})(\d{2})(\d{2})(?:s5)?\.xlsx?/i)
  if (!m) return null
  const yy = Number(m[1])
  const mm = Number(m[2])
  const dd = Number(m[3])
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const year = yy >= 70 ? 1900 + yy : 2000 + yy
  return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

function findSurveyDateInRows(rows: unknown[][]): string | null {
  for (const row of rows.slice(0, 20)) {
    for (const cell of row ?? []) {
      const iso = cellToIsoDate(cell)
      if (iso) return iso
    }
  }
  return null
}

function headerLooksLikeFuel(text: string): {
  regular: boolean
  premium: boolean
  diesel: boolean
} {
  const n = normalizeRegionLabel(text)
  return {
    regular: n.includes('レギュラー'),
    premium: n.includes('ハイオク'),
    diesel: n.includes('軽油') && !n.includes('引取'),
  }
}

type DetailColumnMap = {
  headerRow: number
  labelCol: number
  regularCol: number
  premiumCol: number | null
  dieselCol: number | null
}

function findDetailColumnMap(rows: unknown[][]): DetailColumnMap | null {
  for (let r = 0; r < Math.min(rows.length, 40); r += 1) {
    const row = (rows[r] ?? []) as unknown[]
    let labelCol = -1
    let regularCol = -1
    let premiumCol: number | null = null
    let dieselCol: number | null = null

    for (let c = 0; c < row.length; c += 1) {
      const text = cellText(row[c])
      const normalized = normalizeRegionLabel(text)
      if (
        normalized.includes('都道府県') ||
        normalized === '地域' ||
        normalized.includes('調査対象') ||
        normalized === '項目'
      ) {
        labelCol = c
      }
      const flags = headerLooksLikeFuel(text)
      if (flags.regular) regularCol = c
      if (flags.premium) premiumCol = c
      if (flags.diesel) dieselCol = c
    }

    if (regularCol >= 0) {
      if (labelCol < 0) labelCol = 0
      return { headerRow: r, labelCol, regularCol, premiumCol, dieselCol }
    }
  }
  return null
}

function parseDetailSheet(
  sheet: XLSX.WorkSheet,
  surveyDateFallback: string | null
): EnechoWeeklyParseResult | null {
  const rows = sheetToRows(sheet)
  const map = findDetailColumnMap(rows)
  if (!map) return null

  const surveyDate =
    findSurveyDateInRows(rows) ??
    surveyDateFallback ??
    new Date().toISOString().slice(0, 10)

  const byPref = new Map<
    string,
    { regular: number; premium: number | null; diesel: number | null }
  >()
  let national: {
    regular: number
    premium: number | null
    diesel: number | null
  } | null = null

  for (let r = map.headerRow + 1; r < rows.length; r += 1) {
    const row = (rows[r] ?? []) as unknown[]
    const label = cellText(row[map.labelCol])
    const regular = toNumber(row[map.regularCol])
    if (regular == null) continue

    const premium =
      map.premiumCol != null ? toNumber(row[map.premiumCol]) : null
    const diesel = map.dieselCol != null ? toNumber(row[map.dieselCol]) : null

    if (isNationalLabel(label) || normalizeRegionLabel(label).includes('全国')) {
      national = { regular, premium, diesel }
      continue
    }

    const pref = toPrefectureName(label)
    if (!pref) continue
    byPref.set(pref, { regular, premium, diesel })
  }

  if (byPref.size < 40) return null

  const resultRows: EnechoFuelRow[] = []
  for (const [prefectureName, prices] of byPref) {
    const code = PREFECTURE_CODE_BY_NAME[prefectureName]
    if (!code) continue
    resultRows.push({
      surveyDate,
      prefectureCode: code,
      prefectureName,
      regular: prices.regular,
      premium: prices.premium,
      diesel: prices.diesel,
    })
  }

  resultRows.sort((a, b) => a.prefectureCode.localeCompare(b.prefectureCode))

  return {
    surveyDate,
    national,
    rows: resultRows,
    format: 'detail',
  }
}

/** 資源エネルギー庁 *s5.xlsx: 行=調査日、列=都道府県 */
function isColumnarTimeseriesSheet(rows: unknown[][]): boolean {
  if (rows.length < 3) return false
  const header = (rows[0] ?? []) as unknown[]
  const hasSurveyCol = header.some(
    (cell) => normalizeRegionLabel(cellText(cell)) === '調査日'
  )
  const hasNational = header.some((cell) => isNationalLabel(cellText(cell)))
  return hasSurveyCol && hasNational
}

function extractColumnarSheetPrices(sheet: XLSX.WorkSheet): {
  surveyDate: string
  byPref: Map<string, number>
  national: number | null
} {
  const rows = sheetToRows(sheet)
  if (!isColumnarTimeseriesSheet(rows)) {
    throw new Error('columnar 形式ではありません')
  }

  const header = (rows[0] ?? []) as unknown[]
  let dateCol = header.findIndex(
    (cell) => normalizeRegionLabel(cellText(cell)) === '調査日'
  )
  if (dateCol < 0) dateCol = 1

  // 末尾の注記行を除き、日付がある最終行を採用
  let latestRowIndex = -1
  let surveyDate = ''
  for (let r = rows.length - 1; r >= 1; r -= 1) {
    const iso = cellToIsoDate((rows[r] ?? [])[dateCol])
    if (iso) {
      latestRowIndex = r
      surveyDate = iso
      break
    }
  }
  if (latestRowIndex < 0) {
    throw new Error('最新調査日行を特定できませんでした')
  }

  const latest = (rows[latestRowIndex] ?? []) as unknown[]
  const byPref = new Map<string, number>()
  let national: number | null = null

  for (let c = 0; c < header.length; c += 1) {
    if (c === dateCol) continue
    const label = cellText(header[c])
    const price = toNumber(latest[c])
    if (price == null) continue

    if (isNationalLabel(label)) {
      national = price
      continue
    }

    const pref = toPrefectureName(label)
    if (pref) byPref.set(pref, price)
  }

  return { surveyDate, byPref, national }
}

/** 石油情報センター SekiyuWeekly: 行=都道府県、列=調査日 */
function extractRowTimeseriesSheetPrices(sheet: XLSX.WorkSheet): {
  surveyDate: string
  byPref: Map<string, number>
  national: number | null
} {
  const rows = sheetToRows(sheet)
  if (rows.length < 3) {
    throw new Error('Excel の行数が不足しています')
  }

  // 日付ヘッダー行を探す（row 0 or 1）
  let headerRow = 1
  let colIndex = -1
  let surveyDate = ''

  for (const candidate of [1, 0, 2]) {
    const header = (rows[candidate] ?? []) as unknown[]
    for (let c = header.length - 1; c >= 1; c -= 1) {
      const iso = cellToIsoDate(header[c])
      if (iso) {
        headerRow = candidate
        colIndex = c
        surveyDate = iso
        break
      }
    }
    if (colIndex >= 0) break
  }

  if (colIndex < 0) {
    throw new Error('調査日列を特定できませんでした')
  }

  const byPref = new Map<string, number>()
  let national: number | null = null

  for (let r = headerRow + 1; r < rows.length; r += 1) {
    const row = (rows[r] ?? []) as unknown[]
    const label = cellText(row[0])
    const price = toNumber(row[colIndex])
    if (price == null) continue

    if (isNationalLabel(label)) {
      national = price
      continue
    }

    const pref = toPrefectureName(label)
    if (pref) byPref.set(pref, price)
  }

  return { surveyDate, byPref, national }
}

function mergeFuelSheets(
  regular: {
    surveyDate: string
    byPref: Map<string, number>
    national: number | null
  },
  premium: {
    byPref: Map<string, number>
    national: number | null
  } | null,
  diesel: {
    byPref: Map<string, number>
    national: number | null
  } | null,
  format: EnechoWeeklyParseResult['format'],
  sourceFileHint?: string
): EnechoWeeklyParseResult {
  const rows: EnechoFuelRow[] = []
  for (const [prefectureName, regularPrice] of regular.byPref) {
    const code = PREFECTURE_CODE_BY_NAME[prefectureName]
    if (!code) continue
    rows.push({
      surveyDate: regular.surveyDate,
      prefectureCode: code,
      prefectureName,
      regular: regularPrice,
      premium: premium?.byPref.get(prefectureName) ?? null,
      diesel: diesel?.byPref.get(prefectureName) ?? null,
    })
  }

  rows.sort((a, b) => a.prefectureCode.localeCompare(b.prefectureCode))

  if (rows.length < 40) {
    throw new Error(
      `都道府県データが不足しています（${rows.length}件）。Excel 形式を確認してください。`
    )
  }

  return {
    surveyDate: regular.surveyDate,
    national:
      regular.national != null
        ? {
            regular: regular.national,
            premium: premium?.national ?? null,
            diesel: diesel?.national ?? null,
          }
        : null,
    rows,
    sourceFileHint,
    format,
  }
}

function describeWorkbook(wb: XLSX.WorkBook): string {
  return wb.SheetNames.map((name) => {
    const rows = sheetToRows(wb.Sheets[name]!)
    const preview = rows
      .slice(0, 5)
      .map((row, i) => `  [${i}] ${JSON.stringify((row ?? []).slice(0, 8))}`)
      .join('\n')
    return `sheet="${name}" rows=${rows.length}\n${preview}`
  }).join('\n\n')
}

function parseNamedFuelSheets(
  wb: XLSX.WorkBook,
  sourceFileHint?: string
): EnechoWeeklyParseResult {
  const regularSheet = wb.Sheets['レギュラー']
  if (!regularSheet) {
    throw new Error('シートが見つかりません: レギュラー')
  }

  const regularRows = sheetToRows(regularSheet)
  const columnar = isColumnarTimeseriesSheet(regularRows)

  const extract = columnar
    ? extractColumnarSheetPrices
    : extractRowTimeseriesSheetPrices

  const regular = extract(regularSheet)
  const premium = (() => {
    try {
      return wb.Sheets['ハイオク'] ? extract(wb.Sheets['ハイオク']) : null
    } catch {
      return null
    }
  })()
  const diesel = (() => {
    try {
      return wb.Sheets['軽油'] ? extract(wb.Sheets['軽油']) : null
    } catch {
      return null
    }
  })()

  return mergeFuelSheets(
    regular,
    premium,
    diesel,
    columnar ? 'columnar' : 'row_timeseries',
    sourceFileHint
  )
}

/**
 * 対応形式:
 * - 資源エネルギー庁 *s5.xlsx（列=都道府県 / 行=調査日）
 * - 石油情報センター SekiyuWeekly（行=都道府県 / 列=調査日）
 * - 結果詳細版（1シート内にレギュラー列がある形式）
 */
export function parseEnechoWeeklyWorkbook(
  buffer: ArrayBuffer | Buffer,
  sourceFileHint?: string
): EnechoWeeklyParseResult {
  if (!buffer || (buffer as ArrayBuffer).byteLength === 0) {
    throw new Error('Excel ファイルが空です（ダウンロード失敗の可能性）')
  }

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  if (wb.SheetNames.includes('レギュラー')) {
    return parseNamedFuelSheets(wb, sourceFileHint)
  }

  const surveyDateFallback = guessSurveyDateFromHint(sourceFileHint)
  for (const name of wb.SheetNames) {
    const parsed = parseDetailSheet(wb.Sheets[name]!, surveyDateFallback)
    if (parsed) {
      return { ...parsed, sourceFileHint }
    }
  }

  throw new Error(
    `対応していない Excel 形式です。シート一覧:\n${describeWorkbook(wb)}\n` +
      `ヒント: 結果詳細版 (例: 260729.xlsx) ではなく週次累積の *s5.xlsx ` +
      `(例: 260729s5.xlsx) を指定してください。`
  )
}
