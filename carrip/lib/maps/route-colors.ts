// デザインの配色（深緑・青灰・からし色）に合わせる
export const ROUTE_COLORS: Record<string, string> = {
  'route-custom': '#2f4a3f',
  'route-1': '#7088a8',
  'route-2': '#c9a44c',
}

export function getRouteColor(routeId: string, index: number): string {
  return ROUTE_COLORS[routeId] ?? ['#9333ea', '#16a34a', '#2563eb'][index % 3]
}
