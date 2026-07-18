'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { OpenInGoogleMapsLink } from '@/components/maps/open-in-google-maps-link'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { loadPlanSession, savePlanSession } from '@/lib/plan/storage'
import { toRouteGenerateRequest } from '@/lib/plan/types'

type TripSavePanelProps = {
  planId: string
  isLoggedIn: boolean
}

export function TripSavePanel({ planId, isLoggedIn }: TripSavePanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const session = loadPlanSession(planId)
    if (!session?.routes || !session.selectedRouteId) {
      setError('保存するルートが選択されていません')
      return
    }

    const route = session.routes.routes.find(
      (item) => item.id === session.selectedRouteId
    )
    if (!route) {
      setError('ルート情報が見つかりません')
      return
    }

    if (!isLoggedIn) {
      router.push(
        `/login?redirectTo=${encodeURIComponent(`/plan/${planId}/confirmed`)}`
      )
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...toRouteGenerateRequest(session.form),
          route,
          round_trip: session.form.options.roundTrip,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? '保存に失敗しました')
        return
      }

      savePlanSession({
        ...session,
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

  if (saved) {
    const session = loadPlanSession(planId)
    const route = session?.routes?.routes.find(
      (item) => item.id === session.selectedRouteId
    )

    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="font-medium text-emerald-800 dark:text-emerald-200">
          プランを保存しました
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/trips">
            <Button>マイプランへ</Button>
          </Link>
          <Link href={`/plan/${planId}/share`}>
            <Button variant="secondary">LINEで共有</Button>
          </Link>
        </div>
        {session && route && route.stops.length > 0 && (
          <div className="mt-4">
            <OpenInGoogleMapsLink
              origin={session.form.origin}
              stops={route.stops.map((stop) => ({
                lat: stop.lat,
                lng: stop.lng,
                name: stop.name,
              }))}
            />
          </div>
        )}
      </div>
    )
  }

  const session = loadPlanSession(planId)
  const selectedRoute = session?.routes?.routes.find(
    (item) => item.id === session.selectedRouteId
  )

  return (
    <div className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
        選択したルートをマイプランに保存します。ログインが必要です。
      </p>
      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <Button onClick={handleSave} isLoading={loading}>
        {isLoggedIn ? 'プランを保存する' : 'ログインして保存する'}
      </Button>
      {session && selectedRoute && selectedRoute.stops.length > 0 && (
        <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <OpenInGoogleMapsLink
            origin={session.form.origin}
            stops={selectedRoute.stops.map((stop) => ({
              lat: stop.lat,
              lng: stop.lng,
              name: stop.name,
            }))}
          />
        </div>
      )}
    </div>
  )
}
