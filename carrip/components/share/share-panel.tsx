'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { loadPlanSession } from '@/lib/plan/storage'

type SharePanelProps = {
  planId: string
  routeId?: string
}

type ShareResponse = {
  short_code: string
  share_url: string
  expires_at: string
}

export function SharePanel({ planId, routeId }: SharePanelProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [share, setShare] = useState<ShareResponse | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function createShare() {
      const session = loadPlanSession(planId)
      const targetRouteId = routeId ?? session?.savedRouteId

      if (!targetRouteId) {
        setError('先にプランを保存してから共有してください')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/routes/${targetRouteId}/share`, {
          method: 'POST',
        })
        const data = await response.json()
        if (!response.ok) {
          setError(data.error ?? '共有URLの生成に失敗しました')
          return
        }
        setShare(data as ShareResponse)
      } catch {
        setError('ネットワークエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    void createShare()
  }, [planId, routeId])

  async function handleCopy() {
    if (!share) return
    await navigator.clipboard.writeText(share.share_url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function handleLineShare() {
    if (!share) return
    const text = encodeURIComponent(`Carripで旅行プランを共有します\n${share.share_url}`)
    window.open(`https://line.me/R/msg/text/?${text}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label="共有URLを生成中" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        {error}
      </div>
    )
  }

  if (!share) return null

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(share.share_url)}`

  return (
    <div className="space-y-6 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
      <div>
        <p className="mb-2 text-sm font-medium">共有URL</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            readOnly
            value={share.share_url}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? 'コピーしました' : 'コピー'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <img
          src={qrUrl}
          alt="共有URLのQRコード"
          width={180}
          height={180}
          className="rounded-lg border border-neutral-200 dark:border-neutral-800"
        />
        <div className="space-y-3">
          <Badge variant="warning" label="7日間有効" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            有効期限: {new Date(share.expires_at).toLocaleDateString('ja-JP')}
          </p>
          <Button onClick={handleLineShare}>LINEで送る</Button>
        </div>
      </div>
    </div>
  )
}
