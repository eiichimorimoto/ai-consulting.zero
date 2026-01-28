# 🧠 Brainstorm: Dify初期コンテキスト拡張（Phase 1）

## 要件サマリー
新規相談開始時に Dify ワークフローから `/api/dify/context` を呼び出し、  
従来の「プロフィール・会社情報・Web情報・名刺・（継続時）会話履歴」に加えて、  
以下の情報をコンテキストとして返せるようにする。

- 外部情報（マーケット・地域情報 等）のうち **バックエンドで安全に取得できるもの**
- 初回評価情報（デジタル診断スコア・SWOT・診断レポート・Webサイト分析）の要約
- 新規課題内容（Initial Issue）の明示的な埋め込み（リクエストボディ経由）

今回のフェーズでは **API `/api/dify/context` のみを拡張対象**とし、  
添付ファイル処理やフロントエンド側の送信ロジックは後続フェーズ（Phase 2〜3）とする。

## 逆質問リスト
1. **機能要件**
   - Dify 側からは現在と同じように `/api/dify/context` を叩くだけでよいか？
   - 追加コンテキスト（externalInformation / initialEvaluation / initialIssue）は  
     すべて `data` オブジェクトの中にネストされた形で返してよいか？
2. **技術整合性**
   - `/api/dify/context` は **サーバーサイド専用（Node.js runtime）** のままで問題ないか？
   - 既存の Supabase クライアント（`@/lib/supabase/server`）の使い方は他エンドポイントと揃えるべきか？
3. **セキュリティ**
   - どこまでの評価情報を Dify に渡してよいか（レポート本文の全文 / 要約のみ など）の線引きは？
   - コンテキストとして渡す際に「個人名やメールアドレスを含む生データ」はマスクすべきか？
4. **ファイル影響**
   - Phase 1 では **`app/api/dify/context/route.ts` 1ファイルのみを変更対象**とする認識で問題ないか？
   - DB テーブル（`digital_scores`, `diagnostic_reports`, `diagnosis_previews`, `dashboard_data`）の  
     取得方法は、既存のダッシュボード API 実装と整合させる形でよいか？
5. **パフォーマンス**
   - `/api/dify/context` 呼び出し頻度は高くない想定だが、  
     外部情報・評価情報の取得は **極力キャッシュ（`dashboard_data` など）を優先**してよいか？
6. **スコープ**
   - Phase 1 では「外部情報」は最低限 **マーケット（market）と地域情報（local_info）** に絞り、  
     `industry-trends`, `world-news`, `industry-forecast` は **将来拡張用フィールドとして空許可**でよいか？

## 回答サマリー（仮定）
※ ユーザーからの明示回答がない部分は、以下のように仮定して進める。

- `/api/dify/context` のエンドポイント仕様（URL・HTTPメソッド・APIキー認証）は現状維持
- Dify 側は `data` 以下の JSON 構造を柔軟に扱えるため、  
  `externalInformation`, `initialEvaluation`, `initialIssue` を追加しても後方互換性は保てる
- セキュリティ上の観点から、レポート本文などの重いテキストは **要約 or スコア中心**で渡す
- 1リクエスト内での DB アクセス数が増えるため、  
  取得順序は「プロフィール → company_id 特定 → 各種キャッシュ・診断結果を company_id ベースで取得」とする
- Phase 1 のコード変更は `app/api/dify/context/route.ts` のみとし、  
  他の API エンドポイントやフロントエンドには手を入れない

## 確定要件（Phase 1）
- `/api/dify/context` のレスポンス `data` に以下を追加
  - `externalInformation?: ExternalInformation | null`
  - `initialEvaluation?: InitialEvaluationData | null`
  - `initialIssue?: InitialIssue | null`
- `POST` リクエストボディで以下を受け取れるようにする
  - `userId: string`（既存）
  - `isNewCase?: boolean`（既存）
  - `initialIssue?: { content: string; category: string; categoryLabel: string; createdAt?: string }`
- `getBaseContext` を拡張して **company_id をメタ情報として返却**し、  
  それを元に `getExternalInformation`, `getInitialEvaluationData` で DB を参照する
- DB から取得する主な情報
  - `dashboard_data`（`data_type` = 'market', 'local_info'）
  - `digital_scores`（最新1件）
  - `diagnostic_reports`（最新数件）
  - `diagnosis_previews`（最新1件）

## スコープ外（今フェーズではやらないこと）
- 添付ファイルアップロード処理（Supabase Storage 連携・OCR 等）
- `app/consulting/start/page.tsx` での `handleInitialIssueSubmit` 拡張
- Dify ワークフロー側の入力スキーマ・プロンプト修正
- ダッシュボード API 側（`/api/dashboard/*`）の仕様変更や追加キャッシュ実装

## ファイル影響範囲
- 変更対象:
  - `app/api/dify/context/route.ts`（保護レベル3相当 / APIルート）
- 参照のみ:
  - `docs/dify-initial-context-specification.md`
  - `app/api/dashboard/*/route.ts`（実装参考・キャッシュ構造の把握）
  - `types/database.types.ts`（テーブルスキーマの確認）
  - `supabase/20260114_add_dashboard_data_table.sql`（`dashboard_data` テーブル定義）

