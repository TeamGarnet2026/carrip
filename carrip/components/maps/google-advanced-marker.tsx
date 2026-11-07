'use client'

import { useEffect } from 'react'
import { useGoogleMap } from '@react-google-maps/api'

type GoogleAdvancedMarkerProps = {
  position: google.maps.LatLngLiteral
  /** ピンの塗り色（例: #0d9488） */
  color: string
  /** ピンの中に表示する短い文字（例: 発、1） */
  label: string
  title: string
}

/**
 * google.maps.Marker は非推奨のため、AdvancedMarkerElement でピンを立てる。
 * @react-google-maps/api に対応する部品がないので、親の GoogleMap に直接追加する。
 * 地図に mapId を指定し、marker ライブラリを読み込んでいる必要がある。
 */
export function GoogleAdvancedMarker({ position, color, label, title }: GoogleAdvancedMarkerProps) {
  const map = useGoogleMap()
  const { lat, lng } = position

  useEffect(() => {
    if (!map) return

    // glyph は非推奨。@types/google.maps がまだ glyphText に対応していないため型を補う
    const pinOptions: google.maps.marker.PinElementOptions & { glyphText: string } = {
      background: color,
      borderColor: '#ffffff',
      glyphText: label,
      glyphColor: '#ffffff',
    }
    const pin = new google.maps.marker.PinElement(pinOptions)
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat, lng },
      title,
      content: pin,
    })

    return () => {
      marker.map = null
    }
  }, [map, lat, lng, color, label, title])

  return null
}
