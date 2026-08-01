-- 資源エネルギー庁（石油製品価格調査）由来の都道府県別ガソリン価格
CREATE TABLE IF NOT EXISTS public.gasoline_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefecture_code char(2) NOT NULL,
  prefecture_name text NOT NULL,
  regular_price numeric(6, 1) NOT NULL,
  premium_price numeric(6, 1),
  diesel_price numeric(6, 1),
  survey_date date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gasoline_prices_prefecture_code_key UNIQUE (prefecture_code)
);

CREATE INDEX IF NOT EXISTS gasoline_prices_survey_date_idx
  ON public.gasoline_prices (survey_date DESC);

COMMENT ON TABLE public.gasoline_prices IS
  '給油所小売価格調査（週次）の都道府県別価格。バッチで UPSERT 更新。';

-- 全国平均（都道府県データ欠落時のフォールバック）
CREATE TABLE IF NOT EXISTS public.gasoline_price_national (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  regular_price numeric(6, 1) NOT NULL,
  premium_price numeric(6, 1),
  diesel_price numeric(6, 1),
  survey_date date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gasoline_price_national IS
  '給油所小売価格調査の全国平均。1行のみ。';

ALTER TABLE public.gasoline_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gasoline_price_national ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gasoline_prices_select_all" ON public.gasoline_prices;
CREATE POLICY "gasoline_prices_select_all"
  ON public.gasoline_prices
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "gasoline_price_national_select_all" ON public.gasoline_price_national;
CREATE POLICY "gasoline_price_national_select_all"
  ON public.gasoline_price_national
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 書き込みは service_role のみ（RLS をバイパス）
