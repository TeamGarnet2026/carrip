import { ShareViewClient } from '@/components/share/share-view-client'

type SharePageProps = {
  params: Promise<{ short_code: string }>
}

export default async function SharePage({ params }: SharePageProps) {
  const { short_code } = await params
  return <ShareViewClient shortCode={short_code} />
}
