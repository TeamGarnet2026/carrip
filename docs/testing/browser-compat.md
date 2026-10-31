# ブラウザ互換確認（#699）

Chrome / Safari / Firefox / Edge の最新2世代で、主な機能が動くことを確認する。

## 自動テスト（E2E）

`carrip/e2e/`（Playwright）。外部 API（Google Places / NAVITIME / Google マップ）はテスト内で固定の応答に差し替えるため、API キーや利用回数を使わずに毎回同じ結果で動く。

```bash
cd carrip
npx playwright install chromium firefox webkit   # 初回のみ
npm run test:e2e                                 # 全ブラウザ
npm run test:e2e -- --project=webkit             # ブラウザを指定
```

GitHub Actions（`.github/workflows/e2e.yml`）でも、PR ごとに Linux 上で全ブラウザを実行する。

### 確認している操作

| テスト | 内容 |
|---|---|
| ホームから旅程づくりを始められる | ホーム・条件入力画面の表示 |
| 条件を入力し、おすすめの行き先からルートと料金まで進める | 条件入力（4ステップ）→ おすすめの自動選択 → 行き先を外す → ルート計算 → ルート候補と総費用の表示。スマホ幅ではスマホ用の画面構成で操作する |
| 入力が足りないときは次へ進めない | 入力チェック |
| ログイン・新規登録画面 | 入力欄の表示 |
| マイプラン | 未ログインならログイン画面に案内される |
| 404 | 存在しないページで 404 画面 |

すべてのテストで、画面の JavaScript エラー（`pageerror`）が出ていないことも確認する。

### 対象（Playwright のプロジェクト）

| プロジェクト | ブラウザ | 画面 |
|---|---|---|
| `chrome` | Google Chrome（インストール済みの正式版） | PC |
| `edge` | Microsoft Edge（インストール済みの正式版） | PC |
| `firefox` | Firefox（Playwright 同梱） | PC |
| `webkit` | WebKit（Safari のエンジン、Playwright 同梱） | PC |
| `mobile-chrome` | Chromium（Pixel 7 の画面・UA） | スマホ |
| `mobile-safari` | WebKit（iPhone 14 の画面・UA） | スマホ |

## 結果

### 2026-10-31（ローカル、Windows 11 / Playwright 1.64.1）

| ブラウザ | バージョン | 結果 |
|---|---|---|
| Chrome | 156.0.8078.74 | ✅ 7/7 |
| Edge | 156.0.4314.50 | ✅ 7/7 |
| WebKit（Safari のエンジン） | 27.2 | ✅ 7/7 |
| スマホ幅 Chromium（Pixel 7） | 156 | ✅ 7/7 |
| スマホ幅 WebKit（iPhone 14） | 27.2 | ✅ 7/7 |
| Firefox | 157.0 | ⚠️ 未実施：この PC では Node.js から Firefox を起動できない（`spawn UNKNOWN`）。GitHub Actions の結果で確認する |

### 自動テストでは確認できないこと（人が確認する）

完了条件は「最新2世代」だが、自動テストで確認できるのは各ブラウザの**最新1世代**のみ。また、WebKit は Safari と同じエンジンだが **Safari そのものではない**。

| 完了条件 | 自動テスト | 人が確認すること |
|---|---|---|
| Chrome 最新2世代 | 最新（156）✅ | 1つ前（155）で下の手順 |
| Safari 最新2世代 | WebKit で代用 ✅ | Mac / iPhone の Safari 最新・1つ前で下の手順 |
| Firefox 最新2世代 | CI で確認 | 最新・1つ前で下の手順 |
| Edge 最新2世代 | 最新（156）✅ | 1つ前（155）で下の手順 |

### 手動確認の手順

本番またはプレビュー環境で、次の操作ができることを確認する。

1. ホームを開き「プランを作る」から条件を入力し、行き先画面まで進む
2. おすすめが自動で選ばれ、外す・追加・並べ替えができる
3. 「ルートと料金を計算する」でルート候補・費用・地図が表示される
4. ログインしてプランを保存し、共有画面で URL のコピー・QR コードの表示・ダウンロードができる
5. 共有 URL をログアウトした状態で開き、旅程が表示される
6. マイプランに保存したプランが表示され、削除できる

| ブラウザ | バージョン | OS | 1 | 2 | 3 | 4 | 5 | 6 | 確認者 | 日付 |
|---|---|---|---|---|---|---|---|---|---|---|
| Chrome | 156 | | | | | | | | | |
| Chrome | 155 | | | | | | | | | |
| Safari | | macOS / iOS | | | | | | | | |
| Safari | | macOS / iOS | | | | | | | | |
| Firefox | | | | | | | | | | |
| Firefox | | | | | | | | | | |
| Edge | 156 | | | | | | | | | |
| Edge | 155 | | | | | | | | | |
