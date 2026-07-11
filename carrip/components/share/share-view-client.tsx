'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { CostBreakdownPanel } from '@/components/route/cost-breakdown-panel'
import { OpenInGoogleMapsLink } from '@/components/maps/open-in-google-maps-link'
import type { CostBreakdown } from '@/lib/routes/types'

type ShareViewPageProps = {
  shortCode: string
}

type SharePayload = {
  trip: {
    origin: string
    prefecture: string[]
    departure_date: string
    days: number
    people: number
  } | null
  route: {
    total_distance_km: number | null
    total_duration_min: number | null
    total_cost: number | null
    cost_breakdown_json: CostBreakdown | null
  } | null
  stops: Array<{
    stop_order: number
    pois: {
      name: string
      lat: number
      lng: number
    } | null
  }>
}

export function ShareViewClient({ shortCode }: ShareViewPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SharePayload | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/share/${shortCode}`)
        const payload = await response.json()
        if (!response.ok) {
          setError(payload.error ?? '共有リンクを表示できません')
          return
        }
        setData(payload)
      } catch {
        setError('ネットワークエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [shortCode])

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        {loading && (
          <div className="flex justify-center py-16">
            <Spinner label="共有プランを読み込み中" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <Link href="/" className="mt-4 inline-block text-sm underline">
              トップへ戻る
            </Link>
          </div>
        )}

        {data?.trip && data.route && (
          <div className="space-y-6">
            <div>
              <Badge variant="info" label="共有プラン（閲覧のみ）" />
              <h1 className="mt-3 text-2xl font-bold">
                {data.trip.origin} → {data.trip.prefecture.join('、')}
              </h1>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                {data.trip.departure_date} 出発 · {data.trip.days}日間 ·{' '}
                {data.trip.people}人
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="総距離" value={`${data.route.total_distance_km ?? 0} km`} />
              <Stat
                label="所要時間"
                value={`${data.route.total_duration_min ?? 0} 分`}
              />
              <Stat
                label="総費用"
                value={`${(data.route.total_cost ?? 0).toLocaleString('ja-JP')}円`}
              />
            </div>

            {data.route.cost_breakdown_json && (
              <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <h2 className="mb-3 font-semibold">費用内訳</h2>
                <CostBreakdownPanel
                  breakdown={data.route.cost_breakdown_json}
                  people={data.trip.people}
                />
              </div>
            )}

            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <h2 className="mb-3 font-semibold">立ち寄り地点</h2>
              <ol className="space-y-1 text-sm">
                {data.stops.map((stop) => (
                  <li key={stop.stop_order}>
                    {stop.stop_order}. {stop.pois?.name ?? '地点'}
                  </li>
                ))}
              </ol>
              {data.trip && (
                <div className="mt-4">
                  <OpenInGoogleMapsLink
                    origin={data.trip.origin}
                    stops={data.stops
                      .map((stop) => stop.pois)
                      .filter(
                        (poi): poi is NonNullable<typeof poi> =>
                          poi != null &&
                          Number.isFinite(poi.lat) &&
                          Number.isFinite(poi.lng)
                      )
                      .map((poi) => ({
                        lat: poi.lat,
                        lng: poi.lng,
                        name: poi.name,
                      }))}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
