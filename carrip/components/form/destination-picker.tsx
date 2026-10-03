'use client'

import { useMemo, useState } from 'react'
import {
  REGIONS,
  regionForPrefecture,
  type RegionId,
} from '@/lib/plan/prefecture-meta'

type DestinationPickerProps = {
  value: string[]
  onChange: (value: string[]) => void
}

type DrillLevel = 'area' | 'pref'

const REGION_GRID: Array<{
  id: RegionId
  label: string
  className: string
}> = [
  { id: 'hokkaido', label: '北海道', className: 'col-start-4 row-start-1' },
  { id: 'tohoku', label: '東北', className: 'col-start-3 row-start-2' },
  { id: 'kanto', label: '関東', className: 'col-start-3 row-start-3' },
  { id: 'chubu', label: '中部', className: 'col-start-2 row-start-3' },
  { id: 'kansai', label: '関西', className: 'col-start-2 row-start-4' },
  {
    id: 'chugoku_shikoku',
    label: '中国・四国',
    className: 'col-start-1 row-start-4',
  },
  { id: 'kyushu', label: '九州', className: 'col-start-1 row-start-5' },
  { id: 'okinawa', label: '沖縄', className: 'col-start-3 row-start-5' },
]

function regionLabel(regionId: RegionId): string {
  return REGIONS.find((region) => region.id === regionId)?.label ?? regionId
}

export function DestinationPicker({ value, onChange }: DestinationPickerProps) {
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('area')
  const [activeRegion, setActiveRegion] = useState<RegionId | null>(null)

  const selectedPrefecture = value[0] ?? null

  const prefecturesInActiveRegion = useMemo(() => {
    if (!activeRegion) return []
    const region = REGIONS.find((item) => item.id === activeRegion)
    return region ? [...region.prefectures] : []
  }, [activeRegion])

  function selectPrefecture(prefecture: string) {
    if (selectedPrefecture === prefecture) {
      onChange([])
      return
    }
    onChange([prefecture])
  }

  function clearSelection() {
    onChange([])
  }

  function selectRegion(regionId: RegionId) {
    setActiveRegion(regionId)
    setDrillLevel('pref')
  }

  function goBackToAreas() {
    setDrillLevel('area')
    setActiveRegion(null)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="space-y-1 border-b border-line px-5 py-4">
        <h3 className="m-0 text-lg font-bold text-ink">どこへ行きますか？</h3>
        <p className="m-0 text-sm leading-relaxed text-muted">
          {drillLevel === 'area'
            ? '地方を選んでください。'
            : `${regionLabel(activeRegion!)}の都道府県を選んでください。`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-soft px-5 py-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-muted">日本</span>
          {activeRegion && (
            <>
              <span className="text-muted">›</span>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand-dark">
                {regionLabel(activeRegion)}
              </span>
            </>
          )}
          {selectedPrefecture && (
            <>
              <span className="text-muted">›</span>
              <span className="rounded-full bg-brand px-2.5 py-1 text-white">
                {selectedPrefecture}
              </span>
            </>
          )}
        </div>
        {drillLevel === 'pref' && (
          <button
            type="button"
            onClick={goBackToAreas}
            className="ml-auto rounded-lg px-2 py-1 text-xs font-bold text-brand transition hover:bg-brand-soft"
          >
            地方選択に戻る
          </button>
        )}
      </div>

      <div className="p-5">
        {drillLevel === 'area' ? (
          <div
            className="grid min-h-[300px] max-w-lg grid-cols-4 grid-rows-5 gap-2 rounded-2xl bg-[radial-gradient(circle_at_70%_20%,#e3f4f0,#f1f7f6_60%)] p-3 content-center"
            aria-label="日本地図（地方選択）"
          >
            {REGION_GRID.map((region) => {
              const hasSelection =
                selectedPrefecture !== null &&
                regionForPrefecture(selectedPrefecture) === region.id

              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => selectRegion(region.id)}
                  className={`min-h-[44px] rounded-xl border text-xs font-bold transition sm:text-sm ${region.className} ${
                    hasSelection
                      ? 'border-brand bg-brand text-white shadow-[0_4px_12px_rgba(15,138,126,0.25)]'
                      : 'border-white bg-white/90 text-ink shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]'
                  }`}
                >
                  {region.label}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="max-w-lg rounded-2xl bg-[#f1f7f6] p-4">
            <div className="flex flex-wrap gap-2">
              {prefecturesInActiveRegion.map((prefecture) => {
                const selected = selectedPrefecture === prefecture

                return (
                  <button
                    key={prefecture}
                    type="button"
                    onClick={() => selectPrefecture(prefecture)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                      selected
                        ? 'border-brand bg-brand text-white shadow-[0_4px_12px_rgba(15,138,126,0.25)]'
                        : 'border-white bg-white text-ink shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:border-teal-300'
                    }`}
                  >
                    {prefecture}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {selectedPrefecture && (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-brand-soft px-5 py-3">
          <p className="m-0 text-sm text-ink">
            選択中: <strong className="font-bold text-brand-dark">{selectedPrefecture}</strong>
          </p>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-lg px-2 py-1 text-xs font-bold text-muted transition hover:bg-white hover:text-ink"
          >
            選択を解除
          </button>
        </div>
      )}
    </div>
  )
}
