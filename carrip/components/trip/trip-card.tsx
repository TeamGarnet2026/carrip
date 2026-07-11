import Link from 'next/link'
import type { Tables } from '@/types/supabase'

type TripCardProps = {
  trip: Tables<'trips'>
}

export function TripCard({ trip }: TripCardProps) {
  return (
    <li>
      <Link
        href={`/trips/${trip.id}`}
        className="carrip-panel block p-4 transition hover:border-brand/50"
      >
        <p className="font-extrabold text-ink">{trip.origin} 出発</p>
        <p className="mt-1 text-sm text-muted">
          {trip.prefecture?.join('、')} · {trip.departure_date} · {trip.days}
          日間 · {trip.people}人
        </p>
        <p className="mt-2 text-xs font-extrabold text-brand-dark">
          詳細を見る →
        </p>
      </Link>
    </li>
  )
}
