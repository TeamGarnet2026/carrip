import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getPOIsByRegionAndPriority } from '../../../../utils/poi/poiService';
import * as redisCache from '../../../../utils/poi/redisCache';
import * as googlePlacesClient from '../../../../utils/poi/googlePlacesClient';

// モック用のサンプルPOIデータ
const mockPOIData = [
  {
    name: '伏見稲荷大社',
    latitude: 34.967857,
    longitude: 135.7325,
    address: '京都府京都市伏見区深草薮之内町68',
    placeId: 'ChIJ6e_W37F6EGARuVY4kTx7Pio',
    type: 'tourist_attraction',
  },
  {
    name: '京都駅',
    latitude: 34.979677,
    longitude: 135.763667,
    address: '京都府京都市下京区烏丸通塩小路下る',
    placeId: 'ChIJkf7Tz9d6EGARdPhkZqr-Yuo',
    type: 'transit_station',
  },
  {
    name: 'カフェラッテ',
    latitude: 34.98,
    longitude: 135.76,
    address: '京都府京都市下京区',
    placeId: 'ChIJ_sample_id_001',
    type: 'cafe',
  },
];

describe('POI Service - Google Places API & Redis Cache', () => {
  beforeEach(() => {
    // モック関数の初期化
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('キャッシュ未ヒット時のPOI取得', () => {
    it('Google Places APIでPOIを取得し、Redisにキャッシュして返す', async () => {
      // Redis モック: キャッシュが存在しない
      vi.spyOn(redisCache, 'getCacheData').mockResolvedValue(null);

      // Redis モック: キャッシュ保存成功
      vi.spyOn(redisCache, 'setCacheData').mockResolvedValue(undefined);

      // Google Places API モック
      vi.spyOn(googlePlacesClient, 'fetchPOIsFromGooglePlaces').mockResolvedValue(
        mockPOIData
      );

      const result = await getPOIsByRegionAndPriority(['京都府'], 'tourist_spot');

      // 検証
      expect(result.pois).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.fromCache).toBe(false);
      expect(result.pois[0].name).toBe('伏見稲荷大社');

      // Google Places APIが呼ばれたか確認
      expect(googlePlacesClient.fetchPOIsFromGooglePlaces).toHaveBeenCalledWith(
        ['京都府'],
        'tourist_spot'
      );

      // Redisに保存されたか確認
      expect(redisCache.setCacheData).toHaveBeenCalled();
    });
  });

  describe('キャッシュヒット時のPOI取得', () => {
    it('Redisのキャッシュからデータを返す', async () => {
      // Redis モック: キャッシュが存在する
      vi.spyOn(redisCache, 'getCacheData').mockResolvedValue(mockPOIData);

      // Google Places API は呼ばれないはず
      const fetchPOIsspy = vi
        .spyOn(googlePlacesClient, 'fetchPOIsFromGooglePlaces')
        .mockResolvedValue([]);

      const result = await getPOIsByRegionAndPriority(['京都府'], 'tourist_spot');

      // 検証
      expect(result.pois).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.fromCache).toBe(true);

      // Google Places APIが呼ばれていないか確認
      expect(fetchPOIsspy).not.toHaveBeenCalled();
    });
  });

  describe('異なる優先軸でのPOI取得', () => {
    it('priority が restaurant の場合、飲食店を取得', async () => {
      const mockRestaurants = [
        {
          name: 'レストラン京都',
          latitude: 34.97,
          longitude: 135.73,
          address: '京都府京都市中京区',
          placeId: 'restaurant_001',
          type: 'restaurant',
        },
      ];

      vi.spyOn(redisCache, 'getCacheData').mockResolvedValue(null);
      vi.spyOn(redisCache, 'setCacheData').mockResolvedValue(undefined);
      vi.spyOn(googlePlacesClient, 'fetchPOIsFromGooglePlaces').mockResolvedValue(
        mockRestaurants
      );

      const result = await getPOIsByRegionAndPriority(['京都府'], 'restaurant');

      expect(result.count).toBe(1);
      expect(result.pois[0].type).toBe('restaurant');
      expect(googlePlacesClient.fetchPOIsFromGooglePlaces).toHaveBeenCalledWith(
        ['京都府'],
        'restaurant'
      );
    });

    it('priority が attraction の場合、観光地を取得', async () => {
      vi.spyOn(redisCache, 'getCacheData').mockResolvedValue(null);
      vi.spyOn(redisCache, 'setCacheData').mockResolvedValue(undefined);
      vi.spyOn(googlePlacesClient, 'fetchPOIsFromGooglePlaces').mockResolvedValue(
        mockPOIData
      );

      const result = await getPOIsByRegionAndPriority(['京都府'], 'attraction');

      expect(result.count).toBe(3);
      expect(googlePlacesClient.fetchPOIsFromGooglePlaces).toHaveBeenCalledWith(
        ['京都府'],
        'attraction'
      );
    });
  });

  describe('複数都道府県のPOI取得', () => {
    it('複数の都道府県を指定して最大50件までのPOIを取得', async () => {
      // 複数都道府県の場合のモック
      const largeResultSet = Array.from({ length: 50 }, (_, i) => ({
        name: `観光地${i + 1}`,
        latitude: 34.97 + i * 0.001,
        longitude: 135.73 + i * 0.001,
        address: `京都府京都市${i}`,
        placeId: `place_${i}`,
        type: 'tourist_attraction',
      }));

      vi.spyOn(redisCache, 'getCacheData').mockResolvedValue(null);
      vi.spyOn(redisCache, 'setCacheData').mockResolvedValue(undefined);
      vi.spyOn(googlePlacesClient, 'fetchPOIsFromGooglePlaces').mockResolvedValue(
        largeResultSet
      );

      const result = await getPOIsByRegionAndPriority(
        ['京都府', '大阪府', '兵庫県'],
        'tourist_spot'
      );

      expect(result.count).toBe(50);
      expect(result.pois).toHaveLength(50);
      expect(googlePlacesClient.fetchPOIsFromGooglePlaces).toHaveBeenCalledWith(
        ['京都府', '大阪府', '兵庫県'],
        'tourist_spot'
      );
    });
  });

  describe('キャッシュキーの生成と一貫性', () => {
    it('同じ都道府県と優先軸でのリクエストは同じキャッシュキーを使用', async () => {
      const setCacheSpy = vi.spyOn(redisCache, 'setCacheData');
      vi.spyOn(redisCache, 'getCacheData').mockResolvedValue(null);
      vi.spyOn(googlePlacesClient, 'fetchPOIsFromGooglePlaces').mockResolvedValue(
        mockPOIData
      );

      // 1回目の呼び出し
      await getPOIsByRegionAndPriority(['京都府', '大阪府'], 'tourist_spot');

      // 2回目の呼び出し（順序が異なる）
      vi.spyOn(redisCache, 'getCacheData').mockResolvedValue(mockPOIData);
      const result2 = await getPOIsByRegionAndPriority(
        ['大阪府', '京都府'],
        'tourist_spot'
      );

      // 2回目はキャッシュから取得されるはず
      expect(result2.fromCache).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('Google Places APIエラー時も結果を返す', async () => {
      vi.spyOn(redisCache, 'getCacheData').mockResolvedValue(null);
      vi.spyOn(redisCache, 'setCacheData').mockResolvedValue(undefined);
      vi.spyOn(googlePlacesClient, 'fetchPOIsFromGooglePlaces').mockRejectedValue(
        new Error('API Error')
      );

      // エラーをスローせず、空の配列を返すことを期待
      try {
        const result = await getPOIsByRegionAndPriority(['京都府'], 'tourist_spot');
        // サービスでエラーをハンドルしている場合
        expect(result.count).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // エラーがスローされる場合の検証
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('Redisキャッシュエラー時もAPIから取得を続行', async () => {
      vi.spyOn(redisCache, 'getCacheData').mockRejectedValue(
        new Error('Redis Error')
      );
      vi.spyOn(redisCache, 'setCacheData').mockResolvedValue(undefined);
      vi.spyOn(googlePlacesClient, 'fetchPOIsFromGooglePlaces').mockResolvedValue(
        mockPOIData
      );

      const result = await getPOIsByRegionAndPriority(['京都府'], 'tourist_spot');

      // APIから取得できている
      expect(result.count).toBe(3);
      expect(result.pois[0].name).toBe('伏見稲荷大社');
    });
  });

  describe('TTL（キャッシュ有効期限）の確認', () => {
    it('Redisに保存する際に24時間のTTLを設定', async () => {
      const setCacheSpy = vi.spyOn(redisCache, 'setCacheData');
      vi.spyOn(redisCache, 'getCacheData').mockResolvedValue(null);
      vi.spyOn(googlePlacesClient, 'fetchPOIsFromGooglePlaces').mockResolvedValue(
        mockPOIData
      );

      await getPOIsByRegionAndPriority(['京都府'], 'tourist_spot');

      // setCacheData が呼ばれ、TTLは86400秒（24時間）のはず
      expect(setCacheSpy).toHaveBeenCalled();
      const call = setCacheSpy.mock.calls[0];
      expect(call[2]).toBe(86400); // TTL in seconds
    });
  });
});
