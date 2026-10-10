import { describe, expect, it, vi } from 'vitest'

const getUserWithTimeout = vi.fn()
const supabase = { auth: {} }

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => supabase,
}))
vi.mock('@/utils/supabase/get-user', () => ({
  getUserWithTimeout: (...args: unknown[]) => getUserWithTimeout(...args),
}))

const { requireAuthUser } = await import('@/lib/api/auth')

describe('requireAuthUser', () => {
  it('returns the user when signed in', async () => {
    getUserWithTimeout.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null })
    const result = await requireAuthUser()
    expect(result.user).toEqual({ id: 'u1' })
    expect(result.response).toBeNull()
    expect(result.supabase).toBe(supabase)
  })

  it('returns 401 when not signed in or on auth errors', async () => {
    getUserWithTimeout.mockResolvedValueOnce({ data: { user: null }, error: null })
    const anonymous = await requireAuthUser()
    expect(anonymous.user).toBeNull()
    expect(anonymous.response?.status).toBe(401)

    getUserWithTimeout.mockResolvedValueOnce({
      data: { user: { id: 'u1' } },
      error: new Error('timeout'),
    })
    expect((await requireAuthUser()).response?.status).toBe(401)
  })
})
