'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  GoogleMap,
  PolylineF,
  useJsApiLoader,
  type Libraries,
} from '@react-google-maps/api'
import { GoogleAdvancedMarker } from '@/components/maps/google-advanced-marker'
import { RoundTripLegend } from '@/components/maps/round-trip-legend'
import { getRouteColor } from '@/lib/maps/route-colors'
import { getGoogleMapsApiKey } from '@/lib/google/maps-key'
import {
  isRoundTripRoute,
  isSameDepartureArrival,
  mapMarkerColor,
  mapMarkerLabel,
  buildRoundTripStopLegs,
  roundTripStopNumber,
  roundTripStopTitlePrefix,
  ROUND_TRIP_OUTBOUND_COLOR,
  ROUND_TRIP_RETURN_COLOR,
  splitRoundTripPolyline,
} from '@/lib/maps/round-trip-display'
import type { RouteCandidate } from '@/lib/routes/types'

type MapsHealthHint = {
  message: string
  fix_steps: string[]
}

type RoutesGoogleMapProps = {
  routes: RouteCandidate[]
  selectedRouteId: string
  onSelectRoute: (routeId: string) => void
  originLabel?: string
  onAuthFailure?: () => void
  compact?: boolean
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '380px' }
const COMPACT_MAP_CONTAINER_STYLE = { width: '100%', height: '220px' }

// 毎回新しい配列を渡すとローダーが再読み込みの警告を出すため、定数にしておく
const MAPS_LIBRARIES: Libraries = ['marker']

/**
 * AdvancedMarkerElement には Map ID が必要。
 * 未設定なら Google が用意している試用の DEMO_MAP_ID を使う（本番では専用の ID を設定する）
 */
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'

function buildBounds(routes: RouteCandidate[]): google.maps.LatLngBounds | undefined {
  if (typeof google === 'undefined') return undefined

  const bounds = new google.maps.LatLngBounds()
  let hasPoint = false

  for (const route of routes) {
    for (const point of route.polyline) {
      bounds.extend({ lat: point.lat, lng: point.lng })
      hasPoint = true
    }
    for (const stop of route.stops) {
      bounds.extend({ lat: stop.lat, lng: stop.lng })
      hasPoint = true
    }
  }

  return hasPoint ? bounds : undefined
}

function RoutePolylines({
  route,
  index,
  isSelected,
  onSelectRoute,
}: {
  route: RouteCandidate
  index: number
  isSelected: boolean
  onSelectRoute: (routeId: string) => void
}) {
  const color = getRouteColor(route.id, index)
  const roundTrip = isSelected && isRoundTripRoute(route)
  const legs = roundTrip ? splitRoundTripPolyline(route.polyline, route.stops) : null

  if (route.polyline.length < 2) return null

  if (legs) {
    return (
      <>
        <PolylineF
          path={legs.outbound}
          options={{
            strokeColor: ROUND_TRIP_OUTBOUND_COLOR,
            strokeOpacity: 1,
            strokeWeight: 7,
            zIndex: 3,
            clickable: true,
          }}
          onClick={() => onSelectRoute(route.id)}
        />
        <PolylineF
          path={legs.returnLeg}
          options={{
            strokeColor: ROUND_TRIP_RETURN_COLOR,
            strokeOpacity: 0.9,
            strokeWeight: 7,
            zIndex: 3,
            clickable: true,
          }}
          onClick={() => onSelectRoute(route.id)}
        />
      </>
    )
  }

  return (
    <PolylineF
      path={route.polyline}
      options={{
        strokeColor: color,
        strokeOpacity: isSelected ? 1 : 0.45,
        strokeWeight: isSelected ? 7 : 4,
        zIndex: isSelected ? 3 : 1,
        clickable: true,
      }}
      onClick={() => onSelectRoute(route.id)}
    />
  )
}

