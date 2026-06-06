/** ルート検索キャッシュの TTL（秒）。デフォルト 7 日（要件の POI / 距離フォールバックと同じ） */
export const ROUTE_CACHE_TTL_SECONDS = Number(
  process.env.ROUTE_CACHE_TTL_SECONDS ?? 60 * 60 * 24 * 7
)

export const ROUTE_CACHE_KEY_PREFIX = 'routes:search:'
