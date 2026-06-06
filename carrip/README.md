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

## ローカル確認手順（ログイン）

1. Supabase Dashboard で **Authentication → Email** を有効化し、**Confirm email** をオフにする（サインアップ直後にログイン）
2. `npm run dev` を起動
3. http://localhost:3000/plan/demo/routes を開く（ログイン不要）
4. 「このプランを保存する」→ `/login?redirectTo=...` に遷移することを確認
5. http://localhost:3000/signup でアカウント作成
6. 登録後、保存画面または `redirectTo` 先に戻ることを確認
7. http://localhost:3000/trips でマイプラン一覧（RLS により自分のデータのみ）
8. ログアウト後、`/trips` に直接アクセスすると再び `/login` へ

## 技術メモ

- ブラウザ用 Supabase: `utils/supabase/client.ts`
- サーバー用: `utils/supabase/server.ts`
- セッション・保護ルート: `middleware.ts`, `utils/supabase/middleware.ts`
