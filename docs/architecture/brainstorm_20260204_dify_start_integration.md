# 🧠 Brainstorm: Start画面 × Difyチャット統合

**作成日**: 2026-02-04  
**対象機能**: Start画面からのDifyチャットワークフロー統合  
**プロジェクト**: AI Consulting Zero

---

## プロジェクトコンテキスト

- **技術スタック**: Next.js 16 + TypeScript + Supabase + Dify
- **ファイル保護レベル**: レベル3（新規実装）〜レベル2（既存API修正）
- **関連ファイル**: 
  - `app/consulting/start/page.tsx`（レベル3）
  - `app/api/dify/context/route.ts`（レベル2・参照のみ）
  - 新規: `app/api/dify/chat/stream/route.ts`（レベル3）

---

## 要件サマリー

ユーザーから以下の要望を受けました:

**要望の整理**:
1. **Start画面からDifyへの実装手順を計画**
   - Start画面が新しくなった（新規/既存ボタン、タブ管理、セッション管理）
   - この新UIでDifyとのチャットを実現

2. **Difyはチャットワークフロー形式**
   - ワークフロー: チャット形式で設計
   - UI操作: Start画面で実施（Dify UIは使わない）
   - Start画面 ↔ Dify間でリアルタイムにメッセージやり取り

3. **必要なパラメータの検討**
   - Start画面から何をDifyに送るか
   - Difyから何を受け取るか

4. **Supabaseのテーブル/フィールド追加検討**
   - Difyとのやり取りを保存する構造
   - 既存の `consulting_sessions`、`consulting_messages` で足りるか
   - 追加フィールドが必要か

---

## 現状分析

### Start画面の現在の実装（2026-02-04時点）

**UI構造**:
```
┌────────────────────────────────────────────────────────────┐
│ ラベル行                                                   │
│ [新規] [既存]  [タブ1: 新規相談] [タブ2: 売上] ... [履歴] │
├─────────────┬─────────────────────────┬────────────────────┤
│ 左サイド    │ 中央チャットエリア       │ 右コンテキスト     │
│ (Steps)     │ (Messages)              │ (TabbedContext)    │
│             │                         │                    │
│ STEP 1-5    │ AI/User Messages        │ インサイト         │
│             │ + Input                 │ 予算・ファイル     │
│             │ + 添付ファイル          │ 検索               │
│             │ + 音声入力              │                    │
└─────────────┴─────────────────────────┴────────────────────┘
```

**データ構造**:
```typescript
type SessionData = {
  id: string
  name: string
  progress: number
  currentStepId: number
  messages: Message[]
  kpis: KPI[]
  steps: ConsultingStep[]
  lastUpdated: Date
  createdAt: Date
  isPinned: boolean
  isOpen: boolean
  status: SessionStatus
  completedAt?: Date
}

type Message = {
  id: number
  type: "ai" | "user"
  content: string
  timestamp: Date
  interactive?: {
    type: "buttons" | "form" | "chart" | "category-buttons"
    data?: CategoryData[] | string[]
  }
}
```

**現在の動作**:
- 新規ボタン → 新規セッション作成（ローカルのみ）
- 既存ボタン → API `/api/consulting/sessions` から履歴取得
- メッセージ送信 → ローカルstate更新のみ（Dify連携なし）
- 添付ファイル → File[]でローカル保持

### 既存のDify統合状況

**既存API**: `/api/dify/context/route.ts`
- **目的**: 初期コンテキスト取得（ユーザー・会社情報など）
- **呼び出し元**: Difyワークフローから
- **認証**: x-api-key ヘッダー
- **データ**: profiles, companies, webResources, conversationHistory等

**問題点**:
- ❌ Start画面から直接呼んでいない
- ❌ リアルタイムチャットには対応していない（1回の情報取得のみ）
- ❌ メッセージのやり取りがSupabaseに保存されていない

### Supabase現状テーブル

**`consulting_sessions`**:
```sql
- id, user_id, company_id
- title, session_type, status
- analysis_summary, key_insights, recommendations
- message_count
- created_at, updated_at
```

**`consulting_messages`**:
```sql
- id, session_id
- role (user/assistant/system)
- content, attachments (JSONB)
- analysis_type, confidence_score
- created_at
```

**不足点**:
- ❌ Dify conversation_id との紐付けフィールドがない
- ❌ Difyワークフローとのやり取り履歴がない
- ❌ ステップ進捗（currentStepId）が保存されていない
- ❌ KPIデータの保存先がない
- ❌ `status` の値が異なる（'active', 'paused', 'completed', 'cancelled' vs 'active', 'completed', 'archived'）

---

## 逆質問リスト

### 1. 機能要件

**Q1-1: Difyとのやり取りの流れ**
- Start画面で「新規」ボタン押下 → すぐにDifyチャット開始？
- それとも、カテゴリ選択後にDify開始？
- 現在の「こんにちは！AIコンサルティング...」メッセージはDifyが生成？それともフロント固定？

