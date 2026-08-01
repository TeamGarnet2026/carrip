/**
 * 資源エネルギー庁系の週次ガソリン価格 Excel を取得し Supabase に UPSERT する。
 *
 * 使い方:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run fuel:sync
 *
 * 最新の週次累積 Excel（*s5.xlsx）を使う場合:
 *   ENECHO_WEEKLY_EXCEL_URL=https://www.enecho.meti.go.jp/.../xlsx/260729s5.xlsx npm run fuel:sync
 * （結果詳細版の 260729.xlsx を渡しても自動で *s5.xlsx に正規化します）
 */

import { createClient } from '@supabase/supabase-js'
import { downloadWeeklyExcel } from '../../lib/fuel/download-enecho-weekly'
import { parseEnechoWeeklyWorkbook } from '../../lib/fuel/parse-enecho-weekly'

async function main() {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL（または NEXT_PUBLIC_SUPABASE_URL）と SUPABASE_SERVICE_ROLE_KEY が必要です'
    )
  }

  const { buffer, url } = await downloadWeeklyExcel()
  if (process.env.ENECHO_WEEKLY_EXCEL_URL?.trim() && url !== process.env.ENECHO_WEEKLY_EXCEL_URL.trim()) {
    console.log(
      `Normalized URL: ${process.env.ENECHO_WEEKLY_EXCEL_URL.trim()} → ${url}`
    )
  }
  console.log(`Downloaded: ${url} (${buffer.byteLength} bytes)`)

  if (buffer.byteLength < 1000) {
    throw new Error(
      `ダウンロード結果が小さすぎます（${buffer.byteLength} bytes）。URL やアクセス制限を確認してください: ${url}`
    )
  }

  let parsed
  try {
    parsed = parseEnechoWeeklyWorkbook(buffer, url)
  } catch (error) {
    console.error('Parse failed. First bytes (hex):', buffer.subarray(0, 16).toString('hex'))
    throw error
  }

  console.log(
    `Parsed format=${parsed.format} survey_date=${parsed.surveyDate} prefectures=${parsed.rows.length} national=${parsed.national?.regular ?? 'n/a'}`
  )

  const ageDays =
    (Date.now() - new Date(`${parsed.surveyDate}T00:00:00Z`).getTime()) /
    86400000
  if (ageDays > 21) {
    console.warn(
      `警告: 調査日が ${Math.floor(ageDays)} 日前です。ENECHO_WEEKLY_EXCEL_URL に最新の詳細版 Excel を指定してください。`
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const upsertRows = parsed.rows.map((row) => ({
    prefecture_code: row.prefectureCode,
    prefecture_name: row.prefectureName,
    regular_price: row.regular,
    premium_price: row.premium,
    diesel_price: row.diesel,
    survey_date: row.surveyDate,
    updated_at: new Date().toISOString(),
  }))

  const { error: prefError } = await supabase
    .from('gasoline_prices')
    .upsert(upsertRows, { onConflict: 'prefecture_code' })

  if (prefError) {
    throw new Error(`gasoline_prices UPSERT 失敗: ${prefError.message}`)
  }

  if (parsed.national) {
    const { error: nationalError } = await supabase
      .from('gasoline_price_national')
      .upsert(
        {
          id: 1,
          regular_price: parsed.national.regular,
          premium_price: parsed.national.premium,
          diesel_price: parsed.national.diesel,
          survey_date: parsed.surveyDate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (nationalError) {
      throw new Error(
        `gasoline_price_national UPSERT 失敗: ${nationalError.message}`
      )
    }
  }

  console.log('UPSERT completed successfully')
  console.log('→ /test-fuel で source が enecho_db になることを確認してください')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
