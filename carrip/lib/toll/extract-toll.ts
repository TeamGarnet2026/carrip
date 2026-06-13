type NavitimeFare = Record<string, number>

const ETC_FARE_KEY: Record<string, string> = {
  compact: 'unit_1025_1',
  kei: 'unit_1025_1',
  sedan: 'unit_1025_2',
  suv: 'unit_1025_3',
  minivan: 'unit_1025_4',
  custom: 'unit_1025_2',
}

const CASH_FARE_KEY: Record<string, string> = {
  compact: 'unit_1024_1',
  kei: 'unit_1024_1',
  sedan: 'unit_1024_2',
  suv: 'unit_1024_3',
  minivan: 'unit_1024_4',
  custom: 'unit_1024_2',
}

export function extractTollYen(
  fare: NavitimeFare | undefined,
  vehicleType: string,
  useEtc: boolean
): number {
  if (!fare) return 0

  const key = useEtc
    ? (ETC_FARE_KEY[vehicleType] ?? 'unit_1025_2')
    : (CASH_FARE_KEY[vehicleType] ?? 'unit_1024_2')

  return Math.round(fare[key] ?? fare['unit_1025_100'] ?? fare['unit_1024_100'] ?? 0)
}
