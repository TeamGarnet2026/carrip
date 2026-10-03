import { notFound } from 'next/navigation'
import { FuelPriceTestPanel } from '@/components/dev/fuel-price-test-panel'
import { AppShell } from '@/components/layout/app-shell'
import { getUserWithTimeout } from '@/utils/supabase/get-user'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function TestFuelPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await getUserWithTimeout(supabase)

  return (
    <AppShell
      email={user?.email}
      showLogout={Boolean(user)}
      title="ガソリン単価テスト"
      subtitle="都道府県を選んで DB / フォールバック単価を確認します（開発専用）"
    >
      <FuelPriceTestPanel />
    </AppShell>
  )
}
