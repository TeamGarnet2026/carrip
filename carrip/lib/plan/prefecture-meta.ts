export type RegionId =
  | 'hokkaido'
  | 'tohoku'
  | 'kanto'
  | 'chubu'
  | 'kansai'
  | 'chugoku_shikoku'
  | 'kyushu'
  | 'okinawa'

export type PrefectureMeta = {
  lat: number
  lng: number
  region: RegionId
}

export const REGIONS: Array<{ id: RegionId; label: string; prefectures: string[] }> = [
  { id: 'hokkaido', label: '北海道', prefectures: ['北海道'] },
  {
    id: 'tohoku',
    label: '東北',
    prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  },
  {
    id: 'kanto',
    label: '関東',
    prefectures: [
      '茨城県',
      '栃木県',
      '群馬県',
      '埼玉県',
      '千葉県',
      '東京都',
      '神奈川県',
    ],
  },
  {
    id: 'chubu',
    label: '中部',
    prefectures: [
      '新潟県',
      '富山県',
      '石川県',
      '福井県',
      '山梨県',
      '長野県',
      '岐阜県',
      '静岡県',
      '愛知県',
      '三重県',
    ],
  },
  {
    id: 'kansai',
    label: '関西',
    prefectures: ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  },
  {
    id: 'chugoku_shikoku',
    label: '中国・四国',
    prefectures: [
      '鳥取県',
      '島根県',
      '岡山県',
      '広島県',
      '山口県',
      '徳島県',
      '香川県',
      '愛媛県',
      '高知県',
    ],
  },
  {
    id: 'kyushu',
    label: '九州',
    prefectures: [
      '福岡県',
      '佐賀県',
      '長崎県',
      '熊本県',
      '大分県',
      '宮崎県',
      '鹿児島県',
    ],
  },
  { id: 'okinawa', label: '沖縄', prefectures: ['沖縄県'] },
]

/** 都道府県庁所在地付近の座標（地図マーカー用） */
export const PREFECTURE_META: Record<string, PrefectureMeta> = {
  北海道: { lat: 43.0642, lng: 141.3469, region: 'hokkaido' },
  青森県: { lat: 40.8244, lng: 140.74, region: 'tohoku' },
  岩手県: { lat: 39.7036, lng: 141.1527, region: 'tohoku' },
  宮城県: { lat: 38.2682, lng: 140.8694, region: 'tohoku' },
  秋田県: { lat: 39.7186, lng: 140.1023, region: 'tohoku' },
  山形県: { lat: 38.2404, lng: 140.3633, region: 'tohoku' },
  福島県: { lat: 37.7503, lng: 140.4676, region: 'tohoku' },
  茨城県: { lat: 36.3418, lng: 140.4468, region: 'kanto' },
  栃木県: { lat: 36.5657, lng: 139.8836, region: 'kanto' },
  群馬県: { lat: 36.3911, lng: 139.0608, region: 'kanto' },
  埼玉県: { lat: 35.8569, lng: 139.6489, region: 'kanto' },
  千葉県: { lat: 35.6074, lng: 140.1065, region: 'kanto' },
  東京都: { lat: 35.6762, lng: 139.6503, region: 'kanto' },
  神奈川県: { lat: 35.4478, lng: 139.6425, region: 'kanto' },
  新潟県: { lat: 37.9026, lng: 139.0232, region: 'chubu' },
  富山県: { lat: 36.6953, lng: 137.2113, region: 'chubu' },
  石川県: { lat: 36.5947, lng: 136.6256, region: 'chubu' },
  福井県: { lat: 36.0652, lng: 136.2216, region: 'chubu' },
  山梨県: { lat: 35.6642, lng: 138.5685, region: 'chubu' },
  長野県: { lat: 36.6513, lng: 138.181, region: 'chubu' },
  岐阜県: { lat: 35.3912, lng: 136.7223, region: 'chubu' },
  静岡県: { lat: 34.9769, lng: 138.3831, region: 'chubu' },
  愛知県: { lat: 35.1802, lng: 136.9066, region: 'chubu' },
  三重県: { lat: 34.7303, lng: 136.5086, region: 'chubu' },
  滋賀県: { lat: 35.0045, lng: 135.8686, region: 'kansai' },
  京都府: { lat: 35.0211, lng: 135.7556, region: 'kansai' },
  大阪府: { lat: 34.6937, lng: 135.5023, region: 'kansai' },
  兵庫県: { lat: 34.6913, lng: 135.183, region: 'kansai' },
  奈良県: { lat: 34.6851, lng: 135.8048, region: 'kansai' },
  和歌山県: { lat: 34.2261, lng: 135.1675, region: 'kansai' },
  鳥取県: { lat: 35.5039, lng: 134.2377, region: 'chugoku_shikoku' },
  島根県: { lat: 35.4723, lng: 133.0505, region: 'chugoku_shikoku' },
  岡山県: { lat: 34.6618, lng: 133.9344, region: 'chugoku_shikoku' },
  広島県: { lat: 34.3963, lng: 132.4596, region: 'chugoku_shikoku' },
  山口県: { lat: 34.1858, lng: 131.4706, region: 'chugoku_shikoku' },
  徳島県: { lat: 34.0658, lng: 134.5593, region: 'chugoku_shikoku' },
  香川県: { lat: 34.3401, lng: 134.0434, region: 'chugoku_shikoku' },
  愛媛県: { lat: 33.8416, lng: 132.7657, region: 'chugoku_shikoku' },
  高知県: { lat: 33.5597, lng: 133.5311, region: 'chugoku_shikoku' },
  福岡県: { lat: 33.6064, lng: 130.4183, region: 'kyushu' },
  佐賀県: { lat: 33.2494, lng: 130.2988, region: 'kyushu' },
  長崎県: { lat: 32.7448, lng: 129.8737, region: 'kyushu' },
  熊本県: { lat: 32.7898, lng: 130.7417, region: 'kyushu' },
  大分県: { lat: 33.2382, lng: 131.6126, region: 'kyushu' },
  宮崎県: { lat: 31.9111, lng: 131.4239, region: 'kyushu' },
  鹿児島県: { lat: 31.5602, lng: 130.5581, region: 'kyushu' },
  沖縄県: { lat: 26.2124, lng: 127.6809, region: 'okinawa' },
}

export function regionForPrefecture(prefecture: string): RegionId | undefined {
  return PREFECTURE_META[prefecture]?.region
}

export function prefecturesInRegion(regionId: RegionId | null): string[] {
  if (!regionId) return Object.keys(PREFECTURE_META)
  return REGIONS.find((region) => region.id === regionId)?.prefectures ?? []
}
