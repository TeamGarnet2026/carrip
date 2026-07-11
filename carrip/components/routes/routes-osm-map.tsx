'use client'

import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import { RoundTripLegend } from '@/components/maps/round-trip-legend'
import { getRouteColor } from '@/lib/maps/route-colors'
import {
  collectRoutePoints,
  getDefaultMapCenter,
  type LatLng,
} from '@/lib/maps/bounds'
import {
  isRoundTripRoute,
  isSameDepartureArrival,
  mapMarkerColor,
  mapMarkerLabel,
  ROUND_TRIP_OUTBOUND_COLOR,
  ROUND_TRIP_RETURN_COLOR,
  splitRoundTripPolyline,
} from '@/lib/maps/round-trip-display'
import type { RouteCandidate } from '@/lib/routes/types'

import 'leaflet/dist/leaflet.css'

type RoutesOsmMapProps = {
  routes: RouteCandidate[]
  selectedRouteId: string
  onSelectRoute: (routeId: string) => void
  originLabel?: string
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) return
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]))
    map.fitBounds(bounds, { padding: [48, 48] })
  }, [map, points])

  return null
}

function createLabeledIcon(label: string, backgroundColor: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:${backgroundColor};color:#fff;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
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
        <Polyline
          positions={legs.outbound.map((point) => [point.lat, point.lng])}
          pathOptions={{
            color: ROUND_TRIP_OUTBOUND_COLOR,
            weight: 7,
            opacity: 1,
          }}
          eventHandlers={{ click: () => onSelectRoute(route.id) }}
        />
        <Polyline
          positions={legs.returnLeg.map((point) => [point.lat, point.lng])}
          pathOptions={{
            color: ROUND_TRIP_RETURN_COLOR,
            weight: 7,
            opacity: 1,
            dashArray: '10 8',
          }}
          eventHandlers={{ click: () => onSelectRoute(route.id) }}
        />
      </>
    )
  }

  return (
    <Polyline
      positions={route.polyline.map((point) => [point.lat, point.lng])}
      pathOptions={{
        color,
        weight: isSelected ? 7 : 4,
        opacity: isSelected ? 1 : 0.45,
      }}
      eventHandlers={{ click: () => onSelectRoute(route.id) }}
    />
  )
}

export function RoutesOsmMap({
  routes,
  selectedRouteId,
  onSelectRoute,
  originLabel,
}: RoutesOsmMapProps) {
  const center = useMemo(() => getDefaultMapCenter(routes), [routes])
  const fitPoints = useMemo(() => collectRoutePoints(routes), [routes])
  const selectedRoute = routes.find((route) => route.id === selectedRouteId)
  const selectedRoundTrip =
    selectedRoute != null && isRoundTripRoute(selectedRoute)
  const sameDepartureArrival =
    selectedRoute != null && isSameDepartureArrival(selectedRoute.polyline)

  return (
    <div className="overflow-hidden rounded border border-neutral-200 dark:border-neutral-800">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={8}
        className="h-[380px] w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={fitPoints} />

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
            <Marker
              position={[
                selectedRoute.polyline[0].lat,
                selectedRoute.polyline[0].lng,
              ]}
              icon={createLabeledIcon(
                sameDepartureArrival
                  ? '発'
                  : mapMarkerLabel('departure'),
                mapMarkerColor('departure', true)
              )}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                {sameDepartureArrival
                  ? `${originLabel ?? '出発地'}（出発・帰着）`
                  : `${originLabel ?? '出発地'}（出発）`}
              </Tooltip>
            </Marker>
            {!sameDepartureArrival && (
              <Marker
                position={[
                  selectedRoute.polyline.at(-1)!.lat,
                  selectedRoute.polyline.at(-1)!.lng,
                ]}
                icon={createLabeledIcon(
                  mapMarkerLabel('arrival'),
                  mapMarkerColor('arrival', true)
                )}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  {originLabel ?? '出発地'}（帰着）
                </Tooltip>
              </Marker>
            )}
          </>
        )}

        {selectedRoute?.stops.map((stop, index) => (
          <Marker
            key={stop.place_id}
            position={[stop.lat, stop.lng]}
            icon={createLabeledIcon(
              mapMarkerLabel('stop', index),
              mapMarkerColor('stop', selectedRoundTrip)
            )}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              {selectedRoundTrip ? `行き ${index + 1}. ` : ''}
              {stop.name}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      <div className="flex flex-wrap gap-3 border-t border-neutral-200 px-3 py-2 dark:border-neutral-800">
        {routes.map((route, index) => {
          const color = getRouteColor(route.id, index)
          const isSelected = route.id === selectedRouteId

          return (
            <button
              key={route.id}
              type="button"
              onClick={() => onSelectRoute(route.id)}
              className={`flex items-center gap-2 rounded px-2 py-1 text-xs transition ${
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
        OpenStreetMap · 自動車ルート（NAVITIME）
        {originLabel ? ` · 出発: ${originLabel}` : ''}
        {selectedRoundTrip ? ' · 往復' : ''}
      </p>
    </div>
  )
}
