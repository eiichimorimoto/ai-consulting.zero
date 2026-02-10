# 🎨 Design: プラン別制限と表示（相談/アカウント連携）

## アーキテクチャ概要

```text
[Supabase auth.users]──┐
                        │
                 ┌──────▼─────────────┐
                 │   profiles         │
                 │  - id (PK)        │
                 │  - plan_type      │ free / standard / enterprise
                 │  - monthly_chat_count
                 │  - monthly_ocr_count
                 └──────┬─────────────┘
                        │ 1
                        │
                n       │
[consulting_sessions]───┘
        │ id, user_id, created_at, status ...
        │
        └─< [consulting_messages]
               role, content, step_round ...
```

- プラン情報・利用上限は `profiles.plan_type` と、新規モジュール `lib/plan-config.ts` で管理。
- 「今月の課題数」は `consulting_sessions` の `created_at` を元に COUNT。
- 「今月のAI相談回数」は `profiles.monthly_chat_count` を利用（AI回答ごとに +1 済み）。
- UI からは `SettingsContent` を入口に、アカウント情報とプラン情報をまとめて表示する。

## モジュール設計

### 1. `lib/plan-config.ts`（新規）

**責務**
- プランごとのメタ情報と上限値を集中管理する。

**インターフェース（想定）**

```ts
export type PlanType = 'free' | 'standard' | 'enterprise'

export interface PlanLimits {
  maxSessions?: number
  maxTurnsPerSession?: number
  maxTurnsTotal?: number
  isUnlimited?: boolean
}

export interface PlanMeta extends PlanLimits {
  id: PlanType
  label: string          // 表示名（Free / Pro / Enterprise）
  priceLabel: string     // 「¥0」「¥35,000/月」等
  description: string    // 一行の要約
}

export const PLAN_CONFIG: Record<PlanType, PlanMeta>

export function getPlanMeta(planType: string | null | undefined): PlanMeta
export function getPlanLimits(planType: string | null | undefined): PlanLimits
```

**備考**
- 既存の `getPlanName`（SettingsContent 内）とは重複するので、徐々に `PlanMeta.label` に寄せていく。
- `standard` を「Pro」として表示する。

### 2. API 層

#### 2-1. `app/api/consulting/sessions/route.ts`（新規セッション作成）

**責務**
- 新規相談セッションを作成する際に、「今月の課題数（セッション数）上限」をチェックする。

**処理フロー（追加部分のみ）**

1. Supabase クライアントでログインユーザーを取得。
2. `profiles` から `plan_type` を取得。
3. `getPlanLimits(plan_type)` で `maxSessions` を取得。
4. `maxSessions` が undefined（Enterprise）の場合は制限チェックをスキップ。
5. `consulting_sessions` から
   - `user_id = currentUser.id`
   - `created_at` が「当月」である行を COUNT。
6. `count >= maxSessions` の場合:
   - `400` などでエラーを返し、メッセージに  
     「回数制限を超えました。アカウントのプランをご覧ください。」を含める。
7. 問題なければ通常どおりセッションを INSERT。

#### 2-2. `app/api/consulting/sessions/[id]/messages/route.ts`（既存）

**責務（追加分）**
- メッセージ送信時に「今月の AI相談回数上限」をチェックし、超過時は Dify を呼ばずにメッセージを返す。

**処理フロー（POST 内の拡張）**

1. 認証・セッション所有権チェックは既存のまま。
2. Dify 呼び出し前に以下を追加:
   - `profiles` から `plan_type`, `monthly_chat_count` を取得。
   - `getPlanLimits(plan_type)` から `maxTurnsTotal` を取得。
   - Enterprise（`isUnlimited`）ならこのチェックをスキップ。
   - `remaining = maxTurnsTotal - monthly_chat_count` を計算。
   - `remaining <= 0` の場合:
     - ユーザーメッセージだけは保存（ログ用途）するかは要件次第だが、シンプルに「AI応答を生成せず」エラーを返す。
     - レスポンス:  
       - `status: 400`  
       - `error: 'limit_exceeded'` などのコード  
       - `message: '回数制限を超えました。アカウントのプランをご覧ください。'`
