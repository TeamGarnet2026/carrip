import fallbackData from '@/data/fuel-prices-fallback.json'
import {
  FUEL_PRICE_YEN,
  type FuelType,
  type VehicleFuelInput,
  resolveFuelType,
} from '@/lib/routes/fuel'

export type FuelPriceSource =
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

function normalizePrices(raw: Partial<FuelPricesByType>): FuelPricesByType | null {
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

export async function resolveFuelPricesWithFallback(
  prefecture: string
): Promise<Omit<FuelPriceResult, 'fuel_type' | 'price_yen'>> {
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

  const monthly = loadMonthlyFallback(prefecture)
  return {
    prefecture,
    prices: monthly.prices,
    source: 'monthly_fallback',
    degraded: apiConfigured,
    updated_at: monthly.updated_at,
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
