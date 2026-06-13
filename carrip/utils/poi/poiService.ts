import {
  fetchPOIsFromGooglePlaces,
  POILocation,
} from './googlePlacesClient';
import { getCacheData, setCacheData } from './redisCache';

/**
 * POI取得結果
 */
export interface POIResult {
  pois: POILocation[];
  count: number;
  cachedAt?: string;
  fromCache: boolean;
}

/**
 * キャッシュキーを生成
 */
function generateCacheKey(
  prefectures: string[],
  priority: 'tourist_spot' | 'restaurant' | 'attraction'
): string {
  const sortedPrefectures = [...prefectures].sort().join(',');
  return `poi:${sortedPrefectures}:${priority}`;
}

/**
 * 全国・優先軸に応じたPOIを取得（キャッシュ付き）
 */
export async function getPOIsByRegionAndPriority(
  prefectures: string[],
  priority: 'tourist_spot' | 'restaurant' | 'attraction' = 'tourist_spot'
): Promise<POIResult> {
  const cacheKey = generateCacheKey(prefectures, priority);

  // キャッシュから取得を試みる
  try {
    const cachedPOIs = await getCacheData<POILocation[]>(cacheKey);
    if (cachedPOIs && cachedPOIs.length > 0) {
      return {
        pois: cachedPOIs,
        count: cachedPOIs.length,
        fromCache: true,
      };
    }
  } catch (error) {
    console.error('キャッシュ取得エラー:', error);
    // キャッシュ失敗時はAPIから取得を続行
  }

  // APIからPOIを取得
  const pois = await fetchPOIsFromGooglePlaces(prefectures, priority);

  // 結果をRedisにキャッシュ（24時間TTL）
  if (pois.length > 0) {
    try {
      await setCacheData(cacheKey, pois, 86400); // 24時間
    } catch (error) {
      console.error('キャッシュ保存エラー:', error);
      // キャッシュ失敗しても結果は返す
    }
  }

  return {
    pois,
    count: pois.length,
    cachedAt: new Date().toISOString(),
    fromCache: false,
  };
}
