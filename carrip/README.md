# Carrip（フロントエンド）

Next.js App Router + Supabase の Web アプリです。

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に Supabase の URL と anon key を設定
npm run dev
```

http://localhost:3000 を開きます。

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
