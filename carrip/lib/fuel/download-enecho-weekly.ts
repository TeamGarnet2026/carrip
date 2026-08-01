/**
 * 資源エネルギー庁 / 石油情報センターの週次 Excel URL を解決する。
 *
 * 優先順位:
 * 1. ENECHO_WEEKLY_EXCEL_URL（明示指定）
 * 2. 資源エネルギー庁 results.html から最新 *s5.xlsx
 * 3. 直近水曜の *s5.xlsx URL を推測して存在確認
 * 4. 石油情報センター累積週次 SekiyuWeekly.xls
 *
 * 注意: 結果詳細版 YYMMDD.xlsx はシート構成が異なる。
 * 都道府県別の週次累積は YYMMDDs5.xlsx を使う。
 */

export const DEFAULT_WEEKLY_EXCEL_URL =
  'https://oil-info.ieej.or.jp/price/data/SekiyuWeekly.xls'

export const DEFAULT_RESULTS_PAGE_URL =
  'https://oil-info.ieej.or.jp/price/price.html'

export const ENECHO_RESULTS_PAGE_URL =
  'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/results.html'

export const ENECHO_XLSX_BASE =
  'https://www.enecho.meti.go.jp/statistics/petroleum_and_lpgas/pl007/xlsx'

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; CarripFuelBot/1.0; +https://github.com/TeamGarnet2026/carrip)',
  Accept: '*/*',
}

function absolutize(href: string, baseUrl: string): string {
  return new URL(href, baseUrl).toString()
}

/** 現行の累積週次ファイルか（履歴アーカイブ SekiyuWeekly1990... は除外） */
export function isCurrentSekiyuWeeklyUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url)
    const file = pathname.split('/').pop() ?? ''
    return /^SekiyuWeekly\.xlsx?$/i.test(file)
  } catch {
    return false
  }
}

/**
 * 結果詳細版 (260729.xlsx) を週次累積 (260729s5.xlsx) に正規化する。
 * すでに *s5.xlsx や oil-info URL ならそのまま。
 */
export function normalizeEnechoExcelUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (!/enecho\.meti\.go\.jp$/i.test(parsed.hostname)) return url
    parsed.pathname = parsed.pathname.replace(
      /(\/xlsx\/\d{6})(?!s5)\.xlsx?$/i,
      '$1s5.xlsx'
    )
    return parsed.toString()
  } catch {
    return url
  }
}

export function extractExcelLinksFromHtml(
  html: string,
  pageUrl: string
): string[] {
  const links = new Set<string>()
  const re = /href\s*=\s*["']([^"']+\.xlsx?(?:\?[^"']*)?)["']/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) != null) {
    const href = match[1]
    if (!href) continue
    links.add(absolutize(href, pageUrl))
  }
  return [...links]
}

export function pickWeeklyExcelUrl(links: string[]): string | null {
  // 資源エネルギー庁の *s5.xlsx（週次累積）を優先
  const s5 = links
    .filter((url) => /\/xlsx\/\d{6}s5\.xlsx?$/i.test(url))
    .sort()
    .at(-1)
  if (s5) return s5

  const current = links.find(isCurrentSekiyuWeeklyUrl)
  if (current) return current
  return null
}

/** YYMMDD（例: 260729） */
export function formatYyMmDd(date: Date): string {
  const yy = String(date.getUTCFullYear()).slice(-2)
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

/**
 * 直近の水曜（JST 公表日想定）から遡って候補日を返す。
 * 祝日ずれに備え、前後の火〜木も含める。
 */
export function recentPublicationDateCandidates(
  now = new Date(),
  weeks = 4
): Date[] {
  const jst = new Date(now.getTime() + 9 * 3600_000)
  const candidates: Date[] = []

  for (let week = 0; week < weeks; week += 1) {
    // jst の曜日: 0=日 ... 3=水
    const day = jst.getUTCDay()
    const daysSinceWed = (day + 4) % 7 // 水=3 → 0
    const wed = new Date(
      Date.UTC(
        jst.getUTCFullYear(),
        jst.getUTCMonth(),
        jst.getUTCDate() - daysSinceWed - week * 7
      )
    )
    for (const offset of [0, -1, 1, -2, 2]) {
      const d = new Date(wed)
      d.setUTCDate(wed.getUTCDate() + offset)
      candidates.push(d)
    }
  }

  // 新しい順・重複除去
  const seen = new Set<string>()
  return candidates.filter((d) => {
    const key = formatYyMmDd(d)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildEnechoS5Url(yyMmDd: string): string {
  return `${ENECHO_XLSX_BASE}/${yyMmDd}s5.xlsx`
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { ...DEFAULT_HEADERS, Accept: 'text/html,*/*' },
      redirect: 'follow',
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

async function urlLooksLikeExcel(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, {
      method: 'HEAD',
      headers: DEFAULT_HEADERS,
      redirect: 'follow',
    })
    if (head.ok) {
      const len = Number(head.headers.get('content-length') ?? '0')
      if (len > 10_000) return true
      const type = head.headers.get('content-type') ?? ''
      if (/spreadsheet|excel|octet-stream/i.test(type)) return true
    }

    // HEAD が拒否される場合は小さな GET で確認
    const get = await fetch(url, {
      headers: { ...DEFAULT_HEADERS, Range: 'bytes=0-3' },
      redirect: 'follow',
    })
    if (!get.ok && get.status !== 206) return false
    const buf = Buffer.from(await get.arrayBuffer())
    // xlsx は ZIP (= PK), 旧 xls は D0 CF
    return (
      (buf[0] === 0x50 && buf[1] === 0x4b) ||
      (buf[0] === 0xd0 && buf[1] === 0xcf)
    )
  } catch {
    return false
  }
}

async function resolveFromEnechoResultsPage(): Promise<string | null> {
  const html = await fetchText(ENECHO_RESULTS_PAGE_URL)
  if (!html) return null
  return pickWeeklyExcelUrl(extractExcelLinksFromHtml(html, ENECHO_RESULTS_PAGE_URL))
}

async function resolveFromRecentS5Guess(): Promise<string | null> {
  for (const date of recentPublicationDateCandidates()) {
    const url = buildEnechoS5Url(formatYyMmDd(date))
    if (await urlLooksLikeExcel(url)) return url
  }
  return null
}

export async function resolveWeeklyExcelUrl(): Promise<string> {
  const explicit = process.env.ENECHO_WEEKLY_EXCEL_URL?.trim()
  if (explicit) return normalizeEnechoExcelUrl(explicit)

  const fromPage = await resolveFromEnechoResultsPage()
  if (fromPage) return normalizeEnechoExcelUrl(fromPage)

  const guessed = await resolveFromRecentS5Guess()
  if (guessed) return guessed

  return DEFAULT_WEEKLY_EXCEL_URL
}

export async function downloadWeeklyExcel(
  url?: string
): Promise<{ buffer: Buffer; url: string }> {
  const resolved = normalizeEnechoExcelUrl(
    url ?? (await resolveWeeklyExcelUrl())
  )
  const response = await fetch(resolved, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(
      `Excel のダウンロードに失敗しました (${response.status}): ${resolved}`
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // WAF の HTML チャレンジ等を早期検出
  if (
    buffer.byteLength < 1000 ||
    buffer.subarray(0, 15).toString('utf8').toLowerCase().includes('<!doctype')
  ) {
    throw new Error(
      `Excel ではなく HTML 等が返されました (${buffer.byteLength} bytes): ${resolved}`
    )
  }

  return { buffer, url: resolved }
}
