# 📝 Implementation Plan: Dify初期コンテキスト拡張（Phase 1）

## プロジェクト構造（関連部分のみ）

```
app/
  api/
    dify/
      context/
        route.ts      # ← 今回の唯一のコード変更対象
    dashboard/
      market/route.ts
      local-info/route.ts
      swot-analysis/route.ts

docs/
  architecture/
    brainstorm_20260128_dify-initial-context.md
    design_20260128_dify-initial-context.md
  plans/
    implementation_plan_20260128_dify-initial-context.md  # ← 本ファイル
```

## タスクリスト

### Task 1: 型定義とインターフェースの追加
- **目的**: `/api/dify/context` のレスポンスに Phase 1 仕様のフィールドを表現できるようにする
- **依存**: なし
- **成果物**:
  - `app/api/dify/context/route.ts`
    - `ExternalInformation`, `InitialEvaluationData`, `InitialIssue` の3インターフェース定義
    - `DifyContextResponse` の `data` プロパティに新フィールドを追加
- **見積もり**: 15分
- **優先度**: 高
- **変更通知必須**: いいえ（レベル3・APIルートだが影響範囲が限定的）

### Task 2: 外部情報取得ヘルパーの実装
- **目的**: 既存のダッシュボードキャッシュ（`dashboard_data`）から外部情報を取り出し、Dify向けコンテキストに整形
- **依存**: Task 1
- **成果物**:
  - `app/api/dify/context/route.ts`
    - `getExternalInformation(supabase, userId)` の実装
    - `dashboard_data` テーブルの `market` / `local_info` を利用
- **見積もり**: 25分
- **優先度**: 高
- **変更通知必須**: いいえ（レベル3）

### Task 3: 初回評価情報取得ヘルパーの実装
- **目的**: デジタル診断スコア・診断レポートなどを集約し、`initialEvaluation` として返却
- **依存**: Task 1
- **成果物**:
  - `app/api/dify/context/route.ts`
    - `getInitialEvaluationData(supabase, userId)` の実装
    - `digital_scores` 最新1件
    - `diagnostic_reports` 最新数件
    - （可能であれば）`dashboard_data` の `swot_analysis` も取り込み
- **見積もり**: 25分
- **優先度**: 高
- **変更通知必須**: いいえ（レベル3）

### Task 4: `POST` ハンドラへの統合
- **目的**: 新規・継続案件の判定に応じて、既存の `baseContext`／`conversationHistory` に新フィールドを統合
- **依存**: Task 1〜3
- **成果物**:
  - `app/api/dify/context/route.ts`
    - リクエストボディから `initialIssue` を受け取るよう拡張
    - `getExternalInformation` / `getInitialEvaluationData` を `Promise.all` で並列実行
    - レスポンス `data` に `externalInformation`, `initialEvaluation`, `initialIssue` を含める
- **見積もり**: 20分
- **優先度**: 高
- **変更通知必須**: はい（レスポンス形式の拡張のため）

## 実装順序

1. **Task 1**（インターフェース・型定義）
   - 既存レスポンスに影響しない形で型だけ拡張
   - ビルドエラーが出ないことを確認
2. **Task 2**（外部情報）
   - `getExternalInformation` を実装
   - 一時的に `POST` ハンドラからは呼び出さず、型レベルでエラーがないことを確認
3. **Task 3**（初回評価情報）
   - `getInitialEvaluationData` を実装
   - 同様にビルドエラーがないことを確認
4. **Task 4**（統合）
   - `POST` ハンドラを最小限の変更で拡張
   - レスポンス構造が後方互換（既存フィールドは変更しない）であることを確認

## リスク管理

- `dashboard_data` / `digital_scores` / `diagnostic_reports` / `diagnosis_previews` のスキーマ差異
  - → 型定義（`types/database.types.ts`）はあくまで参考とし、クエリは最小限のカラムに限定
  - → 取得結果が `null` の場合は、そのサブフィールドを単純に `null` / 空配列として扱う
- レスポンスサイズ増大
  - → 当面は許容。もし Dify 側でトークン圧迫が問題になった場合、  
    コンテキストのサマリ化・フィールド削減を別フェーズで検討

