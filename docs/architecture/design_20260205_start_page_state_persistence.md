# 🎨 Design: Start画面の状態永続化

> 作成日: 2026-02-05
> Phase: Design（設計）
> 関連: Brainstorm（要件分析完了）

---

## プロジェクトコンテキスト

### 技術スタック
- Next.js 16 + TypeScript + Supabase
- Dify（AI対話エンジン）
- React Client Components

### 関連ファイル（保護レベル）
- `app/consulting/start/page.tsx` - レベル3（変更可能）
- `hooks/useConsultingSession.ts` - レベル3（変更可能）
- `hooks/useMessageHandlers.ts` - レベル3（変更可能）
- `app/api/consulting/sessions/[id]/messages/route.ts` - レベル2（慎重）
- `supabase/schema.sql` - レベル2（慎重）

---

## 要件サマリー

### 現在の問題
1. メッセージ送信がモック実装（Difyに届いていない）
2. ページ遷移で状態が失われる（会話がリセット）
3. Difyとの会話履歴（conversation_id）が保存されていない

### 目指す姿
1. 本物のDify連携（文脈を理解したAI応答）
2. ページ遷移後も状態を復元（続きから再開）
3. ログアウトまで会話を保持

---

## アーキテクチャ設計

### 3層データストレージ設計

```
┌─────────────────────────────────────────────────────────┐
│ 🏢 Layer 1: Supabase（PostgreSQL）                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 役割: 永続化・真実の源泉（Source of Truth）              │
│                                                          │
│ 保存データ:                                              │
│ ├─ consulting_sessions                                  │
│ │   ├─ id, title, status, current_round                │
│ │   └─ conversation_id ← 【新規追加】                  │
│ ├─ consulting_messages                                  │
│ │   └─ すべてのメッセージ（ユーザー＋AI）              │
│                                                          │
│ セキュリティ:                                            │
│ ├─ RLS（Row Level Security）有効                        │
│ └─ ユーザーは自分のデータのみアクセス可                 │
│                                                          │
│ タイミング:                                              │
│ ├─ 書き込み: メッセージ送信時                           │
│ └─ 読み込み: ページ読み込み時、セッション切替時         │
└─────────────────────────────────────────────────────────┘
                         ↕ API経由
┌─────────────────────────────────────────────────────────┐
│ 📋 Layer 2: sessionStorage（ブラウザの一時保存）         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 役割: 高速キャッシュ・ページ遷移対応                     │
│                                                          │
│ 保存データ:                                              │
│ {                                                        │
│   userChoice: "new" | "existing",                       │
│   activeSessionId: "session-123",                       │
│   openSessionIds: ["session-123", "session-456"],       │
│   conversation_session-123: "dify-conv-abc",            │
│   conversation_session-456: "dify-conv-xyz"             │
│ }                                                        │
│                                                          │
│ セキュリティ:                                            │
│ ├─ タブを閉じると自動削除                               │
│ ├─ XSSリスクあり（但し、機密情報は保存しない）          │
│ └─ IDのみ保存（メッセージ内容は保存しない）             │
│                                                          │
│ タイミング:                                              │
│ ├─ 書き込み: 状態変更時（即座）                         │
│ └─ 読み込み: ページ読み込み時（即座）                   │
└─────────────────────────────────────────────────────────┘
                         ↕ 直接読み書き
┌─────────────────────────────────────────────────────────┐
│ 🧠 Layer 3: React State（メモリ）                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 役割: UIの即座反映                                       │
│                                                          │
│ 保存データ:                                              │
│ ├─ allSessions: SessionData[]                           │
│ ├─ activeSessionId: string                              │
│ ├─ inputValue: string（入力中のテキスト）               │
│ └─ attachedFiles: File[]                                │
│                                                          │
│ セキュリティ:                                            │
│ └─ メモリのみ（画面を閉じると消える）                   │
│                                                          │
│ タイミング:                                              │
│ └─ リアルタイム更新                                     │
└─────────────────────────────────────────────────────────┘
```

---

## データフロー設計

### シーケンス1: メッセージ送信（修正後）

