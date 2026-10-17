'use client'

import Link from 'next/link'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatJapaneseDate } from '@/lib/format'
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
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

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

  // 共有URLを外部サービスに送らないよう、QRコードはブラウザ内で生成する
  useEffect(() => {
    if (!share) return
    let cancelled = false
    QRCode.toDataURL(share.share_url, { width: 360, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [share])

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
      <div className="flex justify-center py-24">
        <Spinner size="lg" label="共有URLを作成中" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="carrip-panel mx-auto max-w-lg p-8 text-center">
        <p className="m-0 font-semibold">{error}</p>
        <Link href={`/plan/${planId}/confirmed`} className="mt-5 inline-block">
          <Button variant="secondary">保存画面に戻る</Button>
        </Link>
      </div>
    )
  }

  if (!share) return null

  const expires = formatJapaneseDate(share.expires_at.slice(0, 10)).replace(/（.）$/, '')

  return (
    <div className="mx-auto grid w-full max-w-[1000px] gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
      <section className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6 md:p-10">
        <div>
          <h1 className="m-0 text-[28px] leading-tight font-bold md:text-[34px]">メンバーに送る</h1>
          <p className="mt-3 mb-0 text-[15px] text-ink-soft">
            受け取った人はログインなしで、旅程と1人あたりの費用を見られます。
          </p>
        </div>

        <div>
          <label htmlFor="share-url" className="mb-2 block text-sm font-semibold">
            共有URL
          </label>
          <div className="flex gap-3">
            <input
              id="share-url"
              readOnly
              value={share.share_url}
              onFocus={(event) => event.currentTarget.select()}
              className="carrip-field min-h-[52px] min-w-0 flex-1 rounded-[10px] border border-line-strong px-4 text-base"
              style={{ backgroundColor: '#f6f6f3' }}
            />
            <Button variant="secondary" onClick={handleCopy} className="shrink-0">
              {copied ? 'コピーしました' : 'コピー'}
            </Button>
          </div>
          <p className="mt-2 mb-0 text-[13px] text-muted">7日間有効（{expires}まで）</p>
        </div>

        <Button size="lg" className="w-full" onClick={handleLineShare}>
          LINEで送る
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm">
          <a href={`/share/${share.short_code}`} target="_blank" rel="noopener noreferrer">
            メンバーに見える画面を確認 ↗
          </a>
          <Link href="/trips" prefetch={false}>
            マイプランへ
          </Link>
        </div>
      </section>

      <aside className="hidden flex-col items-center gap-5 rounded-2xl border border-line bg-surface p-10 text-center lg:flex">
        {qrDataUrl ? (
          // data URL のため next/image の最適化対象外
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="共有URLのQRコード"
            width={200}
            height={200}
            className="rounded-xl border border-dashed border-line-strong p-3"
          />
        ) : (
          <div className="grid h-[200px] w-[200px] place-items-center rounded-xl border border-dashed border-line-strong text-[13px] text-muted">
            QRコードを生成中…
          </div>
        )}
        <p className="m-0 text-sm leading-[1.8] text-ink-soft">
          その場にいるメンバーは、
          <br />
          スマホのカメラで読み取れます。
        </p>
        {qrDataUrl && (
          <a
            href={qrDataUrl}
            download={`carrip-share-${share.short_code}.png`}
            className="text-sm font-medium"
          >
            QRコードをダウンロード
          </a>
        )}
      </aside>
    </div>
  )
}
