# 🎨 Design: Dify初期コンテキスト拡張（Phase 1）

## アーキテクチャ図（概略）

```
[Dify Workflow / Chat]
        |
        | HTTP POST (userId, isNewCase, initialIssue?)
        v
[Next.js API] /api/dify/context
        |
        | createClient()（Supabase Server Client）
        v
  +-----------------------------+
  | 1. getBaseContext           |
  |    - profiles               |
  |    - companies              |
  |    - company_web_resources  |
  |    - business_cards         |
  +-----------------------------+
        |
        | userId
        v
  +-----------------------------+
  | 2. getConversationHistory   | (継続案件のみ)       |
  |    - consulting_sessions                       |
  |    - consulting_messages                       |
  |    - reports                                   |
  +-----------------------------+
        |
        | userId
        v
  +-----------------------------+
  | 3. getExternalInformation   |
  |    - dashboard_data(market) |
  |    - dashboard_data(local)  |
  +-----------------------------+
        |
        | userId
        v
  +-----------------------------+
  | 4. getInitialEvaluationData |
  |    - digital_scores         |
  |    - diagnostic_reports     |
  |    - dashboard_data(swot?)  |
  +-----------------------------+
        |
        v
 [JSONレスポンス data = {
    profile, company, webResources, businessCards,
    conversationHistory,
    externalInformation,
    initialEvaluation,
    initialIssue
 }]
```

## モジュール構成

### 1. `/api/dify/context/route.ts`

- **責務**:
  - Dify からの初期コンテキスト取得リクエストを受け付ける
  - Supabase から必要な情報を集約し、1つの JSON に統合して返す
  - 新規案件 / 継続案件の両方に対応する
- **依存**:
  - `@/lib/supabase/server`
  - Supabase テーブル: `profiles`, `companies`, `company_web_resources`, `business_cards`,
    `consulting_sessions`, `consulting_messages`, `reports`,
    `dashboard_data`, `digital_scores`, `diagnostic_reports`
- **保護レベル**: レベル3（APIルート、慎重に扱うが変更可能）

### 2. 追加ヘルパー関数（本ファイル内）

#### `getExternalInformation(supabase, userId): Promise<ExternalInformation | null>`

- **責務**:
  - `profiles` から `company_id` を取得
  - `dashboard_data` から `market` / `local_info` の最新キャッシュを取得
  - 仕様書の `ExternalInformation` 形式に近い形で整形する
- **依存**:
  - `profiles`, `dashboard_data`

#### `getInitialEvaluationData(supabase, userId): Promise<InitialEvaluationData | null>`

- **責務**:
  - `profiles` から `company_id` を取得
  - `digital_scores` 最新1件を読み取り、スコアをまとめる
  - `diagnostic_reports` 最新数件を要約してリスト化する
  - （可能であれば）`dashboard_data` の `swot_analysis` キャッシュも取得する
- **依存**:
  - `profiles`, `digital_scores`, `diagnostic_reports`, `dashboard_data`

## 技術選定（プロジェクト制約考慮）

| カテゴリ       | 選定技術                         | 理由                                           | 制約                             |
|----------------|----------------------------------|------------------------------------------------|----------------------------------|
| DBアクセス     | Supabase Server Client           | 既存実装と統一・RLS考慮済み                    | テーブルスキーマに依存          |
| キャッシュ     | `dashboard_data` テーブル        | 既存ダッシュボードAPIと同じ仕組みを再利用     | スキーマ更新時の影響に注意      |
| ランタイム     | Next.js API Route (Node.js)      | 既存の `/api/dify/context` と同一              | Edge Runtime ではない            |
| 認証           | `x-api-key`（DIFY_API_KEY）      | 既存仕様を踏襲                                 | 環境変数が必須                   |

## データフロー詳細

1. **リクエスト受信**
   - `POST /api/dify/context`
   - Body: `{ userId: string, isNewCase?: boolean, initialIssue?: {...} }`
   - Header: `x-api-key: DIFY_API_KEY`

2. **バリデーション & APIキー検証**
   - `userId` 必須
   - `x-api-key` が `process.env.DIFY_API_KEY` と一致すること

3. **基本コンテキスト取得**
   - `getBaseContext(supabase, userId)` を実行し、
     `profile`, `company`, `webResources`, `businessCards` を取得

4. **会話履歴取得（継続案件のみ）**
   - `isNewCase` が `false` の場合のみ `getConversationHistory` を実行

5. **外部情報取得**
   - `getExternalInformation(supabase, userId)`
   - `dashboard_data` から `market` / `local_info` を取得し、  
     為替・原材料・地域イベント・労務費・天候 等をまとめる

6. **初回評価情報取得**
   - `getInitialEvaluationData(supabase, userId)`
   - `digital_scores`・`diagnostic_reports`（＋必要なら `dashboard_data.swot_analysis`）から  
     スコア・レポートサマリーを統合

7. **新規課題内容の埋め込み**
   - Body の `initialIssue` があれば、そのまま `data.initialIssue` として含める  
     （`createdAt` が無い場合はサーバー側時刻で補完）

8. **レスポンス返却**
   - `DifyContextResponse` に準拠した JSON を返す

## セキュリティ考慮点

- 個人情報（メールアドレス・電話番号など）は既存と同じ範囲に留める
- レポート本文などの詳細テキストは、可能な範囲で「要約 or スコア中心」に絞る
- Dify 側には **最低限の会社識別情報＋診断スコア＋サマリー** を渡すイメージで実装

## ファイル変更計画（Phase 1）

### 新規作成（完了）
- `docs/architecture/brainstorm_20260128_dify-initial-context.md`: Brainstorm
- `docs/architecture/design_20260128_dify-initial-context.md`: 本ドキュメント

### 変更対象
- `app/api/dify/context/route.ts`
  - `DifyContextResponse` 型定義に `externalInformation`, `initialEvaluation`, `initialIssue` を追加
  - `POST` ハンドラ内で `getExternalInformation`, `getInitialEvaluationData` を呼び出す
  - `initialIssue` を Body から受け取り `data` に含める
  - 追加ヘルパー関数（2つ）を実装

### 参照のみ
- `app/api/dashboard/*.ts`: 外部情報の構造・`dashboard_data` への保存形式の参考
- `types/database.types.ts`: テーブルスキーマの確認（ただし実 DB 定義優先）

