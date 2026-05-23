# 旅行プラン共有アプリ (Travel App)

Next.js (App Router) と Supabase を使用した旅行プラン管理・共有アプリケーションです。

## 🛠 技術スタック
- **Frontend / Backend**: Next.js (App Router), TypeScript
- **Database / Auth**: Supabase (PostgreSQL)
- **Database ORM/Client**: `@supabase/ssr`, `@supabase/supabase-js`

## 🚀 環境構築手順

### 1. プロジェクトのセットアップ
```bash
npx create-next-app@latest ./
npm install @supabase/supabase-js @supabase/ssr
2. 環境変数の設定
プロジェクトルートに .env.local を作成し、Supabaseの接続情報を記述します。

コード スニペット
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
3. 型定義の生成（Supabase CLI）
DBスキーマからTypeScriptの型定義を自動生成します。

Bash
npx supabase login
npx supabase gen types typescript --project-id [YOUR_PROJECT_REF] --schema public > types/supabase.ts
⚠️ トラブルシューティング（発生したエラーと対処法）
開発初期に発生した主なエラーと、その解決策の備忘録です。

Database (Supabase) 関連
❌ エラー: relation "trips" already exists
原因: すでに同名のテーブルが存在している状態で CREATE TABLE を実行しようとしたため。

対処法: テーブル再作成時は、SQLの先頭に DROP TABLE IF EXISTS [テーブル名] CASCADE; を記述し、既存のテーブルと関連する制約をリセットしてから実行する。

❌ エラー: syntax error at or near ".."
原因: ネット上やAIが生成した省略記号（...）が含まれたSQLをそのまま実行したため。

対処法: SQLは省略せずに完全な構文で実行する。

❌ 課題: データを入れたのに画面に表示されない（エラーも出ない）
原因: Supabaseの RLS (Row Level Security) が有効になっており、権限がないアクセスに対して「空の配列（データが存在しないフリ）」を返していたため。

対処法: 開発初期の段階では、以下のSQLを実行して一時的にRLSを無効化する。

SQL
  ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
(※ ログイン機能実装時に再度 ENABLE にし、適切なポリシーを設定すること)

別要因の可能性: Next.jsのキャッシュ機能によるもの。page.tsx に export const dynamic = 'force-dynamic' を追加してキャッシュを無効化する。

Next.js (App Router) / React 関連
❌ エラー: Expected ';', got ':' (Parsing ecmascript source code failed)
原因: JSX内で文字列と変数をそのまま return しようとしたため、JavaScriptの構文エラーとして判定された。

TypeScript
  // 🚫 NG
  return データの取得に失敗しました: {error.message}
対処法: 画面に描画するテキストは必ずHTMLタグ（<div>など）で囲む。

TypeScript
  // ✅ OK
  return <div>データの取得に失敗しました: {error.message}</div>
❌ エラー: cookieStore.get is not a function
原因: Next.js 15以降、cookies() が非同期（Promise）に変更されたことと、@supabase/ssr のAPIがアップデートされたため。

対処法: utils/supabase/server.ts および呼び出し元で await を付与し、最新の getAll() / setAll() メソッドを使用する。

TypeScript
  // utils/supabase/server.ts の修正例
  export async function createClient() {
    const cookieStore = await cookies(); // awaitが必要
    return createServerClient<Database>(url, key, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { /* set処理 */ }
      }
    });
  }