# 📝 Implementation Plan: Dify連携とデータフロー完全検証

**日付**: 2026-02-07  
**機能名**: Dify APIへの会社情報送信と初回画面表示の修正

---

## プロジェクト構造

```
app/
  └── api/
      ├── consulting/
      │   └── sessions/
      │       ├── route.ts (変更対象)
      │       └── [id]/
      │           └── messages/
      │               └── route.ts (変更対象)
      └── dify/
          └── chat/
              └── route.ts (変更対象)

hooks/
  └── useMessageHandlers.ts (検証のみ)

lib/
  ├── supabase/
  │   └── server.ts (参照のみ)
  └── consulting/
      ├── category-data.ts (参照のみ)
      └── storage.ts (参照のみ)

components/
  └── consulting/
      └── ChatArea.tsx (検証のみ)
```

---

## タスクリスト

### Task 0: 現状の完全検証（最優先）
- **目的**: すべてのログを収集し、問題箇所を特定
- **依存**: なし
- **成果物**: 
  - 検証レポート（このドキュメントに追記）
  - 問題箇所の特定
- **見積もり**: 15分
- **優先度**: 最高
- **変更通知必須**: なし（検証のみ）

**検証項目**:
1. ターミナルログで以下を確認:
   - `🔑 Using SERVICE_ROLE_KEY` が表示されているか？
   - `🔍 Profile query result` の `count` が1以上か？
   - `✅ Company & Profile info fetched` が表示されているか？
   - `📤 Dify Chatflow Request` の `has_company_info` がtrueか？
   - `📤 GET /messages Response` の `first_message_type` が `'category-buttons'` か？

2. コードレビュー:
   - `app/api/dify/chat/route.ts` のSERVICE_ROLE_KEY使用箇所
   - JOINクエリの構造
   - inputs への代入ロジック

3. ブラウザ検証:
   - DevTools Network タブで API レスポンスを確認
   - GET /api/consulting/sessions/[id]/messages のレスポンス
   - messages[0].interactive が存在するか？

---

### Task 1: 会社情報取得の検証と修正
- **目的**: プロフィール + 会社情報が正しく取得できるようにする
- **依存**: Task 0
- **成果物**: 
  - `app/api/dify/chat/route.ts` 修正 (保護レベル2)
- **見積もり**: 20分
- **優先度**: 最高
- **変更通知必須**: はい（レベル2ファイル）

**実装内容**:
1. SERVICE_ROLE_KEYの動作確認
2. JOINクエリの修正（必要に応じて）
3. エラーハンドリングの強化
4. デバッグログの最適化

**修正候補**:
```typescript
// オプションA: JOINクエリを分割
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single()

const { data: company } = await supabaseAdmin
  .from('companies')
  .select('*')
  .eq('id', profile.company_id)
  .single()

// オプションB: 現在のJOINクエリを維持して、デバッグ
const { data: profiles, error } = await supabaseAdmin
  .from('profiles')
  .select('*, companies(*)')
  .eq('user_id', userId)

console.log('Full profile data:', JSON.stringify(profiles, null, 2))
```

---

### Task 2: カテゴリ情報の伝播検証と修正
- **目的**: カテゴリ・サブカテゴリ情報がDifyまで届くようにする
- **依存**: Task 0
- **成果物**:
  - `hooks/useMessageHandlers.ts` 検証・修正 (保護レベル3)
- **見積もり**: 15分
- **優先度**: 高
- **変更通知必須**: いいえ（レベル3）

**検証内容**:
1. sessionStorageの内容確認（ブラウザDevTools）
2. API呼び出し時のbody確認
3. ログで `categoryInfo: {}` が `{}` でないことを確認

**修正候補**:
```typescript
// デバッグログ追加
const currentState = loadConsultingState()
console.log('📋 Current state:', currentState)

const categoryInfo = currentState ? {
  selectedCategory: currentState.selectedCategory,
  selectedSubcategory: currentState.selectedSubcategory
} : undefined

console.log('📋 Sending categoryInfo:', categoryInfo)
```

---

### Task 3: 初回メッセージ表示の検証と修正
- **目的**: 初回カテゴリ選択ボタンが確実に表示されるようにする
- **依存**: Task 0
- **成果物**:
  - `app/api/consulting/sessions/[id]/messages/route.ts` 検証・修正 (保護レベル2)
- **見積もり**: 20分
- **優先度**: 高
- **変更通知必須**: はい（レベル2ファイル）

**検証内容**:
1. GET APIのレスポンス構造を確認
2. `interactive` データの有無を確認
3. ブラウザで受け取っているか確認

**修正候補**:
```typescript
// デバッグログ追加
console.log('📊 Mapped messages:', JSON.stringify(
  mappedMessages.map(m => ({
    id: m.id,
    type: m.type,
    content_preview: m.content.substring(0, 50),
    has_interactive: !!m.interactive,
    interactive_type: m.interactive?.type
  })),
  null,
  2
))
```

---

### Task 4: エンドツーエンドテスト
- **目的**: すべての修正が正しく動作することを確認
- **依存**: Task 1, 2, 3
- **成果物**:
  - テスト結果レポート
- **見積もり**: 20分
- **優先度**: 最高
- **変更通知必須**: なし（テストのみ）

**テスト項目**:
1. 新規セッション作成
2. カテゴリ選択
3. メッセージ送信
4. Difyの応答確認（会社情報を考慮しているか）
5. 上にスクロール（初回画面が表示されるか）
6. ページリロード（状態が保持されるか）

---

## 実装順序

```
Task 0（検証）
  ↓ 並行実行可能
  ├─ Task 1（会社情報）
  ├─ Task 2（カテゴリ情報）
  └─ Task 3（初回画面）
  ↓ 全て完了後
Task 4（E2Eテスト）
```

---

## 総見積もり時間

- Task 0: 15分（検証）
- Task 1: 20分（会社情報）
- Task 2: 15分（カテゴリ情報）
- Task 3: 20分（初回画面）
- Task 4: 20分（E2Eテスト）

**合計**: 約1時間30分

---

## リスク管理

### リスク1: SERVICE_ROLE_KEY でも取得できない
**可能性**: 低  
**対策**: JOINクエリを分割して個別に取得

### リスク2: ブラウザキャッシュの問題
**可能性**: 中  
**対策**: Hard Reload（Cmd+Shift+R / Ctrl+Shift+R）

### リスク3: sessionStorage が消える
**可能性**: 低  
**対策**: ブラウザのApplication タブで確認

---

## ファクトチェック項目

### 実装前の確認
- [ ] 現在のコードをすべて読み込んだか？
- [ ] ログをすべて確認したか？
- [ ] 問題箇所を特定したか？
- [ ] 修正方針が明確か？

### 実装後の確認
- [ ] 型チェックが通るか？
- [ ] ログで正しいデータが表示されるか？
- [ ] ブラウザで正しく動作するか？

---

## 次のステップ

**Task 0: 現状の完全検証** を実施します。
