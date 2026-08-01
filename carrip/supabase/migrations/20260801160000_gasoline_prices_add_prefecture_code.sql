-- 既存 gasoline_prices に prefecture_code が無い場合の追加
-- （Table Editor 等で作った旧スキーマ向け。空テーブル想定）

ALTER TABLE public.gasoline_prices
  ADD COLUMN IF NOT EXISTS prefecture_code char(2);

-- 既存行があれば名前からコードを埋める
UPDATE public.gasoline_prices SET prefecture_code = CASE prefecture_name
  WHEN '北海道' THEN '01'
  WHEN '青森県' THEN '02'
  WHEN '岩手県' THEN '03'
  WHEN '宮城県' THEN '04'
  WHEN '秋田県' THEN '05'
  WHEN '山形県' THEN '06'
  WHEN '福島県' THEN '07'
  WHEN '茨城県' THEN '08'
  WHEN '栃木県' THEN '09'
  WHEN '群馬県' THEN '10'
  WHEN '埼玉県' THEN '11'
  WHEN '千葉県' THEN '12'
  WHEN '東京都' THEN '13'
  WHEN '神奈川県' THEN '14'
  WHEN '新潟県' THEN '15'
  WHEN '富山県' THEN '16'
  WHEN '石川県' THEN '17'
  WHEN '福井県' THEN '18'
  WHEN '山梨県' THEN '19'
  WHEN '長野県' THEN '20'
  WHEN '岐阜県' THEN '21'
  WHEN '静岡県' THEN '22'
  WHEN '愛知県' THEN '23'
  WHEN '三重県' THEN '24'
  WHEN '滋賀県' THEN '25'
  WHEN '京都府' THEN '26'
  WHEN '大阪府' THEN '27'
  WHEN '兵庫県' THEN '28'
  WHEN '奈良県' THEN '29'
  WHEN '和歌山県' THEN '30'
  WHEN '鳥取県' THEN '31'
  WHEN '島根県' THEN '32'
  WHEN '岡山県' THEN '33'
  WHEN '広島県' THEN '34'
  WHEN '山口県' THEN '35'
  WHEN '徳島県' THEN '36'
  WHEN '香川県' THEN '37'
  WHEN '愛媛県' THEN '38'
  WHEN '高知県' THEN '39'
  WHEN '福岡県' THEN '40'
  WHEN '佐賀県' THEN '41'
  WHEN '長崎県' THEN '42'
  WHEN '熊本県' THEN '43'
  WHEN '大分県' THEN '44'
  WHEN '宮崎県' THEN '45'
  WHEN '鹿児島県' THEN '46'
  WHEN '沖縄県' THEN '47'
  ELSE prefecture_code
END
WHERE prefecture_code IS NULL;

ALTER TABLE public.gasoline_prices
  ALTER COLUMN prefecture_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gasoline_prices_prefecture_code_key'
  ) THEN
    ALTER TABLE public.gasoline_prices
      ADD CONSTRAINT gasoline_prices_prefecture_code_key UNIQUE (prefecture_code);
  END IF;
END $$;
