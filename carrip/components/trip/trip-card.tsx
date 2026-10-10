import Link from 'next/link'
import { formatJapaneseDate, formatTripLength } from '@/lib/format'
import { planDisplayName } from '@/lib/plan/display-name'
import type { Tables } from '@/types/supabase'

type TripCardProps = {
  trip: Pick<
    Tables<'trips'>,
    'id' | 'origin' | 'prefecture' | 'departure_date' | 'days' | 'people'
  >
}

const PHOTO_TONES = ['bg-photo-1', 'bg-photo-2', 'bg-photo-3', 'bg-photo-4']

/** マイプラン一覧のカード（写真枠・日程・プラン名・出発地と行き先） */
export function TripCard({ trip }: TripCardProps) {
  const tone = PHOTO_TONES[trip.id.charCodeAt(0) % PHOTO_TONES.length]

  return (
    <li>
      <Link
        href={`/trips/${trip.id}`}
        prefetch={false}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface text-ink no-underline transition hover:border-muted"
      >
        <span className={`block aspect-[2/1] ${tone}`} aria-hidden />
        <span className="flex flex-1 flex-col gap-1 p-6">
          <span className="text-[13px] text-muted">
            {formatJapaneseDate(trip.departure_date)} · {formatTripLength(trip.days)} ·{' '}
            {trip.people}人
          </span>
          <span className="text-lg font-bold">
            {planDisplayName(trip.prefecture ?? [], trip.days)}
          </span>
          <span className="text-sm text-ink-soft">
            {trip.origin} 出発 · {trip.prefecture?.join('・')}
          </span>
          <span className="mt-4 border-t border-line pt-4 text-sm font-medium text-brand">
            詳細を見る →
          </span>
        </span>
      </Link>
    </li>
  )
}
