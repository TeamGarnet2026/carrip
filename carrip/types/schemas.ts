import { z } from 'zod';

// ルート生成API用のバリデーションスキーマ
export const generateRouteRequestSchema = z.object({
  departureLocation: z
    .string()
    .min(1, { message: '出発地を入力してください。' })
    .refine(
      (location) => {
        // Google Places でも認識される住所形式かチェック
        // 最低限、全角・半角の住所表記を許可
        return location.length >= 2;
      },
      { message: '出発地を正しく入力してください。住所候補から選択してください。' }
    ),

  prefectures: z
    .array(z.string())
    .min(1, { message: '訪問する都道府県を1つ以上選択してください。' })
    .max(5, { message: '訪問都道府県は最大5件まで選択できます。' }),

  departureDate: z
    .string()
    .or(z.date())
    .refine(
      (date) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 180);

        return d >= tomorrow && d <= maxDate;
      },
      { message: '出発日は今日から180日以内で設定してください。' }
    ),

  tripDays: z
    .number()
    .int()
    .min(1, { message: '旅行日数は1〜3日で設定してください。' })
    .max(3, { message: '旅行日数は1〜3日で設定してください。' }),

  numberOfPeople: z
    .number()
    .int()
    .min(1, { message: '人数は1〜10名で設定してください。' })
    .max(10, { message: '人数は1〜10名で設定してください。' }),

  carType: z.object({
    type: z.enum([
      'light_car',
      'small_car',
      'sedan',
      'minivan',
      'suv',
      'large_suv',
      'ev',
      'custom',
    ]),
    fuelEfficiency: z.number().optional(),
  }).refine(
    (carType) => {
      // carType が custom の場合、fuelEfficiency が必須かつ1～200の範囲内
      if (carType.type === 'custom') {
        return (
          carType.fuelEfficiency !== undefined &&
          carType.fuelEfficiency >= 1 &&
          carType.fuelEfficiency <= 200
        );
      }
      return true;
    },
    { message: '燃費は1〜200 km/L の範囲で入力してください。' }
  ),
});

export type GenerateRouteRequest = z.infer<typeof generateRouteRequestSchema>;

// POI取得API用のバリデーションスキーマ
export const poiRequestSchema = z.object({
  prefectures: z
    .array(z.string())
    .min(1, { message: '訪問する都道府県を1つ以上選択してください。' })
    .max(5, { message: '訪問都道府県は最大5件まで選択できます。' }),

  priority: z
    .enum(['tourist_spot', 'restaurant', 'attraction'])
    .default('tourist_spot'),
});

export type POIRequest = z.infer<typeof poiRequestSchema>;