**Q1-2: メッセージ送信のトリガー**
- ユーザーがInputエリアで「Send」 → 即座にDifyに送信？
- それとも、特定のステップでのみDifyを呼ぶ？
- インタラクティブボタン（カテゴリ選択等）もDifyに送る？

**Q1-3: Difyの応答表示**
- Difyからのストリーミング応答をリアルタイム表示？
- それとも全文取得後に一括表示？
- インタラクティブな要素（ボタン、フォーム）はDifyが指示？それともフロント固定？

**Q1-4: セッション管理**
- 1セッション = 1 Dify conversation？
- Difyの conversation_id はどこに保存？
- タブを閉じてもDify会話は継続？それとも終了？

### 2. 技術整合性（Next.js/Supabase/Dify）

**Q2-1: Difyワークフローの種類**
- チャットボット型ワークフロー？
- それともチャットフロー（Chatflow）型？
- ストリーミングAPIを使用？

**Q2-2: APIエンドポイント設計**
- 新規API: `/api/dify/chat/stream` を作成？
- 既存の `/api/dify/context` を拡張？
- Server-Sent Events（SSE）で実装？

**Q2-3: リアルタイム更新**
- Difyからの応答中、UI をリアルタイム更新？
- Supabaseへの保存タイミングは？（毎メッセージ？セッション終了時？）

### 3. セキュリティ・データ保護

**Q3-1: 認証フロー**
- Start画面 → APIへの認証はどうする？
- 現在の `/api/consulting/sessions` と同じ認証？
- Difyへの認証はサーバーサイドのみ？

**Q3-2: データ保存範囲**
- ユーザーメッセージ: 全て保存？
- AIメッセージ: 全て保存？
- 添付ファイル: Supabase Storage？それともDify？

### 4. ファイル影響範囲

**Q4-1: Start画面の変更**
- `handleSendMessage` 関数を書き換え？
- 新しいhook（`useDifyChat`）を作成？
- 既存のMessage型を拡張？

**Q4-2: Supabaseスキーマ変更**
- `consulting_sessions` に追加フィールド必要？
  - `dify_conversation_id`?
  - `current_step_id`?
  - `kpis`（JSONB）?
  - `status` の値を変更（'paused', 'cancelled' 追加）？
- `consulting_messages` に追加フィールド必要？
  - `interactive_data`（JSONB）?
  - `message_order`（INT）?

### 5. パフォーマンス・UX

**Q5-1: ローディング状態**
- Dify応答待ち中の表示は？
- タイピングインジケーター表示？
- タイムアウト設定は？

**Q5-2: エラーハンドリング**
- Dify APIエラー時の挙動は？
- リトライ処理は必要？
- ユーザーへのエラー表示方法は？

### 6. スコープ

**Q6-1: やること**
- Start画面でのDifyチャット統合
- Supabaseへのメッセージ保存
- セッション管理の統合

**Q6-2: やらないこと**
- Difyワークフロー自体の作成（別途手動で作成）
- 音声入力の拡張（既存機能はそのまま）
- ファイル分析の自動化（Phase 2以降）

---

## 回答サマリー

**（ユーザーからの回答を待っています）**

以下の点について確認が必要です:

### 【最優先】
1. Difyとのやり取りの開始タイミング（新規ボタン直後？カテゴリ選択後？）
2. Difyワークフローの形式（チャットボット？チャットフロー？）
3. ストリーミング応答の必要性（リアルタイム表示？一括表示？）

### 【重要】
4. セッションとDify conversation の紐付け方
5. Supabaseへの保存タイミング（毎メッセージ？まとめて？）
6. インタラクティブ要素（ボタン・フォーム）の制御元（Dify指示？フロント固定？）

### 【補足】
7. エラーハンドリングとリトライ戦略
8. ローディング状態のUX

---

## 暫定的な確定要件（仮）

**前提**: ユーザー回答前の暫定案

1. **Difyチャット開始タイミング**: 
   - 新規ボタン押下 → カテゴリ選択ボタン表示
   - カテゴリ選択 → Difyチャット開始
   - Difyが初回メッセージ生成

2. **メッセージフロー**:
   - ユーザー入力 → Start画面 → API → Dify → ストリーミング応答 → Start画面に表示
   - 各メッセージをSupabaseに保存

3. **API設計**:
   - 新規: `/api/dify/chat/stream`（SSE）
   - Dify チャットフローAPIを呼び出し
   - ストリーミングでフロントに返す

4. **Supabase拡張**:
   - `consulting_sessions` に `dify_conversation_id` 追加
   - `status` の値を統一（'paused', 'cancelled' 追加）
   - `current_step_id`、`kpis` 追加

---

## スコープ外（暫定）