```
ユーザー              Start画面           API Route         Dify          Supabase
  |                      |                   |               |               |
  |--「売上UP」送信----->|                   |               |               |
  |                      |                   |               |               |
  |                      |--楽観的UI更新---->|               |               |
  |                      |  (即座に表示)     |               |               |
  |                      |                   |               |               |
  |                      |--POST /messages-->|               |               |
  |                      |  {message,        |               |               |
  |                      |   conversationId} |               |               |
  |                      |                   |               |               |
  |                      |                   |--保存-------->|               |
  |                      |                   |  userMessage  |               |
  |                      |                   |               |               |
  |                      |                   |--POST-------->|               |
  |                      |                   |  {message,    |               |
  |                      |                   |   conv_id}    |               |
  |                      |                   |               |               |
  |                      |                   |<--AI応答------|               |
  |                      |                   |  {answer,     |               |
  |                      |                   |   new_conv_id}|               |
  |                      |                   |               |               |
  |                      |                   |--保存------------------->|
  |                      |                   |  aiMessage              |
  |                      |                   |  conversation_id        |
  |                      |                   |                         |
  |                      |<--応答------------|                         |
  |                      |  {messages,       |                         |
  |                      |   conversation_id}|                         |
  |                      |                   |                         |
  |                      |--sessionStorage-->|                         |
  |                      |  保存: conv_id    |                         |
  |                      |                   |                         |
  |<--画面更新-----------|                   |                         |
  |  AI応答表示          |                   |                         |
```

### シーケンス2: ページ遷移と復帰（修正後）

```
ユーザー              Start画面           sessionStorage    Supabase
  |                      |                      |               |
  |--ダッシュボード移動->|                      |               |
  |                      |                      |               |
  |                      |--状態保存----------->|               |
  |                      |  {userChoice,        |               |
  |                      |   activeSessionId,   |               |
  |                      |   openSessionIds}    |               |
  |                      |                      |               |
  |                      | 🗑️ メモリクリア      |               |
  |                      |                      |               |
  |--Start画面に戻る---->|                      |               |
  |                      |                      |               |
  |                      |<--状態復元-----------|               |
  |                      |  (0秒)               |               |
  |                      |                      |               |
  |                      |--GET sessions---------------------->|
  |                      |                                     |
  |                      |<--セッション一覧--------------------|
  |                      |  (conversation_id含む)              |
  |                      |                                     |
  |                      |--GET messages---------------------->|
  |                      |                                     |
  |                      |<--メッセージ履歴--------------------|
  |                      |                                     |
  |<--画面表示-----------|                                     |
  |  続きから再開！      |                                     |
```

---

## モジュール設計

### 1. Supabaseマイグレーション
- **ファイル**: `supabase/migrations/20260205_add_conversation_id.sql`
- **責務**: `consulting_sessions`テーブルにconversation_idカラム追加
- **依存**: なし
- **保護レベル**: レベル2（慎重）

### 2. 型定義更新
- **ファイル**: 
  - `types/database.types.ts`
  - `types/consulting.ts`
- **責務**: conversation_id型を追加
- **依存**: マイグレーション完了後
- **保護レベル**: レベル3（変更可能）

### 3. APIルート修正
- **ファイル**: `app/api/consulting/sessions/[id]/messages/route.ts`
- **責務**: conversation_idをSupabaseに保存
- **依存**: マイグレーション、型定義更新
- **保護レベル**: レベル2（慎重）

### 4. セッション管理Hook修正
- **ファイル**: `hooks/useConsultingSession.ts`
- **責務**: sessionStorageでの状態保存・復元
- **依存**: APIルート修正
- **保護レベル**: レベル3（変更可能）

### 5. メッセージHandler修正
- **ファイル**: `hooks/useMessageHandlers.ts`
- **責務**: 本物のAPI呼び出し、conversation_id管理
- **依存**: APIルート修正
- **保護レベル**: レベル3（変更可能）

---

## 技術選定（詳細）

### conversation_id保存戦略

| 要素 | 選定技術 | 理由 | 制約 |
|------|---------|------|------|
| 永続化 | Supabase `consulting_sessions.conversation_id` | 長期保存、複数デバイス対応 | APIオーバーヘッド（0.1秒） |
| キャッシュ | sessionStorage `conversation_{sessionId}` | 高速アクセス（0秒） | タブを閉じると消える |
| セキュリティ | RLS（既存） | ユーザーごとに隔離 | 設定済み、追加不要 |

### 状態保存戦略

| データ | Supabase | sessionStorage | React State | 理由 |
|-------|----------|----------------|-------------|------|
| conversation_id | ✅ 保存 | ✅ キャッシュ | ✅ 表示 | 長期保存＋高速アクセス |
| messages | ✅ 保存 | ❌ | ✅ 表示 | 容量大、APIから再取得 |
| userChoice | ❌ | ✅ 保存 | ✅ 表示 | 一時的な選択状態 |
| activeSessionId | ❌ | ✅ 保存 | ✅ 表示 | 一時的な選択状態 |
| openSessionIds | ❌ | ✅ 保存 | ✅ 表示 | 一時的な選択状態 |
| 入力中テキスト | ❌ | ⚠️ オプション | ✅ 表示 | 未送信、機密情報の可能性 |
| 添付ファイル実体 | ❌ | ❌ | ✅ 表示 | 容量大、再アップロード必要 |

