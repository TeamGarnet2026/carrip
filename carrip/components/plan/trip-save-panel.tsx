'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckIcon } from '@/components/ui/icons'
import { Spinner } from '@/components/ui/spinner'
import { formatShortDate, formatTripLength, formatYen } from '@/lib/format'
import { planDisplayName } from '@/lib/plan/display-name'
import { loadPlanSession, savePlanSession } from '@/lib/plan/storage'
import { toRouteGenerateRequest } from '@/lib/plan/types'
import { usePlanSession } from '@/lib/plan/use-plan-session'

type TripSavePanelProps = {
  planId: string
  isLoggedIn: boolean
}

/** プランの確定・保存（PC_10 / SP_06） */
export function TripSavePanel({ planId, isLoggedIn }: TripSavePanelProps) {
  const router = useRouter()
  const session = usePlanSession(planId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const routes = session?.routes?.routes ?? []
  const routeIndex = routes.findIndex((item) => item.id === session?.selectedRouteId)
  const route = routeIndex >= 0 ? routes[routeIndex] : undefined

  async function handleSave() {
    const current = loadPlanSession(planId)
    if (!current?.routes || !current.selectedRouteId) {
      setError('保存するルートが選択されていません')
      return
    }

    const selected = current.routes.routes.find((item) => item.id === current.selectedRouteId)
    if (!selected) {
      setError('ルート情報が見つかりません')
      return
    }

    if (!isLoggedIn) {
      router.push(`/login?redirectTo=${encodeURIComponent(`/plan/${planId}/confirmed`)}`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...toRouteGenerateRequest(current.form),
          route: selected,
          round_trip: current.form.options.roundTrip,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? '保存に失敗しました')
        return
      }

      savePlanSession({
        ...current,
        savedTripId: data.trip.id,
        savedRouteId: data.route.id,
      })
      setSaved(true)
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (session === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" label="読み込み中" />
      </div>
    )
  }

  if (!session || !route) {
    return (
      <div className="carrip-panel mx-auto max-w-lg p-8 text-center">
        <p className="m-0 font-semibold">保存するルートが見つかりません。</p>
        <Link href={session ? `/plan/${planId}/routes` : '/plan/new?step=1'} className="mt-5 inline-block">
          <Button variant="secondary">{session ? 'ルートを選ぶ' : '最初からやり直す'}</Button>
        </Link>
      </div>
    )
  }

  const name = planDisplayName(session.form.prefecture, session.form.days)
  const touristStops = route.stops.filter((stop) => !stop.is_rest_stop).length

  return (
    <div className="mx-auto grid w-full max-w-[1000px] gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <div className="flex flex-col gap-6">
        <div>
          <p className="m-0 text-[13px] text-muted">
            選んだルート · 案{routeIndex + 1} {route.title}
          </p>
          <h1 className="mt-2 mb-0 text-[28px] leading-tight font-bold md:text-[34px]">
            {saved ? '保存しました' : 'このプランで確定しますか？'}
          </h1>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid h-40 grid-cols-[2fr_1fr] gap-1 md:h-56" aria-hidden>
            <span className="bg-photo-1" />
            <span className="grid grid-rows-2 gap-1">
              <span className="bg-photo-2" />
              <span className="bg-photo-4" />
            </span>
          </div>
          <div className="flex flex-col gap-5 p-6">
            <div>
              <p className="m-0 text-[13px] text-muted">プラン名</p>
              <p className="mt-1.5 mb-0 rounded-[10px] border border-line-strong px-4 py-3 text-lg font-semibold">
                {name}
              </p>
            </div>
            <dl className="m-0 grid grid-cols-3 gap-4">
              <div>
                <dt className="text-[13px] text-muted">日程</dt>
                <dd className="m-0 mt-1 text-[15px] font-medium">
                  {formatShortDate(session.form.departureDate)} {formatTripLength(session.form.days)}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">立ち寄り</dt>
                <dd className="m-0 mt-1 text-[15px] font-medium">{touristStops}か所</dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">総費用</dt>
                <dd className="m-0 mt-1 text-[15px] font-medium tabular-nums">
                  {formatYen(route.total_cost)}
                </dd>
              </div>
              <div className="col-span-3">
                <dt className="text-[13px] text-muted">1人あたり</dt>
                <dd className="m-0 mt-1 text-2xl font-semibold tabular-nums">
                  {formatYen(route.cost_per_person)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <aside className="rounded-2xl border border-line bg-surface p-6 md:p-8 lg:mt-[76px]">
        {saved ? (
          <div className="flex flex-col gap-5">
            <p className="m-0 flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
              <CheckIcon className="h-4 w-4 shrink-0" />「{name}」をマイプランに保存しました
            </p>
            <Link href={`/plan/${planId}/share`}>
              <Button size="lg" className="w-full">
                メンバーに共有する
              </Button>
            </Link>
            <Link href="/trips" prefetch={false} className="text-center text-sm">
              マイプランへ
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <h2 className="m-0 text-xl font-bold">マイプランに保存</h2>
            <p className="m-0 text-[15px] leading-[1.8] text-ink-soft">
              保存すると、あとから見直したり、LINEでメンバーに共有したりできます。
              {!isLoggedIn && '保存にはログインが必要です。'}
            </p>
            {error && (
              <p className="m-0 text-sm font-medium text-cost-admission" role="alert">
                {error}
              </p>
            )}
            <Button size="lg" className="w-full" onClick={handleSave} isLoading={loading}>
              {isLoggedIn ? 'プランを保存する' : 'ログインして保存する'}
            </Button>
            <Link href={`/plan/${planId}/routes`} className="text-center text-sm">
              ルートを選び直す
            </Link>
            <p className="m-0 border-t border-line pt-5 text-[13px] text-muted">
              費用は出発日時点の目安です。
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
