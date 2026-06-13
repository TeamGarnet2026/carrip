// app/test-auth/page.tsx
import { createClient } from '@/utils/supabase/server'

export const runtime = 'edge'
import { redirect } from 'next/navigation'

export default async function TestAuthPage() {
  const supabase = await createClient()
  
  // サーバー側でセッション情報を取得
  const { data: { user } } = await supabase.auth.getUser()

  // ログイン用の Server Action
  const login = async (formData: FormData) => {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) console.error('ログイン失敗:', error.message)
    
    // 成功・失敗に関わらずページをリロードして状態を更新
    redirect('/test-auth')
  }

  // ログアウト用の Server Action
  const logout = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/test-auth')
  }

  return (
    <main className="p-8">
      <h1 className="text-xl font-bold mb-4">サーバーサイド認証テスト</h1>

      {user ? (
        <div className="bg-green-100 p-4 rounded text-green-800">
          <p>✅ ログイン成功（Cookieにセッションが保存されました）</p>
          <p className="mt-2">ユーザーID: <strong>{user.id}</strong></p>
          <p>メール: {user.email}</p>
          
          <form action={logout} className="mt-4">
            <button type="submit" className="bg-red-500 text-white px-4 py-2 rounded font-bold">
              ログアウト
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-gray-100 p-6 rounded">
          <p className="text-red-600 font-bold mb-4">❌ 未ログイン（またはCookieなし）</p>
          
          <form action={login} className="flex flex-col gap-3 max-w-sm">
            <input 
              type="email" 
              name="email" 
              placeholder="テストユーザーのEmail" 
              className="border p-2 rounded text-black"
              required 
            />
            <input 
              type="password" 
              name="password" 
              placeholder="パスワード" 
              className="border p-2 rounded text-black"
              required 
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold mt-2">
              テストログイン実行
            </button>
          </form>
        </div>
      )}
    </main>
  )
}