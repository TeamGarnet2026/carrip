'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { CostBar, COST_ITEMS } from '@/components/route/cost-bar'
import { ItineraryList } from '@/components/route/itinerary-list'
import { Button } from '@/components/ui/button'
import { ExternalIcon } from '@/components/ui/icons'
import { Spinner } from '@/components/ui/spinner'
import {
  formatDuration,
  formatJapaneseDate,
  formatTripLength,
  formatYen,
} from '@/lib/format'
import { buildGoogleMapsDirectionsUrl } from '@/lib/maps/google-maps-directions-url'
import { planDisplayName } from '@/lib/plan/display-name'
import type { CostBreakdown, RouteStop } from '@/lib/routes/types'

type ShareViewPageProps = {
  shortCode: string
}

type SharePayload = {
  share?: { expires_at?: string }
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
    stay_minutes?: number | null
    parking_cost?: number | null
    admission_fee?: number | null
    pois: {
      google_place_id?: string
      name: string
      lat: number
      lng: number
      category?: string | null
    } | null
  }>
}

function subscribeToNothing() {
  return () => {}
}

/** 共有リンクから開く旅程（PC_04 / SP_09）。ログインなしで見られる */
export function ShareViewClient({ shortCode }: ShareViewPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SharePayload | null>(null)
  const [copied, setCopied] = useState(false)
  const pageUrl = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.href,
    () => ''
  )

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

  const stops = useMemo<RouteStop[]>(
    () =>
      (data?.stops ?? [])
        .filter((stop) => stop.pois != null)
        .map((stop) => ({
          place_id: stop.pois!.google_place_id ?? `stop-${stop.stop_order}`,
          name: stop.pois!.name,
          address: '',
          lat: stop.pois!.lat,
          lng: stop.pois!.lng,
          category: stop.pois!.category ?? undefined,
          stay_minutes: stop.stay_minutes ?? undefined,
          parking_yen: stop.parking_cost ?? undefined,
          admission_yen_per_person: stop.admission_fee ?? undefined,
        })),
    [data]
  )

  async function handleCopy() {
    if (!pageUrl) return
    await navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function handleLineShare() {
    if (!pageUrl) return
    const text = encodeURIComponent(`Carripで旅行プランを共有します\n${pageUrl}`)
    window.open(`https://line.me/R/msg/text/?${text}`, '_blank')
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <Spinner size="lg" label="共有プランを読み込み中" />
        </div>
      </AppShell>
    )
  }

  if (error || !data?.trip || !data.route) {
    return (
      <AppShell variant="center">
        <div className="carrip-panel p-8 text-center">
          <h1 className="m-0 text-2xl font-bold">旅程を表示できません</h1>
          <p className="mt-3 mb-0 text-ink-soft">{error ?? '共有リンクが見つかりません。'}</p>
          <Link href="/" className="mt-6 inline-block">
            <Button variant="secondary">トップへ戻る</Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const { trip, route } = data
  const totalCost = route.total_cost ?? 0
  const perPerson = Math.round(totalCost / Math.max(1, trip.people))
  const name = planDisplayName(trip.prefecture, trip.days)
  const touristCount = stops.filter((stop) => !stop.category?.match(/area|convenience/)).length
  const directions = buildGoogleMapsDirectionsUrl({
    origin: trip.origin,
    stops: stops.map((stop) => ({ lat: stop.lat, lng: stop.lng, name: stop.name })),
  })
  const qrUrl = pageUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(pageUrl)}`
    : null
  const expires = data.share?.expires_at
    ? formatJapaneseDate(data.share.expires_at.slice(0, 10)).replace(/（.）$/, '')
    : null

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <div className="hidden h-[360px] grid-cols-[2fr_1fr] gap-3 md:grid" aria-hidden>
          <span className="carrip-photo h-full" />
          <span className="grid grid-rows-2 gap-3">
            <span className="carrip-photo bg-photo-2" />
            <span className="carrip-photo bg-photo-4" />
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-6">
            <div>
              <p className="m-0 text-[13px] text-muted">
                {formatJapaneseDate(trip.departure_date)} · {formatTripLength(trip.days)} ·{' '}
                {trip.people}人
              </p>
              <h1 className="mt-2 mb-0 text-[28px] leading-tight font-bold md:text-[36px]">
                {name}
              </h1>
              <p className="mt-3 mb-0 text-[15px] text-ink-soft">
                {trip.origin}を出発し、{touristCount}か所に立ち寄ります。
              </p>
            </div>

            <dl className="m-0 grid grid-cols-2 border-y border-ink md:grid-cols-4">
              {[
                ['1人あたり', formatYen(perPerson), true],
                ['総費用', formatYen(totalCost), false],
                ['走行', `${route.total_distance_km ?? 0} km`, false],
                ['運転時間', formatDuration(route.total_duration_min ?? 0), false],
              ].map(([label, value, strong], index) => (
                <div
                  key={label as string}
                  className={`py-5 ${index % 2 === 1 ? 'pl-5' : ''} md:pl-5 ${
                    index > 0 ? 'md:border-l md:border-line' : 'md:pl-0'
                  } ${index >= 2 ? 'border-t border-line md:border-t-0' : ''}`}
                >
                  <dt className="text-[13px] text-muted">{label}</dt>
                  <dd
                    className={`m-0 mt-2 font-semibold tabular-nums ${strong ? 'text-[32px] leading-none' : 'text-2xl'}`}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {route.cost_breakdown_json && (
              <div className="flex flex-col gap-3">
                <CostBar breakdown={route.cost_breakdown_json} className="h-1.5" />
                <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-[13px] text-ink-soft">
                  {COST_ITEMS.map((item) => (
                    <li key={item.key} className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${item.bar}`} aria-hidden />
                      {item.label} {formatYen(route.cost_breakdown_json![item.key])}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <section>
              <h2 className="mt-2 mb-4 text-xl font-bold">旅程</h2>
              <ItineraryList
                route={{
                  stops,
                  polyline: [],
                  sections: [],
                  total_duration_min: route.total_duration_min ?? 0,
                }}
                origin={trip.origin}
                people={trip.people}
                showTimes={false}
              />
              {directions && (
                <a
                  href={directions.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-block"
                >
                  <Button variant="secondary">
                    Googleマップで開く
                    <ExternalIcon className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 md:p-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="m-0 text-xl font-bold">メンバーに共有</h2>
              {expires && <span className="text-[13px] text-muted">{expires}まで有効</span>}
            </div>
            <p className="m-0 text-sm text-ink-soft">
              リンクを受け取った人は、ログインなしで旅程と費用を見られます。
            </p>
            <div>
              <label htmlFor="shared-url" className="mb-2 block text-[13px] text-muted">
                共有URL
              </label>
              <div className="flex gap-3">
                <input
                  id="shared-url"
                  readOnly
                  value={pageUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="carrip-field min-h-12 min-w-0 flex-1 rounded-[10px] border border-line-strong px-4 text-sm"
                  style={{ backgroundColor: '#f6f6f3' }}
                />
                <Button variant="secondary" onClick={handleCopy} className="shrink-0">
                  {copied ? 'コピーしました' : 'コピー'}
                </Button>
              </div>
            </div>
            {qrUrl && (
              <div className="hidden items-center gap-5 rounded-xl bg-soft p-5 md:flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="この旅程のQRコード"
                  width={104}
                  height={104}
                  className="rounded-lg bg-surface p-2"
                />
                <p className="m-0 text-sm text-ink-soft">スマホのカメラで読み取って開けます。</p>
              </div>
            )}
            <Button size="lg" className="w-full" onClick={handleLineShare}>
              LINEで送る
            </Button>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
