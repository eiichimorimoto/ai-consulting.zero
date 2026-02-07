# 🎨 Design: Dify連携とデータフロー完全検証

**日付**: 2026-02-07  
**機能名**: Dify APIへの会社情報送信と初回画面表示の修正

---

## アーキテクチャ図

```
[ブラウザ] ─────────────────────────────────────────────┐
  │                                                    │
  │ (1) カテゴリ選択                                    │
  ↓                                                    │
[hooks/useMessageHandlers.ts]                          │
  │ - handleQuickReply()                              │
  │ - sessionStorageに保存:                            │
  │   - selectedCategory                              │
  │   - selectedSubcategory                           │
  │                                                    │
  │ (2) POST /api/consulting/sessions                 │
  ↓                                                    │
[app/api/consulting/sessions/route.ts]                 │
  │ - 認証チェック（supabase.auth.getUser()）          │
  │ - セッション作成                                   │
  │ - ユーザーメッセージ保存（message_order: 1）       │
  │                                                    │
  │ (3) session.id を返す                             │
  ↓                                                    │
[ブラウザ] ←──────────────────────────────────────────┘
  │
  │ (4) メッセージ送信
  ↓
[hooks/useMessageHandlers.ts]
  │ - handleSendMessage()
  │ - sessionStorageから categoryInfo 取得
  │ - conversationId 取得
  │
  │ (5) POST /api/consulting/sessions/[id]/messages
  │     body: { message, conversationId, categoryInfo }
  ↓
[app/api/consulting/sessions/[id]/messages/route.ts]
  │ - 認証チェック（supabase.auth.getUser()）
  │ - body から categoryInfo 取得
  │
  │ (6) POST /api/dify/chat
  │     body: { sessionId, message, userId, conversationId, categoryInfo }
  ↓
[app/api/dify/chat/route.ts]
  │ - SERVICE_ROLE_KEY で Supabase接続（RLSバイパス）
  │ - プロフィール + 会社情報を取得:
  │   SELECT * FROM profiles
  │   JOIN companies ON profiles.company_id = companies.id
  │   WHERE profiles.user_id = ?
  │
  │ (7) Dify API呼び出し
  │     inputs: {
  │       company_name, industry, capital, employee_count,
  │       website, business_description,
  │       user_name, user_position, user_department,
  │       selected_category, selected_subcategory
  │     }
  ↓
[Dify外部サービス] ─────────────────────────────────────┐
  │                                                    │
  │ AI応答生成                                         │
  │                                                    │
  │ (8) レスポンス返却                                 │
  ↓                                                    │
[app/api/dify/chat/route.ts] ←─────────────────────────┘
  │
  │ (9) 応答を返す
  ↓
[app/api/consulting/sessions/[id]/messages/route.ts]
  │
  │ (10) Supabaseにメッセージ保存:
  │      - ユーザーメッセージ（role: 'user'）
  │      - AIメッセージ（role: 'assistant'）
  │
  │ (11) 全メッセージを取得して返す
  ↓
[ブラウザ] ←─────────────────────────────────────────┐
  │                                                    │
  │ (12) 画面更新                                      │
  │                                                    │
  │ (13) スクロール時 or ページロード時                 │
  │      GET /api/consulting/sessions/[id]/messages   │
  ↓                                                    │
[app/api/consulting/sessions/[id]/messages/route.ts]   │
  │ - 認証チェック                                     │
  │ - メッセージ取得（order by created_at DESC, range) │
  │ - offset=0 なら初回メッセージを動的生成:           │
  │   {                                                │
  │     id: 'system-initial-message',                 │
  │     role: 'assistant',                            │
  │     content: 'どのような課題をお抱えですか？...',   │
  │     interactive: {                                │
  │       type: 'category-buttons',                   │
  │       data: CONSULTING_CATEGORIES                 │
  │     }                                              │
  │   }                                                │
  │                                                    │
  │ (14) レスポンス返却                                │
  ↓                                                    │
[ブラウザ] ←─────────────────────────────────────────┘
  │
  │ (15) 画面表示
  ↓
[components/consulting/ChatArea.tsx]
  - messages を map して表示
  - interactive データがあればボタンを表示
```

---

## モジュール設計

### 1. 認証・セッション管理
**責務**: ユーザー認証、セッション作成・管理  
**モジュール**: `app/api/consulting/sessions/route.ts`  
**依存**: Supabase Auth  
**保護レベル**: レベル2

