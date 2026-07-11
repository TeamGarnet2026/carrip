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
    <div className="overflow-hidden rounded-lg border border-line bg-linear-to-br from-white to-[#f3f8f7]">
      <div className="space-y-1 border-b border-line px-4 py-4">
        <h3 className="m-0 text-lg font-black text-ink">どこへ行きますか？</h3>
        <p className="m-0 text-sm leading-relaxed text-muted">
          {drillLevel === 'area'
            ? '地方を選んでください。'
            : `${regionLabel(activeRegion!)}の都道府県を選んでください。`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-[#fbfcfd] px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <span className="rounded-full bg-soft px-2.5 py-1 text-muted">日本</span>
          {activeRegion && (
            <>
              <span className="text-muted">›</span>
              <span className="rounded-full bg-[#e8f4f2] px-2.5 py-1 text-brand-dark">
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
            className="ml-auto text-xs font-extrabold text-brand hover:underline"
          >
            地方選択に戻る
          </button>
        )}
      </div>

      <div className="p-4">
        {drillLevel === 'area' ? (
          <div
            className="grid min-h-[300px] max-w-lg grid-cols-4 grid-rows-5 gap-2 rounded-lg border border-line bg-[#eef6f4] p-3 content-center"
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
                  className={`min-h-[44px] rounded-lg border text-xs font-black transition sm:text-sm ${region.className} ${
                    hasSelection
                      ? 'border-brand bg-[#e8f4f2] text-brand-dark shadow-sm'
                      : 'border-[#c8d8dc] bg-white text-ink hover:border-brand/50 hover:bg-[#f8fcfb]'
                  }`}
                >
                  {region.label}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="max-w-lg rounded-lg border border-line bg-[#eef6f4] p-4">
            <div className="flex flex-wrap gap-2">
              {prefecturesInActiveRegion.map((prefecture) => {
                const selected = selectedPrefecture === prefecture

                return (
                  <button
                    key={prefecture}
                    type="button"
                    onClick={() => selectPrefecture(prefecture)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-black transition ${
                      selected
                        ? 'border-brand bg-[#e8f4f2] text-brand-dark shadow-sm ring-2 ring-brand/20'
                        : 'border-[#c8d8dc] bg-white text-ink hover:border-brand/60'
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
        <div className="flex items-center justify-between gap-3 border-t border-line bg-[#fbfcfd] px-4 py-3">
          <p className="m-0 text-sm text-ink">
            選択中: <strong className="font-black">{selectedPrefecture}</strong>
          </p>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs font-extrabold text-muted hover:text-ink"
          >
            選択を解除
          </button>
        </div>
      )}
    </div>
  )
}
