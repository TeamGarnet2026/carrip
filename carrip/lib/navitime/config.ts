export function isNavitimeConfigured(): boolean {
  return Boolean(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_HOST)
}

export function getNavitimeConfig(): { apiKey: string; host: string } {
  const apiKey = process.env.RAPIDAPI_KEY
  const host = process.env.RAPIDAPI_HOST

  if (!apiKey || !host) {
    throw new Error('RAPIDAPI_KEY / RAPIDAPI_HOST が未設定です')
  }

  return { apiKey, host }
}

export type NavitimeRouteCondition =
  | 'recommend'
  | 'toll_time'
  | 'toll_distance'
  | 'free_time'
  | 'free_only'

export function conditionForRouteVariant(routeId: string): NavitimeRouteCondition {
  switch (routeId) {
    case 'route-1':
      return 'toll_distance'
    case 'route-2':
      return 'toll_time'
    case 'route-3':
      return 'toll_time'
    default:
      return 'recommend'
  }
}
