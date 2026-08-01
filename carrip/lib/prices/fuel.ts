import fallbackData from '@/data/fuel-prices-fallback.json'
import { createPublicSupabaseClient } from '@/lib/supabase/public-client'
import {
  FUEL_PRICE_YEN,
  type FuelType,
  type VehicleFuelInput,
  resolveFuelType,
} from '@/lib/routes/fuel'

export type FuelPriceSource =
  | 'enecho_db'
  | 'enecho_national'
  | 'government_api'
  | 'monthly_fallback'
  | 'fixed_fallback'

export type FuelPricesByType = Record<FuelType, number>

export type FuelPriceResult = {
  prefecture: string
  fuel_type: FuelType
  price_yen: number
  prices: FuelPricesByType
  source: FuelPriceSource
  degraded: boolean
  updated_at?: string
  survey_date?: string
}

/** 要件どおりの最終フォールバック単価（円/L） */
export const DEFAULT_FUEL_PRICE_YEN: FuelPricesByType = {
  regular: 175,
  diesel: 145,
  premium: 195,
}

type GovernmentApiResponse = {
  regular?: number
  diesel?: number
  premium?: number
  prices?: Partial<FuelPricesByType>
  updated_at?: string
}

function getGovernmentFuelApiUrl(): string | null {
  return process.env.GOVERNMENT_FUEL_API_URL?.trim() || null
}

function normalizePrices(
  raw: Partial<FuelPricesByType>
): FuelPricesByType | null {
  const regular = raw.regular
  const diesel = raw.diesel
  const premium = raw.premium

  if (
    typeof regular !== 'number' ||
    typeof diesel !== 'number' ||
    typeof premium !== 'number' ||
    !Number.isFinite(regular) ||
    !Number.isFinite(diesel) ||
    !Number.isFinite(premium)
  ) {
    return null
  }

  return { regular, diesel, premium }
}

function withDefaults(
  partial: Partial<FuelPricesByType>
): FuelPricesByType {
  return {
    regular: partial.regular ?? DEFAULT_FUEL_PRICE_YEN.regular,
    diesel: partial.diesel ?? DEFAULT_FUEL_PRICE_YEN.diesel,
    premium: partial.premium ?? DEFAULT_FUEL_PRICE_YEN.premium,
  }
}

async function fetchFromSupabase(
  prefecture: string
): Promise<{
  prices: FuelPricesByType
  source: Extract<FuelPriceSource, 'enecho_db' | 'enecho_national'>
  survey_date?: string
  updated_at?: string
} | null> {
  try {
    const supabase = createPublicSupabaseClient()
    if (!supabase) return null

    const { data: prefRow, error: prefError } = await supabase
      .from('gasoline_prices')
      .select(
        'regular_price, premium_price, diesel_price, survey_date, updated_at'
      )
      .eq('prefecture_name', prefecture)
      .maybeSingle()

    if (!prefError && prefRow?.regular_price != null) {
      return {
        prices: withDefaults({
          regular: Number(prefRow.regular_price),
          premium:
            prefRow.premium_price != null
              ? Number(prefRow.premium_price)
              : undefined,
          diesel:
            prefRow.diesel_price != null
              ? Number(prefRow.diesel_price)
              : undefined,
        }),
        source: 'enecho_db',
        survey_date: prefRow.survey_date ?? undefined,
        updated_at: prefRow.updated_at ?? undefined,
      }
    }

    const { data: national, error: nationalError } = await supabase
      .from('gasoline_price_national')
      .select(
        'regular_price, premium_price, diesel_price, survey_date, updated_at'
      )
      .eq('id', 1)
      .maybeSingle()

    if (!nationalError && national?.regular_price != null) {
      return {
        prices: withDefaults({
          regular: Number(national.regular_price),
          premium:
            national.premium_price != null
              ? Number(national.premium_price)
              : undefined,
          diesel:
            national.diesel_price != null
              ? Number(national.diesel_price)
              : undefined,
        }),
        source: 'enecho_national',
        survey_date: national.survey_date ?? undefined,
        updated_at: national.updated_at ?? undefined,
      }
    }
  } catch (error) {
    console.warn('Supabase fuel price lookup failed:', error)
  }

  return null
}

