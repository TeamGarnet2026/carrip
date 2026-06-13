import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import type { CreateTripInput } from '@/lib/trips/schema'

type DbClient = SupabaseClient<Database>

async function upsertPoi(
  supabase: DbClient,
  stop: CreateTripInput['route']['stops'][number],
  prefecture: string | undefined
) {
  const { data: existing } = await supabase
    .from('pois')
    .select('id')
    .eq('google_place_id', stop.place_id)
    .maybeSingle()

  if (existing?.id) {
    return existing.id
  }

  const { data, error } = await supabase
    .from('pois')
    .insert({
      google_place_id: stop.place_id,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      prefecture: prefecture ?? null,
      category: 'tourist',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'POI の保存に失敗しました')
  }

  return data.id
}

export async function createTripForUser(
  supabase: DbClient,
  userId: string,
  input: CreateTripInput
) {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      owner_id: userId,
      origin: input.origin,
      prefecture: input.prefecture,
      departure_date: input.departure_date,
      days: input.days,
      people: input.people,
      vehicle_json: input.vehicle,
      last_accessed_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (tripError || !trip) {
    throw new Error(tripError?.message ?? '旅行プランの保存に失敗しました')
  }

  const { data: route, error: routeError } = await supabase
    .from('routes')
    .insert({
      trip_id: trip.id,
      total_distance_km: input.route.total_distance_km,
      total_duration_min: input.route.total_duration_min,
      total_cost: input.route.total_cost,
      cost_breakdown_json: input.route.cost_breakdown,
    })
    .select('*')
    .single()

  if (routeError || !route) {
    throw new Error(routeError?.message ?? 'ルートの保存に失敗しました')
  }

  const prefecture = input.prefecture[0]
  const stopRows = []

  for (const [index, stop] of input.route.stops.entries()) {
    const poiId = await upsertPoi(supabase, stop, prefecture)
    stopRows.push({
      route_id: route.id,
      poi_id: poiId,
      stop_order: index + 1,
      stay_minutes: 60,
      parking_cost:
        Math.round(input.route.cost_breakdown.parking / input.route.stops.length) ||
        null,
      admission_fee: null,
    })
  }

  const { error: stopsError } = await supabase.from('route_stops').insert(stopRows)
  if (stopsError) {
    throw new Error(stopsError.message)
  }

  return {
    trip,
    route,
    stop_count: stopRows.length,
  }
}

export async function listTripsForUser(supabase: DbClient, userId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('owner_id', userId)
    .order('last_accessed_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function getTripDetailForUser(
  supabase: DbClient,
  userId: string,
  tripId: string
) {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('owner_id', userId)
    .maybeSingle()

  if (tripError) {
    throw new Error(tripError.message)
  }
  if (!trip) {
    return null
  }

  const { data: routes, error: routesError } = await supabase
    .from('routes')
    .select('*')
    .eq('trip_id', trip.id)
    .order('created_at', { ascending: true })

  if (routesError) {
    throw new Error(routesError.message)
  }

  const routeDetails = []

  for (const route of routes ?? []) {
    const { data: stops, error: stopsError } = await supabase
      .from('route_stops')
      .select(
        `
        id,
        stop_order,
        stay_minutes,
        parking_cost,
        admission_fee,
        pois (
          id,
          google_place_id,
          name,
          lat,
          lng,
          prefecture,
          category,
          rating
        )
      `
      )
      .eq('route_id', route.id)
      .order('stop_order', { ascending: true })

    if (stopsError) {
      throw new Error(stopsError.message)
    }

    routeDetails.push({
      ...route,
      stops: stops ?? [],
    })
  }

  await supabase
    .from('trips')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', trip.id)

  return {
    trip,
    routes: routeDetails,
  }
}
