import { getRedis, isRedisConfigured } from '@/lib/redis/client';

/**
 * キャッシュからデータを取得
 *
 * Edge Runtime 対応のため Upstash Redis（REST）を利用する。
 * node-redis（'redis' パッケージ）は内部で node:crypto を読み込み
 * Edge Runtime で動作しないため使用しない。
 */
export async function getCacheData<T>(key: string): Promise<T | null> {
  if (!isRedisConfigured()) return null;

  try {
    // Upstash は保存値を自動で JSON パースして返す
    return await getRedis().get<T>(key);
  } catch (error) {
    console.error('キャッシュ取得エラー:', error);
    return null;
  }
}

/**
 * キャッシュにデータを保存（TTL付き）
 */
export async function setCacheData<T>(
  key: string,
  value: T,
  ttlSeconds: number = 86400 // デフォルト: 24時間
): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    // Upstash は値を自動で JSON シリアライズして保存する
    await getRedis().set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error('キャッシュ保存エラー:', error);
  }
}

/**
 * キャッシュを削除
 */
export async function deleteCacheData(key: string): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    await getRedis().del(key);
  } catch (error) {
    console.error('キャッシュ削除エラー:', error);
  }
}