**問題点**:
- ❌ `/api/dify/chat` に認証情報が渡されていない
- ❌ cookiesから認証トークンが読み取れていない

---

### 2. 会社情報取得
**責務**: ユーザーのプロフィールと会社情報を取得  
**モジュール**: `app/api/dify/chat/route.ts`  
**依存**: Supabase (profiles + companies)  
**保護レベル**: レベル2

**現在の実装**:
```typescript
// RLSバイパスのため SERVICE_ROLE_KEY を使用
const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey)

const { data: profiles } = await supabaseAdmin
  .from('profiles')
  .select(`*, companies(*)`)
  .eq('user_id', userId)
```

**問題点**:
- ✅ SERVICE_ROLE_KEYの使用（実装済み）
- ❓ しかしまだ `count: 0` になっている可能性
- ❓ profiles_data が空配列 `[]`

---

### 3. Dify API呼び出し
**責務**: Dify Chatflow APIにメッセージと会社情報を送信  
**モジュール**: `app/api/dify/chat/route.ts`  
**依存**: Dify API（外部）  
**保護レベル**: レベル2

**現在の実装**:
```typescript
const requestBody = {
  inputs: {
    company_name: companyInfo.name || '',
    industry: companyInfo.industry || '',
    // ...
    selected_category: categoryInfo?.selectedCategory || '',
    selected_subcategory: categoryInfo?.selectedSubcategory || ''
  },
  query: message,
  user: userId,
  response_mode: 'blocking'
}

if (conversationId) {
  requestBody.conversation_id = conversationId
}
```

**問題点**:
- ❓ `companyInfo` が空のまま送信されている
- ❓ `categoryInfo` が `{}` になっている

---

### 4. メッセージ履歴管理
**責務**: メッセージの保存・取得・表示  
**モジュール**: `app/api/consulting/sessions/[id]/messages/route.ts`  
**依存**: Supabase (consulting_messages)  
**保護レベル**: レベル2

**GET メソッド**:
```typescript
// offset=0 の場合、初回メッセージを動的生成
if (offset === 0) {
  messagesWithInitial = [
    {
      id: 'system-initial-message',
      role: 'assistant',
      content: 'どのような課題をお抱えですか？...',
      // ...
    },
    ...reversedMessages
  ]
}

const mappedMessages = messagesWithInitial.map(msg => {
  const baseMessage = { /* ... */ }
  
  // 初回メッセージ（カテゴリ選択ボタン）の復元
  if (msg.role === 'assistant' && msg.content.includes('どのような課題をお抱えですか')) {
    baseMessage.interactive = {
      type: 'category-buttons',
      data: CONSULTING_CATEGORIES
    }
  }
  
  return baseMessage
})
```

**問題点**:
- ❓ `interactive` データが正しく含まれているか？
- ❓ クライアント側で正しく表示されているか？

---

## 技術選定（プロジェクト制約考慮）

| カテゴリ | 選定技術 | 理由 | 制約 |
|---------|---------|------|------|
| 認証 | Supabase Auth | 既存システム | cookiesから読み取り |
| RLS | SERVICE_ROLE_KEY | RLSバイパス | セキュリティ考慮必須 |
| 状態管理 | sessionStorage | ページ遷移対応 | ブラウザ依存 |
| API統合 | Dify Chatflow API | AI応答生成 | 外部サービス依存 |

---

## データフロー詳細

### フロー1: 会社情報取得
```
POST /api/dify/chat
  ↓
userId を受け取る（上流で認証済み）
  ↓
SERVICE_ROLE_KEY で Supabase接続（RLSバイパス）
  ↓
SELECT * FROM profiles
JOIN companies ON profiles.company_id = companies.id
WHERE profiles.user_id = ?
  ↓
profiles[0] を取得
  ↓
companyInfo, profileInfo を構築
  ↓
Dify API の inputs に含める
```

**検証ポイント**:
- ✅ SERVICE_ROLE_KEY は正しく設定されているか？
- ❓ JOINクエリは正しく動作しているか？
- ❓ profiles[0] に会社情報が含まれているか？

---

