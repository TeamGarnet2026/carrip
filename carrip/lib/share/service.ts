import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type DbClient = SupabaseClient<Database>

function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function createShareForRoute(
  supabase: DbClient,
  routeId: string,
  userId: string,
  baseUrl: string
) {
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .select('id, trip_id')
    .eq('id', routeId)
    .maybeSingle()

  if (routeError) {
    throw new Error(routeError.message)
  }

  if (!route?.trip_id) {
    return null
  }

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('owner_id')
    .eq('id', route.trip_id)
    .maybeSingle()

  if (tripError) {
    throw new Error(tripError.message)
  }

  if (!trip || trip.owner_id !== userId) {
    return null
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: existing } = await supabase
    .from('shares')
    .select('*')
    .eq('route_id', routeId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return {
      short_code: existing.short_code,
      share_url: `${baseUrl}/share/${existing.short_code}`,
      expires_at: existing.expires_at,
    }
  }

  let shortCode = generateShortCode()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from('shares')
      .insert({
        route_id: routeId,
        short_code: shortCode,
        expires_at: expiresAt.toISOString(),
        created_by: userId,
      })
      .select('*')
      .single()

    if (!error && data) {
      return {
        short_code: data.short_code,
        share_url: `${baseUrl}/share/${data.short_code}`,
        expires_at: data.expires_at,
      }
    }

    shortCode = generateShortCode()
  }

  throw new Error('共有URLの生成に失敗しました')
}

export async function getShareByShortCode(
  supabase: DbClient,
  shortCode: string
) {
  const { data: share, error } = await supabase
    .from('shares')
    .select('*')
    .eq('short_code', shortCode)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!share) {
    return { status: 'not_found' as const }
  }

  if (new Date(share.expires_at) < new Date()) {
    return { status: 'expired' as const, share }
  }

  const { data: route, error: routeError } = await supabase
    .from('routes')
    .select('*')
    .eq('id', share.route_id)
    .maybeSingle()

  if (routeError) {
    throw new Error(routeError.message)
  }

  const { data: stops, error: stopsError } = await supabase
    .from('route_stops')
    .select(
      `
      stop_order,
      stay_minutes,
      parking_cost,
      admission_fee,
      pois (
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
    .eq('route_id', share.route_id)
    .order('stop_order', { ascending: true })

  if (stopsError) {
    throw new Error(stopsError.message)
  }

  const { data: tripRow } = await supabase
    .from('routes')
    .select('trip_id')
    .eq('id', share.route_id)
    .maybeSingle()

  let trip = null
  if (tripRow?.trip_id) {
    const { data } = await supabase
      .from('trips')
      .select('origin, prefecture, departure_date, days, people')
      .eq('id', tripRow.trip_id)
      .maybeSingle()
    trip = data
  }

  return {
    status: 'ok' as const,
    share,
    route,
    stops: stops ?? [],
    trip,
  }
}
