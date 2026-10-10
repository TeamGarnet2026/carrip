import { AppShell } from '@/components/layout/app-shell'
import { SpotPickerPanel } from '@/components/plan/spot-picker-panel'

type SpotPickerPageProps = {
  params: Promise<{ id: string }>
}

export default async function SpotPickerPage({ params }: SpotPickerPageProps) {
  const { id } = await params

  return (
    <AppShell variant="entry">
      <SpotPickerPanel planId={id} />
    </AppShell>
  )
}
