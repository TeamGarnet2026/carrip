# Carrip（フロントエンド）

Next.js App Router + Supabase の Web アプリです。

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に Supabase / Google Cloud のキーを設定（値はリポジトリに含めない）
npm run dev
```

http://localhost:3000 を開きます。

## 環境変数

| 変数名 | 用途 | 公開 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | クライアント可（`NEXT_PUBLIC_`） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key（RLS 前提） | クライアント可（`NEXT_PUBLIC_`） |
| `GOOGLE_CLOUD_API_KEY` | Google Maps Platform（Places / Routes / **マップ表示** など） | サーバー利用。マップ表示時はビルド時にクライアントへ注入 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | マップ表示専用キー（任意） | 未設定なら `GOOGLE_CLOUD_API_KEY` を流用 |
| `GEMINI_API_KEY` | Gemini API（旅程説明文の生成など） | **サーバー専用** |
| `RAPIDAPI_KEY` | RapidAPI キー（NAVITIME Route(car)） | **サーバー専用** |
| `RAPIDAPI_HOST` | RapidAPI ホスト（`navitime-route-car.p.rapidapi.com`） | **サーバー専用** |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | **サーバー専用** |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST トークン | **サーバー専用** |
| `ROUTE_CACHE_TTL_SECONDS` | ルート検索キャッシュ TTL（秒、省略時 7 日） | **サーバー専用** |

- **開発**: `carrip/.env.local` に設定（git 管理外）
- **本番**: [Vercel Dashboard](https://vercel.com) → プロジェクト → **Settings → Environment Variables** に同じキー名で設定
- **テンプレート**: `.env.example` にキー名のみ記載（値は含めない）

### Vercel への本番用設定手順

1. Vercel でプロジェクトをインポート（Root Directory: `carrip`）
2. **Settings → Environment Variables** を開く
3. 以下を **Production**（必要なら Preview / Development も）に追加:
   - `NEXT_PUBLIC_SUPABASE_URL` … 本番 Supabase の URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` … 本番 Supabase の anon key
   - `GOOGLE_CLOUD_API_KEY` … [Google Cloud Console](https://console.cloud.google.com/apis/credentials) の API キー（Places / Routes / Maps JavaScript API）
   - `GEMINI_API_KEY` … [Google AI Studio](https://aistudio.google.com/apikey) の API キー
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` … [Upstash Console](https://console.upstash.com/) の Redis 認証情報
   - `ROUTE_CACHE_TTL_SECONDS` … 省略可（デフォルト 604800 = 7 日）
4. 再デプロイして反映を確認

CLI を使う場合:

```bash
cd carrip
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add GOOGLE_CLOUD_API_KEY production
vercel env add GEMINI_API_KEY production
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

## Redis キャッシュ（ルート検索）

外部 API レスポンスを Upstash Redis にキャッシュし、レスポンスタイムと API コストを削減します。

| 項目 | 内容 |
|------|------|
| エンドポイント | `POST /api/routes/generate` |
| 接続確認 | `GET /api/health/redis` |
| キャッシュキー | リクエスト内容の SHA-256 ハッシュ（`routes:search:{hash}`） |
| TTL | `ROUTE_CACHE_TTL_SECONDS`（デフォルト 7 日 = 604800 秒） |

### ローカル確認手順

1. [Upstash](https://console.upstash.com/) で Redis データベースを作成
2. `.env.local` に `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` を設定
3. `npm run dev` を起動
4. 接続確認: `curl http://localhost:3000/api/health/redis`
5. ルート生成（1 回目は `cached: false`）:

```bash
curl -X POST http://localhost:3000/api/routes/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "origin": "東京駅",
    "prefecture": ["京都府"],
    "departure_date": "2026-07-01",
    "days": 2,
    "people": 4,
    "vehicle": { "type": "compact" }
  }'
```

6. 同じリクエストを再送 → `cached: true` になることを確認

## 認証フロー

| 画面 | URL | ログイン |
|------|-----|----------|
| トップ | `/` | 不要 |
| ルート候補（モック） | `/plan/demo/routes` | 不要 |
| プラン保存 | `/plan/:id/confirmed` | **必須**（未ログイン時は `/login` へ） |
| マイプラン | `/trips` | **必須** |
| ログイン | `/login` | — |
| 新規登録 | `/signup` | — |
| API 手動テスト（開発のみ） | `/test-api` | 一部テストは要ログイン |

## API 手動テスト（開発環境）

外部 API の消費を抑えるため、vitest ではなくブラウザから必要なときだけ呼び出すページを用意しています。

1. `npm run dev` を起動
2. http://localhost:3000/test-api を開く（本番ビルドでは 404）
3. 各項目の **実行** ボタンで個別テスト、**一括実行** でまとめてテスト
4. ルート生成（heavy）は API 消費が大きいため、一括実行ではデフォルト除外

認証が必要なテスト（POI 検索 / trips）を試す場合は、先に `/login` または `/test-auth` でログインしてください。

## ローカル確認手順（ログイン）

1. Supabase Dashboard で **Authentication → Email** を有効化し、**Confirm email** をオフにする（サインアップ直後にログイン）
2. **SQL Editor** で RLS ポリシーを適用する
   - 初回: `supabase/migrations/20260710140000_rls_policies.sql`
   - 再帰エラーが出た場合: 続けて `supabase/migrations/20260710150000_fix_rls_recursion.sql` を実行
3. `npm run dev` を起動
4. http://localhost:3000/plan/new?step=1 から旅程を作成
5. ルート候補で「このルートを選ぶ」→ プラン保存
6. http://localhost:3000/trips でマイプラン一覧（RLS により自分のデータのみ）
7. ログアウト後、`/trips` に直接アクセスすると再び `/login` へ

### RLS エラーが出る場合

`new row violates row-level security policy for table "routes"` または `infinite recursion detected in policy for relation "trips"` が出たら、Supabase Dashboard → **SQL Editor** で以下を実行してください。

1. `supabase/migrations/20260710140000_rls_policies.sql`（未実行の場合）
2. `supabase/migrations/20260710150000_fix_rls_recursion.sql`（再帰エラー修正）

## 技術メモ

- ブラウザ用 Supabase: `utils/supabase/client.ts`
- サーバー用: `utils/supabase/server.ts`
- セッション・保護ルート: `middleware.ts`, `utils/supabase/middleware.ts`
