'use client'

import { Button } from '@/components/ui/button'
import {
  buildGoogleMapsDirectionsUrl,
  type GoogleMapsDirectionsStop,
} from '@/lib/maps/google-maps-directions-url'

type OpenInGoogleMapsLinkProps = {
  origin: string
  stops: GoogleMapsDirectionsStop[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function OpenInGoogleMapsLink({
  origin,
  stops,
  size = 'md',
  className = '',
}: OpenInGoogleMapsLinkProps) {
  const directions = buildGoogleMapsDirectionsUrl({ origin, stops })

  if (!directions) return null

  return (
    <div className={className}>
      <a
        href={directions.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        <Button variant="secondary" size={size} type="button">
          Googleマップで開く
        </Button>
      </a>
      {directions.waypointsTruncated && (
        <p className="mt-2 text-xs text-neutral-500">
          立ち寄りが多いため、Googleマップには先頭{directions.includedStops}
          か所のみ反映しています。
        </p>
      )}
      <p className="mt-1 text-xs text-neutral-500">
        スマホでは Google マップアプリが起動します。ルートは Google 側で再計算されます。
      </p>
    </div>
  )
}
