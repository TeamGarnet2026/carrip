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
        className="block rounded-xl border border-neutral-200 p-4 transition hover:border-teal-500/60 hover:bg-teal-50/40 dark:border-neutral-800 dark:hover:border-teal-500/40 dark:hover:bg-teal-950/20"
      >
        <p className="font-medium">{trip.origin} 出発</p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {trip.prefecture?.join('、')} · {trip.departure_date} · {trip.days}
          日間 · {trip.people}人
        </p>
        <p className="mt-2 text-xs text-teal-700 dark:text-teal-400">
          詳細を見る →
        </p>
      </Link>
    </li>
  )
}