### フロー2: 初回メッセージ表示
```
GET /api/consulting/sessions/[id]/messages?offset=0&limit=20
  ↓
Supabaseからメッセージ取得（降順）
  ↓
reverse() で古い順に並び替え
  ↓
offset=0 なら初回メッセージを先頭に追加:
  {
    id: 'system-initial-message',
    role: 'assistant',
    content: 'どのような課題をお抱えですか？...',
    ...
  }
  ↓
map() で変換:
  - role → type
  - 'どのような課題をお抱えですか' を検出
    → interactive: { type: 'category-buttons', data: CONSULTING_CATEGORIES }
  ↓
レスポンス返却
```

**検証ポイント**:
- ❓ 初回メッセージは正しく追加されているか？
- ❓ `interactive` データは正しく設定されているか？
- ❓ クライアント側で受け取っているか？

---

### フロー3: カテゴリ情報の伝播
```
[カテゴリ選択時]
hooks/useMessageHandlers.ts
  ↓
saveConsultingState({ selectedCategory: '...' })
  ↓
sessionStorage に保存

[メッセージ送信時]
hooks/useMessageHandlers.ts
  ↓
loadConsultingState() で取得
  ↓
categoryInfo = { selectedCategory, selectedSubcategory }
  ↓
POST /api/consulting/sessions/[id]/messages
  body: { categoryInfo }
  ↓
POST /api/dify/chat
  body: { categoryInfo }
  ↓
Dify API
  inputs: { selected_category, selected_subcategory }
```

**検証ポイント**:
- ❓ sessionStorage に正しく保存されているか？
- ❓ API呼び出し時に取得できているか？
- ❓ Dify APIに渡されているか？

---

## セキュリティ考慮点

### SERVICE_ROLE_KEY の使用

**メリット**:
- ✅ RLSをバイパスして確実にデータ取得
- ✅ cookiesの認証トークン問題を回避

**セキュリティ対策**:
- ✅ userIdは上流（`/api/consulting/sessions/[id]/messages`）で認証済み
- ✅ `/api/dify/chat` は内部API（クライアントから直接呼び出せない）
- ✅ SERVICE_ROLE_KEYは `.env.local` で管理

**リスク**:
- ⚠️ SERVICE_ROLE_KEYが漏洩すると全データアクセス可能
- 対策: `.env.local` を `.gitignore`、gitleaksで監視（実装済み）

---

## ファイル変更計画

### 検証対象ファイル

#### 1. `app/api/dify/chat/route.ts`
**変更内容**:
- ✅ SERVICE_ROLE_KEY使用（実装済み）
- 🔍 **検証**: プロフィール取得が成功しているか？
  - ログで `count`, `profiles_length` を確認
  - `profiles_data` の中身を確認

#### 2. `app/api/consulting/sessions/[id]/messages/route.ts`
**GET メソッド**:
- ✅ 初回メッセージ動的生成（実装済み）
- 🔍 **検証**: レスポンスに `interactive` データが含まれているか？
  - ログで `first_message_type` を確認
  - ブラウザのNetwork タブで確認

**POST メソッド**:
- 🔍 **検証**: `categoryInfo` が正しく渡されているか？

#### 3. `hooks/useMessageHandlers.ts`
**handleQuickReply()**:
- ✅ カテゴリ情報を sessionStorage に保存（実装済み）
- 🔍 **検証**: 保存されているか？

**handleSendMessage()**:
- ✅ categoryInfo を取得して送信（実装済み）
- 🔍 **検証**: 正しく取得できているか？

---

## 検証チェックリスト

### ✅ 認証フロー
- [ ] POST /api/consulting/sessions で認証成功
- [ ] userId が正しく取得される
- [ ] cookies に認証トークンが含まれる

### ✅ 会社情報取得
- [ ] SERVICE_ROLE_KEY で Supabase接続
- [ ] profiles テーブルから取得（count > 0）
- [ ] companies テーブルとJOIN成功
- [ ] companyInfo が空でない
- [ ] Dify API の inputs に含まれる

### ✅ カテゴリ情報
- [ ] sessionStorage に保存される
- [ ] API呼び出し時に取得される
- [ ] categoryInfo が `{}` でない
- [ ] Dify API の inputs に含まれる

### ✅ 初回メッセージ表示
- [ ] GET API で動的生成される
- [ ] interactive データが含まれる
- [ ] レスポンスに含まれる
- [ ] ブラウザで表示される

---

## 次のステップ

**Phase 3: PLAN（実装計画）** に進み、検証と修正のタスクを分解します。