---

## セキュリティ設計

### 1. Supabase層
```sql
-- 既存のRLS（変更不要）
CREATE POLICY "Users can view own sessions"
ON consulting_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON consulting_sessions FOR UPDATE
USING (auth.uid() = user_id);
```

**効果**:
- ✅ conversation_idは自動的にRLSで保護される
- ✅ 他人のconversation_idは読み取れない
- ✅ CVE-2025-59422（Difyの脆弱性）への対策

### 2. sessionStorage層
```typescript
// 保存する情報（機密情報を除外）
{
  userChoice: "new" | "existing",           // 公開情報
  activeSessionId: "session-123",           // セッションID（公開）
  openSessionIds: ["session-123"],          // セッションID（公開）
  conversation_session-123: "dify-conv-abc" // Dify会話ID（準機密）
}

// 保存しない情報
❌ メッセージ内容（企業の機密情報）
❌ 添付ファイル（容量大、機密情報）
❌ ユーザー情報（個人情報）
```

**リスク評価**:
- ⚠️ XSS脆弱性があれば、conversation_idが窃取される可能性
- ✅ 但し、Supabase RLSで保護されているため、IDだけでは会話内容を取得できない
- ✅ 実害：最小限（会話の続きができなくなる程度）

### 3. XSS対策（既存確認＋追加）
```typescript
// 既存のXSS対策を確認
- Next.js 16のビルトインXSS対策
- Content Security Policy（CSP）の設定確認
- DOMPurifyの使用状況確認

// 必要に応じて追加
- ユーザー入力のサニタイズ強化
- CSPヘッダー設定
```

---

## データフロー詳細

### Flow 1: 初回訪問（新規ユーザー）

```
1. ページ読み込み
   ↓
2. sessionStorage確認 → 空
   ↓
3. userChoice = null（新規/既存選択画面表示）
   ↓
4. ユーザーが「新規」をクリック
   ↓
5. userChoice = "new"
   sessionStorage保存
   ↓
6. 新規セッション作成
   conversation_id = null（まだDifyと話していない）
```

### Flow 2: メッセージ送信（Dify連携）

```
1. ユーザーがメッセージ入力
   ↓
2. 「送信」クリック
   ↓
3. API呼び出し: POST /api/consulting/sessions/{id}/messages
   {
     message: "売上を上げたい",
     conversationId: null（初回）or "dify-conv-abc"（2回目以降）
   }
   ↓
4. APIルート処理:
   ① ユーザーメッセージをSupabaseに保存
   ② Difyに送信
      - conversationIdがあれば渡す（会話継続）
      - なければ新規会話
   ③ Difyから応答取得
      - answer: "現在の売上状況を..."
      - conversation_id: "dify-conv-abc"（新規 or 既存）
   ④ AI応答をSupabaseに保存
   ⑤ conversation_idをSupabaseに保存（session更新）
   ↓
5. フロントエンド処理:
   ① 応答を受け取る
   ② React Stateを更新（画面表示）
   ③ sessionStorageにconversation_idをキャッシュ
      sessionStorage.setItem('conversation_session-123', 'dify-conv-abc')
```

### Flow 3: ページ遷移と復帰

```
1. Start画面で作業中
   userChoice = "existing"
   activeSessionId = "session-123"
   conversation_id = "dify-conv-abc"（sessionStorageにキャッシュ済み）
   ↓
2. ダッシュボードに移動
   ① useEffect: sessionStorageに状態保存
      {
        userChoice: "existing",
        activeSessionId: "session-123",
        openSessionIds: ["session-123", "session-456"]
      }
   ② React Stateクリア（メモリ解放）
   ↓
3. ダッシュボードで作業
   ↓
4. Start画面に戻る
   ① useEffect: sessionStorageから状態復元（0秒）
      userChoice = "existing"
      activeSessionId = "session-123"
   ② API呼び出し: GET /api/consulting/sessions（0.1秒）
      → セッション一覧取得（conversation_id含む）
   ③ API呼び出し: GET /api/consulting/sessions/session-123/messages（0.1秒）
      → メッセージ履歴取得
   ④ React State更新
   ⑤ 画面表示
   ↓
5. 続きから再開！
   sessionStorageにconversation_idがあるので、
   次のメッセージ送信時に会話が繋がる
```

---

## エラーハンドリング設計

### Case 1: API呼び出し失敗
```
1. ネットワークエラー、Supabaseエラー
   ↓
2. React StateでエラーUI表示
   ↓
3. sessionStorageの状態は保持（再試行可能）
```

