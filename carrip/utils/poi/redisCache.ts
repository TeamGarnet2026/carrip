import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

/**
 * Redisクライアントをシングルトン で取得
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
  });

  await redisClient.connect();
  return redisClient;
}

/**
 * キャッシュからデータを取得
 */
export async function getCacheData<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
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
  try {
    const client = await getRedisClient();
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('キャッシュ保存エラー:', error);
  }
}

/**
 * キャッシュを削除
 */
export async function deleteCacheData(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error('キャッシュ削除エラー:', error);
  }
}

/**
 * Redisクライアントを切断
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