async function fetchFromGovernmentApi(
  prefecture: string
): Promise<{ prices: FuelPricesByType; updated_at?: string } | null> {
  const baseUrl = getGovernmentFuelApiUrl()
  if (!baseUrl) return null

  const url = new URL(baseUrl)
  url.searchParams.set('prefecture', prefecture)

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!response.ok) {
    throw new Error(`政府API エラー (${response.status})`)
  }

  const data = (await response.json()) as GovernmentApiResponse
  const prices = normalizePrices({
    regular: data.prices?.regular ?? data.regular,
    diesel: data.prices?.diesel ?? data.diesel,
    premium: data.prices?.premium ?? data.premium,
  })

  if (!prices) {
    throw new Error('政府API から有効な燃料単価が取得できませんでした')
  }

  return { prices, updated_at: data.updated_at }
}

function loadMonthlyFallback(prefecture: string): {
  prices: FuelPricesByType
  updated_at?: string
} {
  const prefecturePrices =
    fallbackData.prefectures[
      prefecture as keyof typeof fallbackData.prefectures
    ] ?? fallbackData.national_average

  const prices = normalizePrices(prefecturePrices)
  if (!prices) {
    return {
      prices: { ...FUEL_PRICE_YEN },
      updated_at: fallbackData.updated_at,
    }
  }

  return {
    prices,
    updated_at: fallbackData.updated_at,
  }
}

/**
 * 単価解決の優先順位:
 * 1. Supabase（都道府県）
 * 2. Supabase（全国平均）
 * 3. GOVERNMENT_FUEL_API_URL（任意の独自API）
 * 4. 月次 JSON フォールバック
 * 5. 固定値（レギュラー 175 円など）
 */
export async function resolveFuelPricesWithFallback(
  prefecture: string
): Promise<Omit<FuelPriceResult, 'fuel_type' | 'price_yen'>> {
  const fromDb = await fetchFromSupabase(prefecture)
  if (fromDb) {
    return {
      prefecture,
      prices: fromDb.prices,
      source: fromDb.source,
      degraded: fromDb.source === 'enecho_national',
      updated_at: fromDb.updated_at,
      survey_date: fromDb.survey_date,
    }
  }

  const apiConfigured = Boolean(getGovernmentFuelApiUrl())
  if (apiConfigured) {
    try {
      const fromApi = await fetchFromGovernmentApi(prefecture)
      if (fromApi) {
        return {
          prefecture,
          prices: fromApi.prices,
          source: 'government_api',
          degraded: false,
          updated_at: fromApi.updated_at,
        }
      }
    } catch (error) {
      console.warn('Government fuel API failed, using monthly fallback:', error)
    }
  }

  try {
    const monthly = loadMonthlyFallback(prefecture)
    return {
      prefecture,
      prices: monthly.prices,
      source: 'monthly_fallback',
      degraded: true,
      updated_at: monthly.updated_at,
    }
  } catch (error) {
    console.warn('Monthly fuel fallback failed, using fixed defaults:', error)
  }

  return {
    prefecture,
    prices: { ...DEFAULT_FUEL_PRICE_YEN },
    source: 'fixed_fallback',
    degraded: true,
  }
}

export async function resolveFuelPriceForVehicle(
  prefecture: string,
  vehicle: VehicleFuelInput
): Promise<FuelPriceResult> {
  const fuelType = resolveFuelType(vehicle)
  const resolved = await resolveFuelPricesWithFallback(prefecture)

  return {
    ...resolved,
    fuel_type: fuelType,
    price_yen: resolved.prices[fuelType],
  }
}