### Case 2: Dify呼び出し失敗
```
1. Difyがタイムアウト、エラー
   ↓
2. フォールバック応答を返す
   "AI処理中にエラーが発生しました..."
   ↓
3. conversation_idは更新しない（前回の状態を保持）
```

### Case 3: sessionStorage破損
```
1. sessionStorageのJSONパースエラー
   ↓
2. エラーをキャッチ、初期状態に戻す
   userChoice = null
   ↓
3. ログ記録、ユーザーに通知
   "状態の復元に失敗しました。最初からやり直してください。"
```

---

## パフォーマンス設計

### 目標レイテンシ

| 操作 | 目標 | 実測予想 | 対策 |
|------|------|----------|------|
| ページ復帰（sessionStorage復元） | < 0.1秒 | 0.01秒 | ✅ 十分高速 |
| セッション読み込み（API） | < 0.5秒 | 0.1-0.3秒 | ✅ 許容範囲 |
| メッセージ送信（Dify含む） | < 3秒 | 1-5秒 | ⚠️ Dify依存 |

### 最適化戦略

#### 1. 楽観的UI更新
```typescript
// ユーザーメッセージを即座に表示（API完了を待たない）
setAllSessions(sessions.map(s => 
  s.id === activeSessionId 
    ? { ...s, messages: [...s.messages, newUserMessage] }
    : s
));

// その後、API呼び出し
await fetch('/api/...');
```

#### 2. conversation_idの二重キャッシュ
```typescript
// 1. sessionStorage（高速）
let conversationId = sessionStorage.getItem(`conversation_${sessionId}`);

// 2. React State（最速）
if (!conversationId && currentSession.conversationId) {
  conversationId = currentSession.conversationId;
}

// 3. Supabaseから取得（初回のみ）
// セッション読み込み時に取得済み
```

---

## リスク管理

### Risk 1: Difyの遅延・エラー
- **影響**: ユーザーがAI応答を待つ時間が長い
- **対策**: 
  - ✅ ローディングUI表示
  - ✅ タイムアウト設定（30秒）
  - ✅ フォールバック応答

### Risk 2: conversation_idの不整合
- **影響**: Difyの会話文脈が途切れる
- **対策**:
  - ✅ Supabaseを真実の源泉とする
  - ✅ sessionStorageは読み取り専用キャッシュ
  - ✅ 不整合時はSupabaseから再取得

### Risk 3: sessionStorageの容量オーバー
- **影響**: 状態保存に失敗
- **対策**:
  - ✅ 保存データを最小限に（IDのみ）
  - ✅ エラーハンドリング
  - ✅ 容量チェック（5MB制限）

---

## テスト戦略

### 単体テスト
- [ ] `useConsultingSession.ts`: 状態保存・復元ロジック
- [ ] `useMessageHandlers.ts`: API呼び出し、conversation_id管理
- [ ] sessionStorageユーティリティ関数

### 統合テスト
- [ ] メッセージ送信 → Supabase保存 → conversation_id更新
- [ ] ページ遷移 → 状態保存 → 復帰 → 状態復元
- [ ] Difyエラー時のフォールバック

### E2Eテスト
- [ ] 新規セッション開始 → メッセージ送信 → Dify応答確認
- [ ] ページ移動 → 復帰 → 続きから再開確認
- [ ] タブを閉じる → 再度開く → Supabaseから復元確認

---

## マイルストーン

### M1: Supabaseスキーマ修正（1-2時間）
- マイグレーション作成・実行
- 型定義更新
- 動作確認

### M2: APIルート修正（2-3時間）
- conversation_id保存ロジック
- GET APIでconversation_id返却
- テスト・確認

### M3: フロントエンド修正（3-4時間）
- useMessageHandlers: API呼び出し
- useConsultingSession: 状態保存・復元
- 統合テスト

### M4: 最終確認・リファクタリング（1-2時間）
- E2Eテスト
- エラーハンドリング強化
- ドキュメント更新

**総見積もり**: 7-11時間

---

## レビュー観点

### セキュリティ
- [ ] RLSが有効か？
- [ ] 機密情報がsessionStorageに保存されていないか？
- [ ] XSS対策は十分か？

### パフォーマンス
- [ ] ページ復帰時の体感速度は許容範囲か？（< 0.5秒）
- [ ] API呼び出しは最小限か？

### 機能
- [ ] ページ遷移後も会話を継続できるか？
- [ ] Difyの文脈が繋がるか？
- [ ] ログアウト後も復元できるか？

---

## 次のフェーズ

✅ Design完了
→ 次：**Plan（実装計画）**
