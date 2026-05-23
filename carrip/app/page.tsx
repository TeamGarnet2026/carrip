import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  // 変更点: await を追加
  const supabase = await createClient()
  
  // tripsテーブルからデータを取得
  const { data: trips, error } = await supabase.from('trips').select('*')

  if (error) {
    return <div>データの取得に失敗しました: {error.message}</div>
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">旅行プラン一覧</h1>
      {trips?.length === 0 ? (
        <p>データがありません。Supabaseで直接データを入れてみてください。</p>
      ) : (
        <ul>
          {trips?.map((trip) => (
            <li key={trip.id} className="border p-4 mb-2 rounded">
              {trip.origin} 出発 ({trip.days}日間)
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}