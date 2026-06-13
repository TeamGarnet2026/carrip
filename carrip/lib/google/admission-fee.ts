export type Money = {
  currencyCode?: string
  units?: string
  nanos?: number
}

export type PriceRange = {
  startPrice?: Money
  endPrice?: Money
}

export type AdmissionPriceInput = {
  priceRange?: PriceRange | null
  priceLevel?: string | null
}

export function moneyToYen(money: Money | undefined): number | null {
  if (!money?.currencyCode || money.currencyCode !== 'JPY') return null

  const units = Number(money.units ?? 0)
  if (!Number.isFinite(units)) return null

  const nanos = (money.nanos ?? 0) / 1_000_000_000
  const amount = units + nanos
  if (amount < 0) return null

  return Math.round(amount)
}

export function parseAdmissionFeeFromPlace(input: AdmissionPriceInput): number {
  const fromRange = moneyToYen(input.priceRange?.startPrice)
  if (fromRange != null) return fromRange

  if (input.priceLevel === 'PRICE_LEVEL_FREE') return 0

  return 0
}

export function needsAdmissionDetailsFetch(input: AdmissionPriceInput): boolean {
  if (input.priceRange?.startPrice) return false
  if (input.priceLevel === 'PRICE_LEVEL_FREE') return false
  if (
    input.priceLevel &&
    input.priceLevel !== 'PRICE_LEVEL_UNSPECIFIED'
  ) {
    return false
  }

  return true
}

export function calculateTotalAdmissionCost(
  admissionFeesPerPerson: number[],
  people: number
): number {
  if (people <= 0) return 0

  return admissionFeesPerPerson.reduce(
    (total, feePerPerson) => total + feePerPerson * people,
    0
  )
}
