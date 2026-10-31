import type { Page } from '@playwright/test'

/** おすすめ・検索で返す固定の行き先（京都） */
export const KYOTO_PLACES = [
  { place_id: 'e2e-kinkakuji', name: '金閣寺', address: '日本、京都府京都市北区金閣寺町１', lat: 35.0394, lng: 135.7292, rating: 4.6, user_rating_count: 60000, category: 'tourist' },
  { place_id: 'e2e-fushimi', name: '伏見稲荷大社', address: '日本、京都府京都市伏見区深草藪之内町６８', lat: 34.9671, lng: 135.7727, rating: 4.6, user_rating_count: 70000, category: 'tourist' },
  { place_id: 'e2e-kiyomizu', name: '清水寺', address: '日本、京都府京都市東山区清水１丁目２９４', lat: 34.9949, lng: 135.785, rating: 4.5, user_rating_count: 50000, category: 'tourist' },
  { place_id: 'e2e-arashiyama', name: '嵐山 竹林の小径', address: '日本、京都府京都市右京区嵯峨天龍寺芒ノ馬場町', lat: 35.0170, lng: 135.6713, rating: 4.4, user_rating_count: 30000, category: 'tourist' },
  { place_id: 'e2e-ginkakuji', name: '銀閣寺', address: '日本、京都府京都市左京区銀閣寺町２', lat: 35.0270, lng: 135.7982, rating: 4.4, user_rating_count: 20000, category: 'tourist' },
]

/**
 * 外部 API を使う通信を固定の応答に差し替える。
 * - 行き先のおすすめ・検索 … KYOTO_PLACES
 * - ルート計算・再計算 … サーバーのスタブモード（?mode=stub）
 * - Google マップ・地図タイル … 読み込まない（テストでは地図の中身を見ない）
 */
export async function mockExternalApis(page: Page) {
  await page.route('**/api/pois/suggest**', (route) =>
    route.fulfill({
      json: { count: KYOTO_PLACES.length, places: KYOTO_PLACES, degraded: false },
    })
  )
  await page.route('**/api/pois/search**', (route) => {
    const q = new URL(route.request().url()).searchParams.get('q') ?? ''
    const places = KYOTO_PLACES.filter((place) => place.name.includes(q))
    return route.fulfill({ json: { count: places.length, places } })
  })
  for (const path of ['build', 'recalculate']) {
    await page.route(`**/api/routes/${path}`, (route) =>
      route.continue({ url: `${route.request().url()}?mode=stub` })
    )
  }
  await page.route(/maps\.googleapis\.com|maps\.gstatic\.com|tile\.openstreetmap\.org|basemaps\.cartocdn\.com/, (route) =>
    route.abort()
  )
}
