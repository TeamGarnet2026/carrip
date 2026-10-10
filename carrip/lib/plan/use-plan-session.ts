'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { loadPlanSession, planStorageKey } from '@/lib/plan/storage'
import type { PlanSession } from '@/lib/plan/types'

function subscribeToNothing() {
  return () => {}
}

/**
 * sessionStorage のプランを読む。サーバー描画時は undefined（読み込み中）を返し、
 * サーバーとブラウザの描画結果がずれないようにする。
 */
export function usePlanSession(planId: string): PlanSession | null | undefined {
  const raw = useSyncExternalStore(
    subscribeToNothing,
    () => sessionStorage.getItem(planStorageKey(planId)),
    () => undefined
  )
  return useMemo(() => {
    if (raw === undefined) return undefined
    return raw === null ? null : loadPlanSession(planId)
  }, [raw, planId])
}
