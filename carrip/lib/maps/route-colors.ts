export const ROUTE_COLORS: Record<string, string> = {
  'route-custom': '#9333ea',
  'route-1': '#16a34a',
  'route-2': '#2563eb',
}

export function getRouteColor(routeId: string, index: number): string {
  return ROUTE_COLORS[routeId] ?? ['#9333ea', '#16a34a', '#2563eb'][index % 3]
}
