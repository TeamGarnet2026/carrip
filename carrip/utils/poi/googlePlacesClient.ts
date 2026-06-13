/**
 * Google Places APIで特定エリア内のPOI候補を取得
 */

export interface POILocation {
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  type: string;
}

/**
 * 都道府県から地理的な中心座標と検索半径を取得
 */
function getPrefectureCoordinates(prefecture: string): {
  latitude: number;
  longitude: number;
  radiusMeters: number;
} {
  const prefectureMap: Record<
    string,
    { latitude: number; longitude: number; radiusMeters: number }
  > = {
    北海道: { latitude: 43.2632, longitude: 142.8633, radiusMeters: 150000 },
    青森県: { latitude: 40.8244, longitude: 140.7469, radiusMeters: 100000 },
    岩手県: { latitude: 39.6917, longitude: 141.1532, radiusMeters: 100000 },
    宮城県: { latitude: 38.2688, longitude: 140.8721, radiusMeters: 100000 },
    秋田県: { latitude: 39.7181, longitude: 140.1026, radiusMeters: 100000 },
    山形県: { latitude: 38.2405, longitude: 140.3731, radiusMeters: 100000 },
    福島県: { latitude: 37.5206, longitude: 140.4667, radiusMeters: 100000 },
    茨城県: { latitude: 36.3406, longitude: 140.4469, radiusMeters: 100000 },
    栃木県: { latitude: 36.5653, longitude: 139.8855, radiusMeters: 100000 },
    群馬県: { latitude: 36.7394, longitude: 139.0529, radiusMeters: 100000 },
    埼玉県: { latitude: 35.8617, longitude: 139.6455, radiusMeters: 80000 },
    千葉県: { latitude: 35.6054, longitude: 140.1233, radiusMeters: 100000 },
    東京都: { latitude: 35.6762, longitude: 139.6503, radiusMeters: 80000 },
    神奈川県: { latitude: 35.5308, longitude: 139.6955, radiusMeters: 80000 },
    新潟県: { latitude: 37.9185, longitude: 139.0355, radiusMeters: 120000 },
    富山県: { latitude: 36.6952, longitude: 137.2113, radiusMeters: 90000 },
    石川県: { latitude: 36.5944, longitude: 136.6256, radiusMeters: 90000 },
    福井県: { latitude: 36.0642, longitude: 136.2262, radiusMeters: 80000 },
    山梨県: { latitude: 35.6641, longitude: 138.5678, radiusMeters: 100000 },
    長野県: { latitude: 36.7313, longitude: 138.1808, radiusMeters: 120000 },
    岐阜県: { latitude: 35.3911, longitude: 136.7261, radiusMeters: 100000 },
    静岡県: { latitude: 34.7764, longitude: 137.7834, radiusMeters: 120000 },
    愛知県: { latitude: 35.1815, longitude: 136.9066, radiusMeters: 100000 },
    三重県: { latitude: 34.506, longitude: 136.2125, radiusMeters: 100000 },
    滋賀県: { latitude: 35.0084, longitude: 135.8674, radiusMeters: 80000 },
    京都府: { latitude: 35.0116, longitude: 135.7681, radiusMeters: 90000 },
    大阪府: { latitude: 34.6937, longitude: 135.5023, radiusMeters: 90000 },
    兵庫県: { latitude: 34.8622, longitude: 135.0942, radiusMeters: 120000 },
    奈良県: { latitude: 34.3353, longitude: 135.8050, radiusMeters: 100000 },
    和歌山県: { latitude: 33.9439, longitude: 135.2029, radiusMeters: 100000 },
    鳥取県: { latitude: 35.5034, longitude: 134.2343, radiusMeters: 100000 },
    島根県: { latitude: 35.4725, longitude: 132.5541, radiusMeters: 110000 },
    岡山県: { latitude: 34.6639, longitude: 133.9342, radiusMeters: 100000 },
    広島県: { latitude: 34.3996, longitude: 132.4596, radiusMeters: 100000 },
    山口県: { latitude: 34.1863, longitude: 131.4704, radiusMeters: 120000 },
    徳島県: { latitude: 34.0661, longitude: 134.6091, radiusMeters: 100000 },
    香川県: { latitude: 34.3396, longitude: 134.0433, radiusMeters: 80000 },
    愛媛県: { latitude: 33.9419, longitude: 132.7671, radiusMeters: 110000 },
    高知県: { latitude: 33.5904, longitude: 133.3331, radiusMeters: 110000 },
    福岡県: { latitude: 33.5904, longitude: 130.4017, radiusMeters: 110000 },
    佐賀県: { latitude: 33.2654, longitude: 130.2995, radiusMeters: 100000 },
    長崎県: { latitude: 32.7503, longitude: 129.8777, radiusMeters: 120000 },
    熊本県: { latitude: 32.8027, longitude: 130.7077, radiusMeters: 120000 },
    大分県: { latitude: 33.2381, longitude: 131.6126, radiusMeters: 100000 },
    宮崎県: { latitude: 32.1107, longitude: 131.4235, radiusMeters: 110000 },
    鹿児島県: { latitude: 31.5604, longitude: 130.5571, radiusMeters: 120000 },
    沖縄県: { latitude: 26.2126, longitude: 127.6809, radiusMeters: 120000 },
  };

  return (
    prefectureMap[prefecture] || {
      latitude: 35.6762,
      longitude: 139.6503,
      radiusMeters: 100000,
    }
  );
}

/**
 * Google Places API Nearby Search を呼び出し
 */
export async function fetchPOIsFromGooglePlaces(
  prefectures: string[],
  priority: 'tourist_spot' | 'restaurant' | 'attraction' = 'tourist_spot'
): Promise<POILocation[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error('Google Places API キーが設定されていません');
  }

  const typeMap: Record<string, string> = {
    tourist_spot: 'tourist_attraction',
    restaurant: 'restaurant',
    attraction: 'point_of_interest',
  };

  const searchType = typeMap[priority] || 'point_of_interest';
  const allPOIs: POILocation[] = [];

  for (const prefecture of prefectures) {
    const { latitude, longitude, radiusMeters } =
      getPrefectureCoordinates(prefecture);

    try {
      const url = new URL(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
      );
      url.searchParams.set('location', `${latitude},${longitude}`);
      url.searchParams.set('radius', radiusMeters.toString());
      url.searchParams.set('type', searchType);
      url.searchParams.set('key', apiKey);
      url.searchParams.set('language', 'ja');

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.results) {
        const prefecturePOIs = data.results.map(
          (place: {
            name: string;
            geometry: { location: { lat: number; lng: number } };
            formatted_address: string;
            place_id: string;
            types: string[];
          }) => ({
            name: place.name,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            address: place.formatted_address,
            placeId: place.place_id,
            type: place.types[0] || 'point_of_interest',
          })
        );

        allPOIs.push(...prefecturePOIs);
      }

      // API呼び出しのレート制限対策
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`${prefecture} のPOI取得エラー:`, error);
    }
  }

  // 最大50件に制限
  return allPOIs.slice(0, 50);
}
