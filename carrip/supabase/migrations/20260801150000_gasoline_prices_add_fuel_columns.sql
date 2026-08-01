-- 既存テーブルが古い定義の場合に不足カラムを追加する
-- （CREATE TABLE IF NOT EXISTS では既存表の列は増えない）

CREATE TABLE IF NOT EXISTS public.gasoline_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefecture_code char(2) NOT NULL,
  prefecture_name text NOT NULL,
  regular_price numeric(6, 1) NOT NULL,
  premium_price numeric(6, 1),
  diesel_price numeric(6, 1),
  survey_date date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gasoline_prices_prefecture_code_key UNIQUE (prefecture_code)
);

CREATE TABLE IF NOT EXISTS public.gasoline_price_national (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  regular_price numeric(6, 1) NOT NULL,
  premium_price numeric(6, 1),
  diesel_price numeric(6, 1),
  survey_date date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gasoline_prices
  ADD COLUMN IF NOT EXISTS premium_price numeric(6, 1);

ALTER TABLE public.gasoline_prices
  ADD COLUMN IF NOT EXISTS diesel_price numeric(6, 1);

ALTER TABLE public.gasoline_prices
  ADD COLUMN IF NOT EXISTS survey_date date;

ALTER TABLE public.gasoline_prices
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.gasoline_price_national
  ADD COLUMN IF NOT EXISTS premium_price numeric(6, 1);

ALTER TABLE public.gasoline_price_national
  ADD COLUMN IF NOT EXISTS diesel_price numeric(6, 1);

ALTER TABLE public.gasoline_price_national
  ADD COLUMN IF NOT EXISTS survey_date date;

ALTER TABLE public.gasoline_price_national
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.gasoline_prices
SET survey_date = CURRENT_DATE
WHERE survey_date IS NULL;

UPDATE public.gasoline_price_national
SET survey_date = CURRENT_DATE
WHERE survey_date IS NULL;

UPDATE public.gasoline_prices
SET updated_at = now()
WHERE updated_at IS NULL;

UPDATE public.gasoline_price_national
SET updated_at = now()
WHERE updated_at IS NULL;

DO $$
BEGIN
  ALTER TABLE public.gasoline_prices
    ALTER COLUMN survey_date SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.gasoline_price_national
    ALTER COLUMN survey_date SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;