1. **Difyワークフロー作成**: 手動で作成（この実装とは別）
2. **音声入力の拡張**: 既存機能をそのまま使用
3. **添付ファイルのDify送信**: Phase 2以降
4. **KPI自動更新**: Phase 2以降
5. **レポート自動生成**: Phase 2以降

---

## ファイル影響範囲（暫定）

### 新規作成
- `app/api/dify/chat/stream/route.ts`: Difyチャットストリーミ ngAPI
- `hooks/useDifyChat.ts`: Start画面でのDifyチャット管理hook
- `lib/dify/chat-client.ts`: Difyチャットクライアント
- `supabase/migrations/20260204_add_dify_fields.sql`: スキーマ追加

### 変更対象
- `app/consulting/start/page.tsx`: Dify統合 - 保護レベル3
- `types/database.types.ts`: 型定義追加 - 保護レベル3

### 参照のみ
- `app/api/dify/context/route.ts`: 既存の初期コンテキスト取得API
- `supabase/schema.sql`: 既存スキーマ確認

---

## 技術選定（暫定）

| カテゴリ | 選定技術 | 理由 | 制約 |
|---------|---------|------|------|
| Dify通信 | Dify Chat API（SSE） | リアルタイム応答 | ストリーミング対応必須 |
| フロント通信 | Server-Sent Events | 一方向ストリーム | Next.js Route Handler対応 |
| セッション保存 | Supabase `consulting_sessions` | 既存テーブル拡張 | フィールド追加必要 |
| メッセージ保存 | Supabase `consulting_messages` | 既存テーブル使用 | フィールド追加検討 |
| State管理 | React useState + custom hook | シンプル | 既存パターン踏襲 |

---

## データフロー（暫定案）

```
1. 新規ボタンクリック
   ↓
2. カテゴリ選択ボタン表示（フロント固定）
   ↓
3. カテゴリ選択 → Supabaseにセッション作成
   ↓
4. /api/dify/chat/stream を呼び出し
   - 初期コンテキスト（/api/dify/context から取得）
   - カテゴリ情報
   - セッションID
   ↓
5. Difyチャットフロー開始
   - conversation_id 生成
   - 初回AIメッセージ生成（ストリーミング）
   ↓
6. SSEでフロントに返却
   - メッセージをリアルタイム表示
   - Supabaseに保存
   ↓
7. ユーザー入力 → /api/dify/chat/stream
   - conversation_id を含める
   - Difyに送信
   ↓
8. Dify応答 → SSE → フロント表示 → Supabase保存
   ↓
9. 繰り返し（ステップ進行）
```

---

## 主要な技術的課題

### 課題1: Start画面とDifyの統合方法
- **現状**: Start画面はローカルstate管理
- **必要**: Dify APIとのリアルタイム通信
- **解決案**: custom hook（useDifyChat）で API呼び出しとstate管理を分離

### 課題2: インタラクティブ要素の制御
- **現状**: フロントで固定のボタン・フォームを表示
- **Dify**: チャットフローでインタラクティブ要素を指示可能
- **解決案**: 初期実装はフロント固定、Phase 2でDify指示に対応

### 課題3: セッションとconversationの紐付け
- **現状**: Supabase session_id のみ
- **必要**: Dify conversation_id との対応
- **解決案**: `consulting_sessions.dify_conversation_id` フィールド追加

### 課題4: ステップ進行の管理
- **現状**: フロントのみで管理（currentStepId）
- **必要**: Supabaseに保存して復元可能に
- **解決案**: `consulting_sessions.current_step_id` フィールド追加

### 課題5: statusの値の不一致
- **現状Start画面**: 'active', 'paused', 'completed', 'cancelled'
- **現状Supabase**: 'active', 'completed', 'archived'
- **解決案**: Supabaseスキーマを修正（'paused', 'cancelled' 追加、'archived' 廃止または併存）

---

## セキュリティ考慮点

- **環境変数**: 
  - `DIFY_API_URL`: Difyインスタンスのベース URL
  - `DIFY_API_KEY`: Dify APIキー（既存）
  - サーバーサイドのみで使用
  
- **認証フロー**:
  - Start画面 → Next.js API: Supabase Auth（既存）
  - Next.js API → Dify: x-api-key（既存）
  
- **データ保護**:
  - 添付ファイルはSupabase Storage（RLS有効）
  - メッセージはSupabase（RLS有効）
  - Dify conversation_id は機密扱い（ログに出さない）

---

## 次のステップ

### 【この Brainstorm 完了後】

1. **ユーザーに逆質問を投げる**
   - 上記の逆質問リストを提示
   - 回答を得て要件を確定

2. **Design フェーズへ**
   - アーキテクチャ設計
   - データフロー詳細化
   - API仕様策定

3. **Plan フェーズへ**
   - タスク分解
   - 実装順序決定
   - ファイル変更計画

4. **Implement フェーズへ**
   - コード実装
   - テスト
   - デプロイ

---

**次のアクション**: ユーザーに逆質問リストを提示し、回答を得る
