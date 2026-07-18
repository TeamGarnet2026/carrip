import type { PlanSession } from '@/lib/plan/types'

const PREFIX = 'carrip_plan_'

export function planStorageKey(planId: string): string {
  return `${PREFIX}${planId}`
}

export function loadPlanSession(planId: string): PlanSession | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(planStorageKey(planId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as PlanSession
  } catch {
    return null
  }
}

export function savePlanSession(session: PlanSession): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(planStorageKey(session.id), JSON.stringify(session))
}

export function createPlanId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `plan-${Date.now()}`
}
