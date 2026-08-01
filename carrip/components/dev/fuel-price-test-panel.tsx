'use client'

import { useState } from 'react'
import { REGIONS } from '@/lib/plan/prefecture-meta'
import { FUEL_TYPE_LABELS, type FuelType } from '@/lib/routes/fuel'

type FuelPriceResponse = {
  prefecture: string
  fuel_type?: FuelType
  price_yen?: number
  prices: Record<FuelType, number>
  source: string
  degraded: boolean
  updated_at?: string
  survey_date?: string
  error?: string
}

const PREFECTURES = REGIONS.flatMap((region) => region.prefectures)

export function FuelPriceTestPanel() {
  const [prefecture, setPrefecture] = useState('京都府')
  const [fuelType, setFuelType] = useState<FuelType | ''>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FuelPriceResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchPrice() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const params = new URLSearchParams({ prefecture })
      if (fuelType) params.set('fuel_type', fuelType)

      const response = await fetch(`/api/prices/fuel?${params.toString()}`)
      const data = (await response.json()) as FuelPriceResponse

      if (!response.ok) {
        setError(data.error ?? `取得に失敗しました (${response.status})`)
        return
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラー')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <section className="carrip-panel space-y-4 p-5">
        <div>
          <h2 className="m-0 text-lg font-black text-ink">ガソリン単価テスト</h2>
          <p className="mt-1 text-sm text-muted">
            都道府県を選んで `/api/prices/fuel` から単価を取得します。
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-extrabold text-muted">都道府県</span>
          <select
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            className="carrip-field min-h-[42px] w-full rounded-[7px] border border-line px-3 py-2 text-sm"
          >
            {PREFECTURES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-extrabold text-muted">
            燃料種（任意）
          </span>
          <select
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value as FuelType | '')}
            className="carrip-field min-h-[42px] w-full rounded-[7px] border border-line px-3 py-2 text-sm"
          >
            <option value="">すべて（レギュラー / ハイオク / 軽油）</option>
            {(Object.keys(FUEL_TYPE_LABELS) as FuelType[]).map((type) => (
              <option key={type} value={type}>
                {FUEL_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={fetchPrice}
          disabled={loading || !prefecture}
          className="min-h-[42px] w-full rounded-[7px] bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          {loading ? '取得中…' : 'ガソリン代を取得'}
        </button>
      </section>

      {error && (
        <div
          className="rounded-[7px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {result && (
        <section className="carrip-panel space-y-3 p-5">
          <h3 className="m-0 text-base font-black text-ink">取得結果</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">都道府県</dt>
            <dd className="m-0 font-semibold">{result.prefecture}</dd>

            <dt className="text-muted">データソース</dt>
            <dd className="m-0 font-semibold">{result.source}</dd>

            <dt className="text-muted">概算モード</dt>
            <dd className="m-0">{result.degraded ? 'はい（フォールバック）' : 'いいえ'}</dd>

            {result.survey_date && (
              <>
                <dt className="text-muted">調査日</dt>
                <dd className="m-0">{result.survey_date}</dd>
              </>
            )}

            {result.updated_at && (
              <>
                <dt className="text-muted">更新日時</dt>
                <dd className="m-0">{result.updated_at}</dd>
              </>
            )}
          </dl>

          <div className="overflow-hidden rounded-[7px] border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft text-muted">
                <tr>
                  <th className="px-3 py-2 font-extrabold">燃料種</th>
                  <th className="px-3 py-2 font-extrabold">単価（円/L）</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(FUEL_TYPE_LABELS) as FuelType[]).map((type) => (
                  <tr key={type} className="border-t border-line">
                    <td className="px-3 py-2">{FUEL_TYPE_LABELS[type]}</td>
                    <td className="px-3 py-2 font-semibold">
                      {result.prices[type]?.toLocaleString('ja-JP') ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.price_yen != null && result.fuel_type && (
            <p className="m-0 text-sm text-muted">
              選択燃料（{FUEL_TYPE_LABELS[result.fuel_type]}）:{' '}
              <span className="font-bold text-ink">
                {result.price_yen.toLocaleString('ja-JP')} 円/L
              </span>
            </p>
          )}

          <details className="text-xs text-muted">
            <summary className="cursor-pointer">生JSON</summary>
            <pre className="mt-2 overflow-auto rounded bg-soft p-3 text-[11px] text-ink">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </div>
  )
}
