# 🧠 Brainstorm: Dify初期情報送信機能（Phase 1 完全版）

**作成日**: 2026-01-28  
**バージョン**: 2.0（完全版）  
**対応範囲**: Phase 1 - /api/dify/context 拡張 + Next.js → Dify Workflow API 呼び出し

---

## プロジェクトコンテキスト

- **技術スタック**: Next.js 16 + TypeScript + Supabase + Dify
- **ファイル保護レベル**: レベル3（新規作成のみ）
- **関連ファイル**: 
  - `/app/api/dify/context/route.ts`（既存拡張）
  - `/app/api/consulting/dify/route.ts`（新規作成）

---

## 要件サマリー

ユーザーが新規相談を開始する際、Difyに対して以下の情報を自動送信する：

### 送信情報（6カテゴリ）

1. **会社情報（Company）**
   - 基本情報、業種、従業員数、売上規模、課題など

2. **プロフィール情報（Profile）**
   - 名前、役職、部署、連絡先など

3. **外部情報（External）** ← Phase 1 で追加
   - マーケットデータ（為替、商品価格）
   - 地域情報（人件費、イベント、インフラ、天気）

4. **初回評価情報（Initial Evaluation）** ← Phase 1 で追加
   - デジタルスコア（Webサイトのパフォーマンス評価）
   - SWOT分析キャッシュ
   - 診断レポート（過去3件）
   - Webサイト分析（当面未使用）

5. **添付ファイル情報（Attachments）**
   - Phase 2 で実装予定

6. **初回課題内容（Initial Issue）** ← Phase 1 で追加
   - ユーザーが入力した最初の相談内容
   - カテゴリ、ラベル、作成日時

---

## 逆質問リストと回答

### 1. 機能要件
**Q**: 新規相談と継続相談で情報は変わる？  
**A**: 
- 新規相談: 基本情報 + 外部情報 + 初回評価 + 初回課題
- 継続相談: 上記 + 会話履歴（セッション、メッセージ、レポート）

### 2. 技術整合性
**Q**: Difyとの連携方法は？  
**A**: 
- **A案（採用）**: Next.jsアプリ → Dify Workflow API を呼び出し、`user_id` を渡す
- 理由: Difyの`sys.user_id`とSupabaseの`user_id`が異なるため、明示的に渡す必要がある

### 3. ファイル影響
**Q**: どのファイルに影響？  
**A**:
- `app/api/dify/context/route.ts`: 拡張（外部情報、初期評価、初期課題の取得ロジック追加）
- `app/api/consulting/dify/route.ts`: 新規作成（Dify Workflow API 呼び出しプロキシ）

### 4. セキュリティ
**Q**: 環境変数の扱いは？  
**A**:
- `DIFY_API_KEY`: `/api/dify/context` の認証用（Difyからの呼び出しを保護）
- `DIFY_WORKFLOW_API_KEY`: Next.js → Dify Workflow API の認証用（Bearer Token）
- すべてサーバーサイドのみ（`NEXT_PUBLIC_*` 不要）

### 5. パフォーマンス
**Q**: データ取得の並列化は？  
**A**: 
- `Promise.all` で並列取得:
  - 外部情報（dashboard_data: market, local_info）
  - 初回評価（digital_scores, diagnostic_reports, dashboard_data: swot_analysis）

### 6. スコープ
**Q**: Phase 1 の範囲は？  
**A**:
- ✅ `/api/dify/context` の拡張
- ✅ `/api/consulting/dify` の作成
- ✅ 環境変数設定
- ✅ ドキュメント作成
- ❌ フロントエンド実装（Phase 3）
- ❌ 添付ファイル処理（Phase 2）

---

## 確定要件

1. `/api/dify/context` に以下を追加:
   - `externalInformation`: マーケット・地域情報
   - `initialEvaluation`: デジタルスコア、SWOT、診断レポート
   - `initialIssue`: ユーザーの初回相談内容

2. `/api/consulting/dify` を新規作成:
   - Supabase認証チェック
   - Dify Workflow API 呼び出し（POST /v1/workflows/run）
   - `user_id` をinputsに注入

3. 環境変数設定:
   - `DIFY_API_KEY`: `/api/dify/context` の`x-api-key`認証用
   - `DIFY_WORKFLOW_API_KEY`: Dify Workflow API のBearer Token
   - `DIFY_API_BASE_URL`: Dify API のベースURL
   - `DIFY_WORKFLOW_ID`: 実行するワークフローのID

---

## スコープ外