3. 既存の Dify 呼び出しと AI メッセージ保存は、制限を超えていない場合のみ実行。

> 初期実装では「総AI相談回数」のみチェックし、1セッションあたりの 15/30 往復制限は後続タスクに回す。

## UI 設計

### 1. アカウント設定画面（`SettingsContent.tsx`）

**1-1. プラン情報タブの強化**

- 既存のプランタブで、次を表示:
  - 現在のプラン名（Free / Pro / Enterprise）
  - プランの説明文（ユーザーが提示した文）
  - 月額料金ラベル（例: 「¥0」「¥35,000/月・年払い¥30,000/月」）
  - 機能一覧（箇条書き）

**1-2. 利用状況の表示**

- `profiles` から渡される値および API から集計した値を使って:
  - 「今月の課題数: X / maxSessions（Enterprise の場合は「制限なし」）」
  - 「今月のAI相談: monthly_chat_count / maxTurnsTotal（Enterprise は「制限なし」）」
  - 「既存の課題であと remaining 回 AI に相談できます」（Enterprise では非表示 or 「制限なし」）
- これらは「アカウント情報」「プラン情報」いずれかのカード内にまとめて表示。

### 2. 設定タブの sticky 化

- `SettingsContent` の JSX 構造を確認し、`<TabsList>` を含むコンテナに以下を追加（例）:

```tsx
<div className="sticky top-0 z-20 bg-gray-50 pb-2">
  <TabsList ...>...</TabsList>
</div>
```

- ポイント:
  - 背景色をタブ周辺と揃える（`bg-white` or `bg-gray-50`）。
  - 下のコンテンツとの間にわずかな余白やボーダーを入れ、境界を明確にする。

## データフロー

1. ユーザーが相談を開始 → `POST /api/consulting/sessions`:
   - 認証
   - `profiles.plan_type` 取得 → `PlanLimits` 取得
   - 当月の `consulting_sessions` COUNT
   - 上限チェック → NG ならエラー応答（相談画面で表示）
   - OK なら新規セッション作成

2. 相談中にメッセージ送信 → `POST /api/consulting/sessions/[id]/messages`:
   - 認証 & 所有権チェック
   - `profiles.plan_type`, `monthly_chat_count` 取得
   - `PlanLimits` から `maxTurnsTotal` 取得
   - 上限チェック → NG なら Dify を呼ばずにエラー応答（相談画面側でトースト or メッセージ表示）
   - OK なら既存のフローどおり Dify 呼び出し・メッセージ保存・`monthly_chat_count` インクリメント

3. アカウント設定画面表示:
   - サーバー側でプロファイル取得時に `plan_type`, `monthly_chat_count` を含める（既に取得済み）。
   - 必要であれば当月の `consulting_sessions` COUNT を API 経由で取得し、`SettingsContent` に渡す。

## セキュリティ・制約

- 認証:
  - すべての API は `supabase.auth.getUser()` による認証チェックを必須とする（既存踏襲）。
- プラン情報:
  - `plan_type` は `supabase/schema.sql` の CHECK 制約に従い、`'free' | 'standard' | 'enterprise'` のみ。
  - 表示上の Pro / Enterprise は `PlanMeta.label` 側で制御。
- 決済連携:
  - 今回は決済システムとは直接連携しないため、**料金表示は UI レベルのラベルのみ**。

## 変更対象まとめ

- 新規:
  - `lib/plan-config.ts`
- 変更:
  - `app/api/consulting/sessions/route.ts`
  - `app/api/consulting/sessions/[id]/messages/route.ts`
  - `components/SettingsContent.tsx`

