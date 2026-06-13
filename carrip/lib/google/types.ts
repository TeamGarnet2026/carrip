export type PoiPlace = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  userRatingCount?: number
  priceRange?: {
    startPrice?: {
      currencyCode?: string
      units?: string
      nanos?: number
    }
    endPrice?: {
      currencyCode?: string
      units?: string
      nanos?: number
    }
  }
  priceLevel?: string
  category?: string
}

export type RouteMetrics = {
  distanceKm: number
  durationMin: number
}

export type GeminiRoutePlan = {
  id: string
  title: string
  summary: string
  stop_place_ids: string[]
}

export type GeminiRoutePlansResponse = {
  routes: GeminiRoutePlan[]
}
