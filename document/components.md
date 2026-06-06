# UIコンポーネント定義書

**プロジェクト名：** Carrip（カーリップ）  
**文書バージョン：** 1.0  
**作成日：** 2026-06-06  
**ステータス：** Draft

---

## 1. 目的

再利用可能なUIコンポーネントを事前に定義し、実装の一貫性を保つ。

---

## 2. 命名規則

### コンポーネント名

- **形式：** PascalCase
- **単位：** 機能単位で名詞 + 役割を組み合わせる
- **例：** `TripCard`、`RouteScoreBadge`、`PrefectureTagInput`

### ファイル名

- コンポーネントファイル：`PascalCase.tsx`
- スタイルファイル（必要な場合）：`PascalCase.module.css`
- テストファイル：`PascalCase.test.tsx`
- Storybookファイル：`PascalCase.stories.tsx`

### Props の命名

- **形式：** camelCase
- イベントハンドラは `on` プレフィックス（例：`onChange`、`onSubmit`）
- 真偽値は `is` / `has` プレフィックス（例：`isLoading`、`isConfirmed`、`hasError`）

---

## 3. フォルダ構成

```
src/
└── components/
    ├── ui/                  # 汎用プリミティブ（ドメイン非依存）
    │   ├── Button/
    │   ├── Input/
    │   ├── Select/
    │   ├── Badge/
    │   ├── Card/
    │   ├── Modal/
    │   ├── Spinner/
    │   └── Toast/
    ├── form/                # フォーム部品（入力ロジックを含む）
    │   ├── PrefectureTagInput/
    │   ├── VehicleSelector/
    │   ├── DateRangePicker/
    │   ├── BudgetInput/
    │   └── PreferenceSelector/
    ├── trip/                # 旅行プランドメイン
    │   ├── TripCard/
    │   ├── TripForm/
    │   └── TripEmptyState/
    ├── route/               # ルート候補ドメイン
    │   ├── RouteCard/
    │   ├── RouteScoreBadge/
    │   ├── CostBreakdownPanel/
    │   └── RouteConfirmButton/
    ├── stop/                # 経由地・POIドメイン
    │   ├── StopListItem/
    │   ├── PoiCard/
    │   └── DayGroupHeader/
    ├── share/               # 共有URLドメイン
    │   ├── ShareButton/
    │   └── ShareExpiryBadge/
    └── layout/              # レイアウト・ナビゲーション
        ├── PageHeader/
        ├── BottomNav/
        └── SectionDivider/
```

---

## 4. 共通コンポーネント一覧

### 4-1. UIプリミティブ（`components/ui/`）

#### `Button`

汎用ボタン。バリアントで用途を切り替える。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `variant` | `"primary" \| "secondary" \| "ghost" \| "danger"` | `"primary"` | 外観バリアント |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | サイズ |
| `isLoading` | `boolean` | `false` | ローディング中（スピナー表示・無効化） |
| `isDisabled` | `boolean` | `false` | 無効化 |
| `leftIcon` | `ReactNode` | — | 左側アイコン |
| `onClick` | `() => void` | — | クリックハンドラ |

バリアント用途の目安：
- `primary`：プラン作成・ルート確定など主要アクション
- `secondary`：キャンセル・戻るなど補助アクション
- `ghost`：アイコンボタン・テキストリンク風ボタン
- `danger`：削除・解除など破壊的アクション

---

#### `Input`

テキスト入力フィールド。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `label` | `string` | — | ラベルテキスト |
| `placeholder` | `string` | — | プレースホルダー |
| `value` | `string` | — | 入力値 |
| `errorMessage` | `string` | — | エラーメッセージ（表示時は赤枠） |
| `helperText` | `string` | — | 補助テキスト |
| `isDisabled` | `boolean` | `false` | 無効化 |
| `onChange` | `(value: string) => void` | — | 変更ハンドラ |

---

#### `Select`

ドロップダウン選択。車種・都道府県単体選択などに使用。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `label` | `string` | — | ラベルテキスト |
| `options` | `{ label: string; value: string }[]` | — | 選択肢リスト |
| `value` | `string` | — | 選択値 |
| `placeholder` | `string` | — | 未選択時表示テキスト |
| `isDisabled` | `boolean` | `false` | 無効化 |
| `onChange` | `(value: string) => void` | — | 変更ハンドラ |

