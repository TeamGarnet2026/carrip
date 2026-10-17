'use client'

import { useState } from 'react'
import {
  REGIONS,
  regionForPrefecture,
  type RegionId,
} from '@/lib/plan/prefecture-meta'

type DestinationPickerProps = {
  value: string[]
  onChange: (value: string[]) => void
}

/** 選べる都道府県の上限（ルート生成 API の上限と同じ） */
const MAX_PREFECTURES = 5

const AREA_TABS: Array<{ label: string; regions: RegionId[] }> = [
  { label: '北海道・東北', regions: ['hokkaido', 'tohoku'] },
  { label: '関東', regions: ['kanto'] },
  { label: '中部', regions: ['chubu'] },
  { label: '関西', regions: ['kansai'] },
  { label: '中国・四国', regions: ['chugoku_shikoku'] },
  { label: '九州・沖縄', regions: ['kyushu', 'okinawa'] },
]

function tabIndexForPrefecture(prefecture: string | undefined): number {
  if (!prefecture) return 3
  const region = regionForPrefecture(prefecture)
  const index = AREA_TABS.findIndex((tab) => region && tab.regions.includes(region))
  return index >= 0 ? index : 3
}

/** 行くエリア：地方タブ + 都道府県のチェックボックス（複数選択可） */
export function DestinationPicker({ value, onChange }: DestinationPickerProps) {
  const [activeTab, setActiveTab] = useState(() => tabIndexForPrefecture(value[0]))

  const prefectures = AREA_TABS[activeTab].regions.flatMap(
    (regionId) => REGIONS.find((region) => region.id === regionId)?.prefectures ?? []
  )

  function toggle(prefecture: string) {
    if (value.includes(prefecture)) {
      onChange(value.filter((item) => item !== prefecture))
      return
    }
    if (value.length >= MAX_PREFECTURES) return
    onChange([...value, prefecture])
  }

  return (
    <div>
      <p className="mt-0 mb-3 text-sm font-semibold">行くエリア</p>
      <div
        role="tablist"
        aria-label="地方"
        className="flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]"
      >
        {AREA_TABS.map((tab, index) => {
          const selected = index === activeTab
          const count = value.filter((prefecture) => {
            const region = regionForPrefecture(prefecture)
            return region != null && tab.regions.includes(region)
          }).length
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(index)}
              className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-sm whitespace-nowrap transition ${
                selected
                  ? 'border-ink font-semibold text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-brand px-1.5 text-[11px] text-white">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3">
        {prefectures.map((prefecture) => (
          <label key={prefecture} className="carrip-option">
            <input
              type="checkbox"
              checked={value.includes(prefecture)}
              onChange={() => toggle(prefecture)}
              disabled={!value.includes(prefecture) && value.length >= MAX_PREFECTURES}
            />
            {prefecture}
          </label>
        ))}
      </div>
      {value.length > 0 && (
        <p className="mt-3 mb-0 text-[13px] text-muted">
          選択中: <span className="font-semibold text-ink">{value.join('、')}</span>
          {value.length >= MAX_PREFECTURES && `（最大${MAX_PREFECTURES}つまで）`}
        </p>
      )}
    </div>
  )
}
