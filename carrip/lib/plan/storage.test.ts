import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPlanId,
  loadPlanSession,
  planStorageKey,
  savePlanSession,
} from '@/lib/plan/storage'
import { defaultTripFormValues, type PlanSession } from '@/lib/plan/types'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

const session: PlanSession = { id: 'plan-1', form: defaultTripFormValues() }

describe('plan storage (browser)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('sessionStorage', memoryStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves and loads a plan session by id', () => {
    savePlanSession(session)
    expect(sessionStorage.getItem(planStorageKey('plan-1'))).not.toBeNull()
    expect(loadPlanSession('plan-1')).toEqual(session)
  })

  it('returns null for missing or broken data', () => {
    expect(loadPlanSession('missing')).toBeNull()
    sessionStorage.setItem(planStorageKey('broken'), '{not json')
    expect(loadPlanSession('broken')).toBeNull()
  })
})

describe('plan storage (server)', () => {
  it('does nothing outside the browser', () => {
    expect(loadPlanSession('plan-1')).toBeNull()
    expect(() => savePlanSession(session)).not.toThrow()
  })
})

describe('createPlanId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses crypto.randomUUID when available', () => {
    expect(createPlanId()).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('falls back to a timestamp id', () => {
    vi.stubGlobal('crypto', {})
    expect(createPlanId()).toMatch(/^plan-\d+$/)
  })

  it('prefixes storage keys', () => {
    expect(planStorageKey('abc')).toBe('carrip_plan_abc')
  })
})
