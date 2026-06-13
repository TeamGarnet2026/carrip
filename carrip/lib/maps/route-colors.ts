export const ROUTE_COLORS: Record<string, string> = {
  'route-1': '#16a34a',
  'route-2': '#2563eb',
  'route-3': '#9333ea',
}

export function getRouteColor(routeId: string, index: number): string {
  return ROUTE_COLORS[routeId] ?? ['#16a34a', '#2563eb', '#9333ea'][index % 3]
}
