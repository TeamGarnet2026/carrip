'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

type TripDeleteButtonProps = {
  tripId: string
  tripLabel: string
}

export function TripDeleteButton({ tripId, tripLabel }: TripDeleteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    const confirmed = window.confirm(
      `「${tripLabel}」を削除しますか？\nこの操作は取り消せません。`
    )
    if (!confirmed) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? '削除に失敗しました')
        return
      }

      router.push('/trips')
      router.refresh()
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <Button variant="danger" onClick={handleDelete} isLoading={loading}>
        プランを削除
      </Button>
    </div>
  )
}