---

#### `Badge`

ステータスや数値を示すインラインラベル。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `variant` | `"info" \| "success" \| "warning" \| "danger" \| "neutral"` | `"neutral"` | 色バリアント |
| `label` | `string` | — | 表示テキスト |

---

#### `Card`

コンテンツをグループ化するコンテナ。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `isClickable` | `boolean` | `false` | クリック可能（hover スタイル付与） |
| `isSelected` | `boolean` | `false` | 選択状態（枠線ハイライト） |
| `onClick` | `() => void` | — | クリックハンドラ |
| `children` | `ReactNode` | — | 内包コンテンツ |

---

#### `Modal`

オーバーレイモーダル。確認ダイアログ・詳細表示に使用。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `isOpen` | `boolean` | — | 表示フラグ |
| `title` | `string` | — | モーダルタイトル |
| `onClose` | `() => void` | — | 閉じるハンドラ |
| `children` | `ReactNode` | — | 本文コンテンツ |
| `footer` | `ReactNode` | — | フッター（ボタン配置） |

---

#### `Spinner`

ローディングインジケーター。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | サイズ |
| `label` | `string` | — | スクリーンリーダー向けテキスト |

---

#### `Toast`

一時通知。成功・エラーのフィードバックに使用。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `variant` | `"success" \| "error" \| "info"` | `"info"` | 種別 |
| `message` | `string` | — | 通知テキスト |
| `duration` | `number` | `3000` | 表示時間（ms） |

---

### 4-2. フォーム部品（`components/form/`）

#### `PrefectureTagInput`

訪問都道府県をタグ形式で複数選択（1〜5件）。`trips.prefecture` に対応。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `value` | `string[]` | `[]` | 選択中の都道府県コードリスト |
| `maxCount` | `number` | `5` | 最大選択数 |
| `onChange` | `(value: string[]) => void` | — | 変更ハンドラ |

---

#### `VehicleSelector`

車種・燃費・ETC有無を入力するフォームグループ。`trips.vehicle_json` に対応。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `value` | `VehicleJson` | — | 車種情報オブジェクト |
| `onChange` | `(value: VehicleJson) => void` | — | 変更ハンドラ |

---

#### `DateRangePicker`

出発日・旅行日数を入力。`trips.departure_date`・`trips.days`（1〜7）に対応。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `departureDate` | `string` | — | 出発日（ISO 8601） |
| `days` | `number` | `1` | 旅行日数 |
| `onChangeDate` | `(date: string) => void` | — | 出発日変更ハンドラ |
| `onChangeDays` | `(days: number) => void` | — | 日数変更ハンドラ |

---

#### `BudgetInput`

1人あたり予算を入力。NULL（無制限）を許容。`trips.budget_per_person` に対応。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `value` | `number \| null` | `null` | 予算（円）、null = 無制限 |
| `onChange` | `(value: number \| null) => void` | — | 変更ハンドラ |

---

#### `PreferenceSelector`

優先軸（scenic / onsen / gourmet 等）を複数選択。`trips.preferences` に対応。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `value` | `string[]` | `[]` | 選択中の優先軸リスト |
| `onChange` | `(value: string[]) => void` | — | 変更ハンドラ |

---

### 4-3. 旅行プランドメイン（`components/trip/`）

#### `TripCard`

マイページのプラン一覧カード。出発地・都道府県・出発日・人数を表示。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `trip` | `Trip` | — | 旅行プランオブジェクト |
| `onClick` | `() => void` | — | カードクリックハンドラ |
| `onDelete` | `() => void` | — | 削除ハンドラ |

---

#### `TripForm`

プラン新規作成・編集フォーム。`PrefectureTagInput`・`VehicleSelector`・`DateRangePicker`・`BudgetInput`・`PreferenceSelector` を内包。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `initialValues` | `Partial<TripFormValues>` | — | 初期値（編集時） |
| `isSubmitting` | `boolean` | `false` | 送信中フラグ |
| `onSubmit` | `(values: TripFormValues) => void` | — | 送信ハンドラ |

---

#### `TripEmptyState`

