# Carrip 本番環境デプロイ手順書（Vercel）

**プロジェクト名：** Carrip（カーリップ）
**関連ドキュメント：** [要件定義書（5-2 可用性 / 12 リリース・移行計画）](./requirements.md)、[障害対応・エスカレーションフロー](./incident.md)

誰が担当しても同じ手順で本番デプロイ・ロールバックができるようにするための手順書です。

---

## 1. 構成の概要

| 項目 | 内容 |
|---|---|
| ホスティング | Vercel（Next.js 16 / App Router） |
| リポジトリ | `TeamGarnet2026/carrip`（アプリ本体は `carrip/` ディレクトリ） |
| 本番ブランチ | `main`（`main` へのマージで本番デプロイ） |
| プレビュー | PR ごとに Vercel のプレビュー URL が自動発行される |
| DB / 認証 | Supabase（PostgreSQL・Auth・RLS） |
| キャッシュ | Upstash Redis（未設定時はインメモリにフォールバック） |
| 定期バッチ | GitHub Actions「Sync Enecho gasoline prices」（毎週水・木 16:00 JST） |

---

## 2. 初回セットアップ（Vercel プロジェクト）

> 既にプロジェクトがある場合は、下のチェック項目が設定どおりになっているかだけ確認してください。

1. Vercel ダッシュボード → **Add New → Project** → GitHub の `TeamGarnet2026/carrip` を選択
2. **Root Directory** に `carrip` を指定（リポジトリ直下ではない点に注意）
3. **Framework Preset** が `Next.js` になっていることを確認
4. Build / Install コマンドは既定のまま（`npm run build` / `npm install`）
5. 「3. 環境変数」の値を登録してから **Deploy**

**確認チェックリスト**

- [ ] Settings → General → Root Directory = `carrip`
- [ ] Settings → Git → Production Branch = `main`
- [ ] Settings → General → Node.js Version = 22.x（GitHub Actions と揃える）
- [ ] Settings → Domains に本番ドメインが割り当てられている

---

## 3. 環境変数の設定

Vercel ダッシュボード → Settings → **Environment Variables** で登録します。
値は各サービスの管理画面から取得し、**チャットやリポジトリには貼らない**でください。雛形は `carrip/.env.example` です。

| 変数名 | 必須 | 対象環境 | 取得元 / 用途 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Production / Preview | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Production / Preview | 同上（anon key） |
| `GOOGLE_CLOUD_API_KEY` | ✅ | Production / Preview | Google Cloud → 認証情報（Places / Routes / Maps JavaScript API） |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 任意 | Production / Preview | 地図表示専用キーを分ける場合のみ。未設定時は `GOOGLE_CLOUD_API_KEY` を使用 |
| `RAPIDAPI_KEY` | ✅ | Production / Preview | RapidAPI（NAVITIME Route(car)） |
| `RAPIDAPI_HOST` | ✅ | Production / Preview | `navitime-route-car.p.rapidapi.com` |
| `UPSTASH_REDIS_REST_URL` | ✅（本番） | Production | Upstash コンソール |
| `UPSTASH_REDIS_REST_TOKEN` | ✅（本番） | Production | 同上 |
| `ROUTE_CACHE_TTL_SECONDS` | 任意 | Production | ルート検索キャッシュ TTL（秒）。省略時 604800（7日） |
| `GOVERNMENT_FUEL_API_URL` | 任意 | Production | 独自の燃料価格 API を使う場合のみ |

> `SUPABASE_SERVICE_ROLE_KEY` は **Vercel には登録しません**。ガソリン価格バッチ（GitHub Actions）専用で、GitHub → Settings → Secrets and variables → Actions に登録します（`NEXT_PUBLIC_SUPABASE_URL` も同様に Secrets に必要）。

**Google Cloud 側の設定**

- [ ] API キーの「アプリケーションの制限」→ HTTP リファラーに本番ドメイン（`https://<本番ドメイン>/*`）を追加
- [ ] Places API (New) / Routes API / Maps JavaScript API が有効
- [ ] 予算アラート（$150/月）が設定されている（要件定義書 5-5）

**Supabase 側の設定**

- [ ] Authentication → URL Configuration → Site URL / Redirect URLs に本番ドメインを追加

環境変数を変更した場合は、**再デプロイしないと反映されません**（Deployments → 最新の Production → Redeploy）。

---

## 4. 通常のデプロイ手順

### 4-1. 事前確認（デプロイ前日まで）

- [ ] デプロイ対象の PR がすべてレビュー承認済み
- [ ] PR のプレビュー URL で主要フロー（条件入力 → 行き先選択 → ルート一覧 → 保存 → 共有）を確認済み
- [ ] `carrip/` で `npm run lint` / `npx vitest run` / `npm run build` が通る
- [ ] DB マイグレーションがある場合、内容と適用順（「4-3」）を確認済み
- [ ] 実施日時が「6. カットオーバー手順」の条件を満たしている
- [ ] チーム（Slack）にデプロイ予定を告知済み

