/** 資源エネルギー庁 Excel の地域表記 → 都道府県名 */
export const PREFECTURE_CODE_BY_NAME: Record<string, string> = {
  北海道: '01',
  青森県: '02',
  岩手県: '03',
  宮城県: '04',
  秋田県: '05',
  山形県: '06',
  福島県: '07',
  茨城県: '08',
  栃木県: '09',
  群馬県: '10',
  埼玉県: '11',
  千葉県: '12',
  東京都: '13',
  神奈川県: '14',
  新潟県: '15',
  富山県: '16',
  石川県: '17',
  福井県: '18',
  山梨県: '19',
  長野県: '20',
  岐阜県: '21',
  静岡県: '22',
  愛知県: '23',
  三重県: '24',
  滋賀県: '25',
  京都府: '26',
  大阪府: '27',
  兵庫県: '28',
  奈良県: '29',
  和歌山県: '30',
  鳥取県: '31',
  島根県: '32',
  岡山県: '33',
  広島県: '34',
  山口県: '35',
  徳島県: '36',
  香川県: '37',
  愛媛県: '38',
  高知県: '39',
  福岡県: '40',
  佐賀県: '41',
  長崎県: '42',
  熊本県: '43',
  大分県: '44',
  宮崎県: '45',
  鹿児島県: '46',
  沖縄県: '47',
}

const LABEL_TO_PREFECTURE: Record<string, string> = {
  北海道: '北海道',
  青森: '青森県',
  岩手: '岩手県',
  宮城: '宮城県',
  秋田: '秋田県',
  山形: '山形県',
  福島: '福島県',
  茨城: '茨城県',
  栃木: '栃木県',
  群馬: '群馬県',
  埼玉: '埼玉県',
  千葉: '千葉県',
  東京: '東京都',
  神奈川: '神奈川県',
  新潟: '新潟県',
  富山: '富山県',
  石川: '石川県',
  福井: '福井県',
  山梨: '山梨県',
  長野: '長野県',
  岐阜: '岐阜県',
  静岡: '静岡県',
  愛知: '愛知県',
  三重: '三重県',
  滋賀: '滋賀県',
  京都: '京都府',
  大阪: '大阪府',
  兵庫: '兵庫県',
  奈良: '奈良県',
  和歌山: '和歌山県',
  鳥取: '鳥取県',
  島根: '島根県',
  岡山: '岡山県',
  広島: '広島県',
  山口: '山口県',
  徳島: '徳島県',
  香川: '香川県',
  愛媛: '愛媛県',
  高知: '高知県',
  福岡: '福岡県',
  佐賀: '佐賀県',
  長崎: '長崎県',
  熊本: '熊本県',
  大分: '大分県',
  宮崎: '宮崎県',
  鹿児島: '鹿児島県',
  沖縄: '沖縄県',
}

export function normalizeRegionLabel(raw: string): string {
  return String(raw).replace(/[\s\u3000]/g, '').trim()
}

/** 「京  都」→「京都府」。地方局平均・全国は null。北海道局/沖縄局は都道府県扱い */
export function toPrefectureName(rawLabel: string): string | null {
  const normalized = normalizeRegionLabel(rawLabel)
  if (!normalized || normalized === '全国') {
    return null
  }

  // 資源エネルギー庁 *s5.xlsx では北海道・沖縄が「◯◯局」表記
  if (normalized === '北海道局' || normalized === '北海道') {
    return '北海道'
  }
  if (normalized === '沖縄局' || normalized === '沖縄') {
    return '沖縄県'
  }

  if (normalized.includes('局')) {
    return null
  }

  return LABEL_TO_PREFECTURE[normalized] ?? null
}

export function isNationalLabel(rawLabel: string): boolean {
  return normalizeRegionLabel(rawLabel) === '全国'
}