export function RoutesGoogleMap({
  routes,
  selectedRouteId,
  onSelectRoute,
  originLabel,
  onAuthFailure,
  compact = false,
}: RoutesGoogleMapProps) {
  const apiKey = getGoogleMapsApiKey()
  const [healthHint, setHealthHint] = useState<MapsHealthHint | null>(null)

  useEffect(() => {
    if (!onAuthFailure) return

    const previousHandler = window.gm_authFailure
    window.gm_authFailure = () => {
      previousHandler?.()
      onAuthFailure()
    }

    return () => {
      window.gm_authFailure = previousHandler
    }
  }, [onAuthFailure])

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: MAPS_LIBRARIES,
  })

  useEffect(() => {
    if (!loadError) return

    onAuthFailure?.()

    fetch('/api/health/google-maps')
      .then((response) => response.json())
      .then((data) => {
        if (data.fix_steps?.length) {
          setHealthHint({
            message: data.message ?? 'Maps JavaScript API を利用できません',
            fix_steps: data.fix_steps,
          })
        }
      })
      .catch(() => {
        setHealthHint(null)
      })
  }, [loadError, onAuthFailure])

  const defaultCenter = useMemo(() => {
    const first = routes[0]?.polyline[0] ?? routes[0]?.stops[0]
    return first ? { lat: first.lat, lng: first.lng } : { lat: 35.0116, lng: 135.7681 }
  }, [routes])

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      const bounds = buildBounds(routes)
      if (bounds) {
        map.fitBounds(bounds, 48)
      }
    },
    [routes]
  )

  if (!apiKey) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-lg border border-dashed border-neutral-300 px-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
        GOOGLE_CLOUD_API_KEY を .env.local に設定してください
        （Maps JavaScript API を有効化し、キーの API 制限に含めてください）
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-lg border border-red-200 px-4 text-center text-sm text-red-600 dark:border-red-900 dark:text-red-400">
        <div className="max-w-lg text-left">
          <p className="font-medium text-center">Google マップを表示できません</p>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            <strong>ApiTargetBlockedMapError</strong>
            ：API キーが Maps JavaScript API の利用を許可されていません。
            Places API だけ有効でも地図は表示できません。
          </p>
          {healthHint ? (
            <div className="mt-3 space-y-2 text-xs text-neutral-700 dark:text-neutral-300">
              <p>{healthHint.message}</p>
              <ol className="list-decimal space-y-1 pl-4">
                {healthHint.fix_steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ) : (
            <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-neutral-600 dark:text-neutral-400">
              <li>
                <a
                  className="underline"
                  href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Maps JavaScript API
                </a>
                を有効化
              </li>
              <li>
                認証情報 → API キー →「API の制限」に Maps JavaScript API を追加
              </li>
              <li>
                「アプリケーションの制限」→ HTTP リファラー に{' '}
                <code className="text-[11px]">http://localhost:3000/*</code>{' '}
                を追加
              </li>
            </ol>
          )}
          <p className="mt-3 text-center text-[11px] text-neutral-500">
            診断:{' '}
            <a className="underline" href="/api/health/google-maps" target="_blank" rel="noreferrer">
              /api/health/google-maps
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700">
        地図を読み込み中…
      </div>
    )
  }

  const selectedRoute = routes.find((route) => route.id === selectedRouteId)
  const selectedRoundTrip =
    selectedRoute != null && isRoundTripRoute(selectedRoute)
  const sameDepartureArrival =
    selectedRoute != null && isSameDepartureArrival(selectedRoute.polyline)
  const stopLegs =
    selectedRoute && selectedRoundTrip
      ? buildRoundTripStopLegs(selectedRoute.polyline, selectedRoute.stops)
      : []

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <GoogleMap
        mapContainerStyle={compact ? COMPACT_MAP_CONTAINER_STYLE : MAP_CONTAINER_STYLE}
        center={defaultCenter}
        zoom={8}
        onLoad={onMapLoad}
        options={{
          mapId: MAP_ID,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {routes.map((route, index) => (
          <RoutePolylines
            key={route.id}
            route={route}
            index={index}
            isSelected={route.id === selectedRouteId}
            onSelectRoute={onSelectRoute}
          />
        ))}

        {selectedRoute && selectedRoundTrip && selectedRoute.polyline.length > 0 && (
          <>
            <GoogleAdvancedMarker
              position={selectedRoute.polyline[0]}
              color={mapMarkerColor('departure', true)}
              label={sameDepartureArrival ? '発' : mapMarkerLabel('departure')}
              title={
                sameDepartureArrival
                  ? `${originLabel ?? '出発地'}（出発・帰着）`
                  : `${originLabel ?? '出発地'}（出発）`
              }
            />
            {!sameDepartureArrival && (
              <GoogleAdvancedMarker
                position={selectedRoute.polyline.at(-1)!}
                color={mapMarkerColor('arrival', true)}
                label={mapMarkerLabel('arrival')}
                title={`${originLabel ?? '出発地'}（帰着）`}
              />
            )}
          </>
        )}

        {selectedRoute?.stops.map((stop, index) => (
          <GoogleAdvancedMarker
            key={stop.place_id}
            position={{ lat: stop.lat, lng: stop.lng }}
            color={mapMarkerColor('stop', selectedRoundTrip, stopLegs[index])}
            label={
              selectedRoundTrip
                ? String(roundTripStopNumber(stopLegs, index))
                : mapMarkerLabel('stop', index)
            }
            title={
              selectedRoundTrip
                ? `${roundTripStopTitlePrefix(stopLegs, index)}${stop.name}`
                : stop.name
            }
          />
        ))}
      </GoogleMap>

      {!compact && (
        <>
        <div className="flex flex-wrap gap-3 border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
          {routes.map((route, index) => {
            const color = getRouteColor(route.id, index)
            const isSelected = route.id === selectedRouteId

            return (
              <button
                key={route.id}
                type="button"
                onClick={() => onSelectRoute(route.id)}
                className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition ${
                  isSelected
                    ? 'bg-neutral-100 font-medium dark:bg-neutral-800'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span
                  className="inline-block h-2 w-6 rounded-full"
                  style={{ backgroundColor: color }}
                />
                案{index + 1}: {route.title}
              </button>
            )
          })}
        </div>

        {selectedRoundTrip && (
          <div className="border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
            <RoundTripLegend />
          </div>
        )}

        <p className="border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-800">
          Google マップ · 自動車ルート（NAVITIME）
          {originLabel ? ` · 出発: ${originLabel}` : ''}
          {selectedRoundTrip ? ' · 往復' : ''}
        </p>
        </>
      )}
    </div>
  )
}