### 4-2. デプロイ

1. GitHub で対象 PR を `main` にマージする（Squash / Merge は PR の方針に従う）
2. Vercel → Deployments で、`main` の Production デプロイが **Ready** になるのを待つ（目安 2〜5 分）
3. ビルドが **Error** になった場合は、ログを確認し、本番は直前のバージョンのまま動いていることを確認してから修正 PR を作る（本番には影響しない）

### 4-3. DB マイグレーション（ある場合のみ）

マイグレーションは `carrip/supabase/migrations/` にあります。

1. **アプリのデプロイ前に**、Supabase に適用する（新しい列・テーブルを先に用意し、古いアプリでも動く状態にする）
   ```bash
   cd carrip
   npx supabase link --project-ref <本番プロジェクトの ref>
   npx supabase db push
   ```
2. Supabase ダッシュボード → Database で、テーブル・RLS ポリシーが反映されていることを確認
3. 列の削除・名前変更など**後方互換性のない変更**は、アプリのデプロイ完了後に別のマイグレーションとして行う

### 4-4. デプロイ後の動作確認（スモークテスト）

本番 URL で以下を確認し、結果を Slack に報告します。

- [ ] トップページが表示される
- [ ] `GET /api/health/redis` が `ok: true` かつ `backend: "redis"` を返す
- [ ] `GET /api/health/google-maps` がエラーを返さない
- [ ] 条件入力 → 行き先選択 → ルート一覧まで進み、費用が表示される
- [ ] ログイン → プラン保存 → マイプランに表示される
- [ ] 共有 URL を発行し、未ログインのブラウザで開ける
- [ ] `/test-api`・`/api/dev/*` などの開発用ページが **404** になる（本番では無効）
- [ ] Sentry に新しいエラーが急増していない（導入後）

問題があれば「5. ロールバック手順」を実施し、[障害対応フロー](./incident.md)に従って報告します。

---

## 5. ロールバック手順

### 5-1. アプリのロールバック（Vercel）

本番で不具合が見つかったら、**原因調査より先に直前のバージョンへ戻します**。

1. Vercel → **Deployments** を開く
2. 直前に正常だった Production デプロイの「…」メニュー → **Instant Rollback**（または **Promote to Production**）
3. 本番 URL で「4-4」のスモークテストを再実施
4. Slack の障害スレッドにロールバック完了を報告
5. 原因を修正した PR を通常手順でマージし、再デプロイする

> Instant Rollback 後は Vercel の自動デプロイが一時停止される場合があります。修正版を出す前に、Deployments 画面で自動デプロイが再開されているか確認してください。

### 5-2. DB のロールバック（Supabase）

- 追加しただけのマイグレーション（列・テーブル・ポリシーの追加）は、多くの場合**アプリを戻すだけで問題ありません**。DB は戻さずに様子を見ます。
- データを壊した・消した場合は、Supabase → Database → **Backups** から復元します（日次バックアップ。復元すると、バックアップ以降の書き込みは失われます。RPO 24 時間）。
- 復元は影響が大きいため、**上長の判断を得てから**実施します（[障害対応フロー](./incident.md)）。

### 5-3. 環境変数を誤って変更した場合

1. Settings → Environment Variables で正しい値に戻す
2. Deployments → 最新の Production → **Redeploy**（「Use existing Build Cache」は外す）

---

## 6. カットオーバー手順（実施日時のルール）

要件定義書「12. リリース・移行計画」と「5-2 計画メンテナンス」に従います。

| ルール | 内容 |
|---|---|
| 実施時間帯 | **深夜（2:00〜4:00）** に行う |
| 実施日 | **休日（土日祝）は避ける**（利用が多いと想定されるため） |
| 頻度 | 計画メンテナンスは週 1 回以内 |
| 体制 | 実施者 1 名＋確認者 1 名（障害時に上長へ連絡できる状態） |

**当日の流れ**

1. 開始前：Slack で「デプロイ開始」を告知
2. （ある場合）DB マイグレーションを適用 →「4-3」
3. PR をマージし、Production デプロイが Ready になるのを待つ →「4-2」
4. スモークテスト →「4-4」
5. 問題がなければ Slack で「デプロイ完了」を報告。問題があれば「5. ロールバック手順」へ

> 緊急の不具合修正（ホットフィックス）は時間帯ルールの例外とし、上長の承認を得て実施します。

---

## 7. 補足

- **Cloudflare Pages**：PR に Cloudflare Pages のチェックも出ますが、本番は Vercel です。Cloudflare Pages のチェックは現在失敗している状態で、本番デプロイには影響しません。
- **ガソリン価格バッチ**：GitHub → Actions → 「Sync Enecho gasoline prices」→ **Run workflow** で手動実行できます。本番 DB の価格データを今すぐ更新したいときに使います。