マイページにプランが存在しない場合の空状態表示。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `onCreateClick` | `() => void` | — | プラン作成ボタンのクリックハンドラ |

---

### 4-4. ルート候補ドメイン（`components/route/`）

#### `RouteCard`

ルート候補1件のカード表示。スコア・総距離・所要時間・1人あたり費用を表示。`routes` に対応。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `route` | `Route` | — | ルートオブジェクト |
| `isSelected` | `boolean` | `false` | 選択状態 |
| `isConfirmed` | `boolean` | `false` | 確定済みフラグ |
| `onClick` | `() => void` | — | カードクリックハンドラ |

---

#### `RouteScoreBadge`

ルートの総合スコア（0〜1）をバッジ表示。スコア帯で色が変わる。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `score` | `number` | — | 総合スコア（0.0〜1.0） |

---

#### `CostBreakdownPanel`

費用内訳（燃料費・高速料金・駐車料金・入場料）の詳細パネル。`routes.cost_breakdown_json` に対応。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `breakdown` | `CostBreakdown` | — | 費用内訳オブジェクト |
| `people` | `number` | — | 参加人数（1人あたり換算表示に使用） |

---

#### `RouteConfirmButton`

ルートを確定するボタン。確定済みの場合は確定済み表示に切り替わる。`routes.is_confirmed` に対応。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `isConfirmed` | `boolean` | `false` | 確定済みフラグ |
| `isLoading` | `boolean` | `false` | 処理中フラグ |
| `onConfirm` | `() => void` | — | 確定ハンドラ |

---

### 4-5. 経由地・POIドメイン（`components/stop/`）

#### `StopListItem`

ルート内の各経由地の1行表示。訪問順序・スポット名・滞在時間・駐車料金・入場料を表示。`route_stops` に対応。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `stop` | `RouteStop` | — | 経由地オブジェクト |
| `poi` | `Poi` | — | POI情報 |
| `isRestStop` | `boolean` | `false` | 休憩フラグ（SA・道の駅） |

---

#### `PoiCard`

POIの詳細カード。スポット名・カテゴリ・Google評価・営業時間を表示。`pois` に対応。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `poi` | `Poi` | — | POIオブジェクト |
| `onClick` | `() => void` | — | カードクリックハンドラ |

---

#### `DayGroupHeader`

複数日旅行時の「Day 1」「Day 2」などの日付区切りヘッダー。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `dayNumber` | `number` | — | 日数（1始まり） |
| `date` | `string` | — | 対応する日付（ISO 8601） |

---

### 4-6. 共有URLドメイン（`components/share/`）

#### `ShareButton`

共有URLを生成・コピーするボタン。`shares` レコード作成のトリガー。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `routeId` | `string` | — | 共有対象のルートID |
| `isLoading` | `boolean` | `false` | URL生成中フラグ |
| `onShare` | `() => void` | — | 共有ハンドラ |

---

#### `ShareExpiryBadge`

共有URLの有効期限を表示するバッジ。期限切れ間近・失効済みで色が変わる。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `expiresAt` | `string` | — | 有効期限（ISO 8601） |

---

### 4-7. レイアウト（`components/layout/`）

#### `PageHeader`

各ページ上部のヘッダー。タイトル・戻るボタン・右側アクションを配置。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `title` | `string` | — | ページタイトル |
| `showBack` | `boolean` | `false` | 戻るボタン表示フラグ |
| `rightAction` | `ReactNode` | — | 右側アクション（共有ボタン等） |
| `onBack` | `() => void` | — | 戻るハンドラ |

---

#### `BottomNav`

スマートフォン向けボトムナビゲーション。マイプラン・新規作成の導線を提供。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `activeTab` | `"trips" \| "new"` | — | アクティブタブ |
| `onTabChange` | `(tab: string) => void` | — | タブ変更ハンドラ |

---

#### `SectionDivider`

セクション間の区切り線。ラベル付き・なしを選択可能。

| Prop | 型 | デフォルト | 説明 |
|------|----|----------|------|
| `label` | `string` | — | 区切りラベル（省略可） |

---

## 5. スコープ外

- 各コンポーネントの実装（別チケット）
- スタイルテーマ・カラートークンの定義
- Storybook のセットアップ
