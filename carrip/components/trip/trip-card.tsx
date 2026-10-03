import Link from 'next/link'
import type { Tables } from '@/types/supabase'

type TripCardProps = {
  trip: Pick<
    Tables<'trips'>,
    'id' | 'origin' | 'prefecture' | 'departure_date' | 'days' | 'people'
  >
}

export function TripCard({ trip }: TripCardProps) {
  return (
    <li>
      <Link
        href={`/trips/${trip.id}`}
        prefetch={false}
        className="carrip-panel group block h-full p-5 transition duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[var(--shadow-raised)]"
      >
        <p className="m-0 text-xs font-bold text-brand">
          {trip.departure_date}
        </p>
        <p className="mt-1 mb-0 text-base font-bold text-ink">{trip.origin} 出発</p>
        <p className="mt-1 mb-0 text-sm text-muted">
          {trip.prefecture?.join('、')} · {trip.departure_date} · {trip.days}
          日間 · {trip.people}人
        </p>
        <p className="mt-4 mb-0 text-[13px] font-bold text-brand-dark transition group-hover:translate-x-0.5">
          詳細を見る →
        </p>
      </Link>
    </li>
  )
}
