import { describe, it, expect } from 'vitest';
import { generateRouteRequestSchema } from '@/types/schemas';
import { ZodError } from 'zod';

// テスト用の有効な日付を生成
function getValidFutureDate(daysFromNow: number = 1): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

describe('ルート生成API - バリデーション', () => {
  describe('正常系テスト', () => {
    it('全必須パラメータが有効な場合、バリデーションが通る', () => {
      const validRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府', '大阪府'],
        departureDate: getValidFutureDate(10),
        tripDays: 2,
        numberOfPeople: 4,
        carType: {
          type: 'sedan',
        },
      };

      const result = generateRouteRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.departureLocation).toBe('東京都渋谷区');
        expect(result.data.numberOfPeople).toBe(4);
        expect(result.data.tripDays).toBe(2);
      }
    });

    it('カスタム燃費が指定された場合、バリデーションが通る', () => {
      const validRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: getValidFutureDate(10),
        tripDays: 1,
        numberOfPeople: 2,
        carType: {
          type: 'custom',
          fuelEfficiency: 15.5,
        },
      };

      const result = generateRouteRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.carType.fuelEfficiency).toBe(15.5);
      }
    });

    it('訪問都道府県が最大5件の場合、バリデーションが通る', () => {
      const validRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府', '大阪府', '兵庫県', '奈良県', '滋賀県'],
        departureDate: getValidFutureDate(10),
        tripDays: 3,
        numberOfPeople: 5,
        carType: {
          type: 'minivan',
        },
      };

      const result = generateRouteRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prefectures).toHaveLength(5);
      }
    });
  });

  describe('出発地のバリデーション（DR-INP-001）', () => {
    it('出発地が空の場合、エラーが返される', () => {
      const invalidRequest = {
        departureLocation: '',
        prefectures: ['京都府'],
        departureDate: getValidFutureDate(10),
        tripDays: 1,
        numberOfPeople: 2,
        carType: { type: 'sedan' },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('出発地');
      }
    });

    it('出発地が1文字以下の場合、エラーが返される', () => {
      const invalidRequest = {
        departureLocation: '東',
        prefectures: ['京都府'],
        departureDate: getValidFutureDate(10),
        tripDays: 1,
        numberOfPeople: 2,
        carType: { type: 'sedan' },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find((e) => e.path[0] === 'departureLocation');
        expect(error?.message).toContain('出発地を正しく入力してください');
      }
    });
  });

  describe('訪問都道府県のバリデーション', () => {
    it('訪問都道府県が未選択の場合、エラーDR-INP-002が返される', () => {
      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: [],
        departureDate: getValidFutureDate(10),
        tripDays: 1,
        numberOfPeople: 2,
        carType: { type: 'sedan' },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          '訪問する都道府県を1つ以上選択してください。'
        );
      }
    });

    it('訪問都道府県が6件以上の場合、エラーDR-INP-003が返される', () => {
      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府', '大阪府', '兵庫県', '奈良県', '滋賀県', '福井県'],
        departureDate: getValidFutureDate(10),
        tripDays: 3,
        numberOfPeople: 2,
        carType: { type: 'sedan' },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          '訪問都道府県は最大5件まで選択できます。'
        );
      }
    });
  });

  describe('出発日のバリデーション（DR-INP-004）', () => {
    it('出発日が過去の場合、エラーが返される', () => {
      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: '2020-01-01',
        tripDays: 1,
        numberOfPeople: 2,
        carType: { type: 'sedan' },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('出発日は今日から180日以内');
      }
    });

    it('出発日が本日の場合、エラーが返される', () => {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];

      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: dateString,
        tripDays: 1,
        numberOfPeople: 2,
        carType: { type: 'sedan' },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('出発日は今日から180日以内');
      }
    });

    it('出発日が181日以上先の場合、エラーが返される', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 181);
      const dateString = futureDate.toISOString().split('T')[0];

      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: dateString,
        tripDays: 1,
        numberOfPeople: 2,
        carType: { type: 'sedan' },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('出発日は今日から180日以内');
      }
    });
  });

  describe('旅行日数のバリデーション（DR-INP-006）', () => {
    it('旅行日数が0日の場合、エラーが返される', () => {
      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: getValidFutureDate(10),
        tripDays: 0,
        numberOfPeople: 2,
        carType: { type: 'sedan' },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('旅行日数は1〜3日で設定してください。');
      }
    });

    it('旅行日数が4日以上の場合、エラーが返される', () => {
      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: getValidFutureDate(10),
        tripDays: 4,
        numberOfPeople: 2,
        carType: { type: 'sedan' },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('旅行日数は1〜3日で設定してください。');
      }
    });
  });

  describe('人数のバリデーション（DR-INP-005）', () => {
    it('人数が0の場合、エラーが返される', () => {
      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: getValidFutureDate(10),
        tripDays: 1,
        numberOfPeople: 0,
        carType: { type: 'sedan' },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('人数は1〜10名で設定してください。');
      }
    });

    it('人数が11名以上の場合、エラーが返される', () => {
      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: getValidFutureDate(10),
        tripDays: 1,
        numberOfPeople: 11,
        carType: { type: 'sedan' },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('人数は1〜10名で設定してください。');
      }
    });
  });

  describe('車種のバリデーション（DR-INP-007）', () => {
    it('カスタム車種で燃費が指定されていない場合、エラーが返される', () => {
      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: getValidFutureDate(10),
        tripDays: 1,
        numberOfPeople: 2,
        carType: {
          type: 'custom',
          fuelEfficiency: undefined,
        },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('燃費は1〜200 km/L');
      }
    });

    it('カスタム車種で燃費が0の場合、エラーが返される', () => {
      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: getValidFutureDate(10),
        tripDays: 1,
        numberOfPeople: 2,
        carType: {
          type: 'custom',
          fuelEfficiency: 0,
        },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('燃費は1〜200 km/L の範囲で入力してください。');
      }
    });

    it('カスタム車種で燃費が200を超える場合、エラーが返される', () => {
      const invalidRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: getValidFutureDate(10),
        tripDays: 1,
        numberOfPeople: 2,
        carType: {
          type: 'custom',
          fuelEfficiency: 201,
        },
      };

      const result = generateRouteRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('燃費は1〜200 km/L の範囲で入力してください。');
      }
    });

    it('プリセット車種の場合、燃費を指定しなくても バリデーションが通る', () => {
      const validRequest = {
        departureLocation: '東京都渋谷区',
        prefectures: ['京都府'],
        departureDate: getValidFutureDate(10),
        tripDays: 1,
        numberOfPeople: 2,
        carType: {
          type: 'light_car',
        },
      };

      const result = generateRouteRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });
});
