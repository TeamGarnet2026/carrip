import { AppShell } from '@/components/layout/app-shell'
import { SpotPickerPanel } from '@/components/plan/spot-picker-panel'

type SpotPickerPageProps = {
  params: Promise<{ id: string }>
}

export default async function SpotPickerPage({ params }: SpotPickerPageProps) {
  const { id } = await params

  return (
    <AppShell
      title="行き先を選ぶ"
      subtitle="行きたい場所を検索やおすすめから選んでください"
    >
      <SpotPickerPanel planId={id} />
    </AppShell>
  )
}