- フロントエンド実装（Phase 3）
- 添付ファイル処理（Phase 2）
- Difyワークフロー内のLLMプロンプト設計
- ストリーミングレスポンス（将来的に検討）

---

## ファイル影響範囲

### 変更対象
- `app/api/dify/context/route.ts`: 
  - 新規インターフェース追加（ExternalInformation, InitialEvaluationData, InitialIssue）
  - 新規ヘルパー関数追加（getExternalInformation, getInitialEvaluationData）
  - POST ハンドラー拡張（並列取得、レスポンスに追加）
  - 保護レベル: 3（新規作成部分）

### 新規作成
- `app/api/consulting/dify/route.ts`:
  - Dify Workflow API 呼び出しプロキシ
  - Supabase認証チェック
  - user_id 注入
  - 保護レベル: 3（新規作成）

### 参照のみ
- `.env.local`: 環境変数確認・追加
- `lib/supabase/server.ts`: Supabase クライアント作成関数

---

## アーキテクチャ概要

```
【新規相談フロー】

1. ユーザー（ブラウザ）
   ↓ POST /api/consulting/dify
   ↓ { query: "相談内容", conversationId?: "xxx" }
   
2. Next.js API: /api/consulting/dify
   ↓ Supabase認証チェック（user.id取得）
   ↓ POST /v1/workflows/run（Dify API）
   ↓ { inputs: { user_id: "xxx", query: "相談内容" } }
   ↓ Authorization: Bearer {DIFY_WORKFLOW_API_KEY}
   
3. Dify Workflow
   ↓ HTTPリクエストノード
   ↓ POST https://your-domain/api/dify/context
   ↓ { userId: "{{user_id}}", isNewCase: true, initialIssue: {...} }
   ↓ x-api-key: {DIFY_API_KEY}
   
4. Next.js API: /api/dify/context
   ↓ APIキー認証
   ↓ Supabase データ取得
   ↓ - profile, company, webResources, businessCards（既存）
   ↓ - externalInformation（新規）
   ↓ - initialEvaluation（新規）
   ↓ - initialIssue（新規）
   ↓ JSON レスポンス
   
5. Dify Workflow
   ↓ LLMノードでコンテキストを活用
   ↓ 回答生成
   
6. Next.js API: /api/consulting/dify
   ↓ Difyからの回答を受信
   ↓ フロントエンドに返却
   
7. ユーザー（ブラウザ）
   ↓ 回答表示
```

---

## 技術的課題と解決策

### 課題1: Dify の sys.user_id と Supabase の user_id の不一致
**解決策**: 
- Next.jsアプリからDify Workflow APIを呼び出す際、明示的に`user_id`を渡す
- Difyワークフローの「ユーザー入力」に`user_id`変数を追加
- HTTPリクエストノードのBodyで`{{user_id}}`を使用

### 課題2: 外部情報のデータ構造が複雑
**解決策**:
- `dashboard_data.data`（JSONB）から必要なフィールドを抽出
- TypeScript型でガード（typeof チェック、配列チェック）
- データがない場合は`null`を返す（エラーにしない）

### 課題3: 初回評価情報の取得先が複数
**解決策**:
- `Promise.all`で並列取得:
  - `digital_scores`: デジタルスコア
  - `diagnostic_reports`: 診断レポート
  - `dashboard_data (data_type='swot_analysis')`: SWOTキャッシュ
- 各データがない場合でも他のデータは返す

---

## 次のステップ（Phase 2以降）

### Phase 2: 添付ファイル処理
- 添付ファイル情報の取得
- Difyへの添付ファイル送信（Base64 or URL）

### Phase 3: フロントエンド実装
- 相談開始画面のUI実装
- `/api/consulting/dify` への呼び出し実装
- ストリーミングレスポンス対応（検討）

### Phase 4: Dify ワークフロー最適化
- LLMプロンプトの改善
- コンテキスト情報の活用方法の最適化
- エラーハンドリングの強化

---

## まとめ

Phase 1では、Difyに対して新規相談時に必要な初期コンテキストを送信する基盤を構築しました。

**実装済み**:
- ✅ 外部情報（マーケット・地域）の取得
- ✅ 初回評価情報（デジタルスコア、SWOT、診断）の取得
- ✅ 初回課題内容の明示的な受け渡し
- ✅ Next.js → Dify Workflow API 呼び出しプロキシ
- ✅ user_id の明示的な注入

**今後の課題**:
- Phase 2: 添付ファイル処理
- Phase 3: フロントエンド実装
- Phase 4: Dify ワークフロー最適化
