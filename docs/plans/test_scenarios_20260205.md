# 🧪 Start画面 状態永続化テスト手順書

> 作成日: 2026-02-05
> 対象: Start画面の状態永続化機能
> テスト環境: http://localhost:3000/consulting/start

---

## ✅ 事前確認

### 1. 開発サーバーが起動しているか確認
```bash
# ターミナルで確認
ps aux | grep "[n]ext"
```

**期待される結果**: Next.jsプロセスが表示される

### 2. ブラウザでStart画面を開く
- URL: http://localhost:3000/consulting/start
- **期待される結果**: 「新規」「既存」ボタンが表示される

---

## 🧪 テストシナリオ

### シナリオ1: 新規セッション開始とDify連携

#### 目的
- 新規セッションが作成できる
- メッセージが送信できる
- Difyから応答が返ってくる
- conversation_idがSupabaseに保存される

#### 手順

**Step 1: 新規セッション開始**
1. 「新規」ボタンをクリック
2. カテゴリ選択画面が表示される
3. 「売上向上」をクリック

**Step 2: メッセージ送信**
1. 入力欄に「売上を上げたい」と入力
2. 「送信」ボタンをクリック
3. **期待される結果**:
   - ユーザーメッセージが即座に表示される（楽観的UI）
   - 数秒後、AI応答が表示される
   - ローディング状態が表示される

**Step 3: 開発者ツールでconversation_id確認**
1. ブラウザの開発者ツールを開く（F12）
2. 「Application」タブ → 「Session Storage」 → `http://localhost:3000`
3. **期待される結果**:
   - `conversation_session-[ID]` キーが存在する
   - 値: `dify-conv-xxx`（Dify会話ID）

**Step 4: Supabaseでconversation_id確認**
1. Supabase Studio を開く
2. Table Editor → `consulting_sessions`
3. 最新のセッションを確認
4. **期待される結果**:
   - `conversation_id`カラムに値が入っている（`dify-conv-xxx`）

**Step 5: 続けてメッセージ送信（会話が繋がるか確認）**
1. 「もっと詳しく教えて」と入力して送信
2. **期待される結果**:
   - AI応答が前回の会話を踏まえた内容になる（文脈が繋がっている）

---

### シナリオ2: ページ遷移と復帰（状態復元）

#### 目的
- ページ遷移後も状態が保持される
- 会話の続きができる

#### 手順

**Step 1: 事前準備（シナリオ1で会話を開始）**
1. シナリオ1を実施
2. 2-3往復のメッセージ交換を実施
3. 現在の状態をメモ:
   - activeSessionId
   - メッセージ数

**Step 2: ダッシュボードに移動**
1. ヘッダーの「SolveWise」ロゴをクリック
2. **期待される結果**:
   - ダッシュボードが表示される

**Step 3: sessionStorage確認（保存されているか）**
1. 開発者ツール → Application → Session Storage
2. **期待される結果**:
   - `consulting_state`キーが存在
   - 値:
     ```json
     {
       "userChoice": "new",
       "activeSessionId": "session-xxx",
       "openSessionIds": ["session-xxx"],
       "lastActivity": 1234567890
     }
     ```
   - `conversation_session-xxx`キーが存在

**Step 4: Start画面に戻る**
1. ブラウザの「戻る」ボタン、またはURLバーで`/consulting/start`に移動
2. **期待される結果**:
   - 即座に前回の状態が復元される（ローディングなし）
   - メッセージ履歴が表示される
   - 入力欄が使える

**Step 5: 続きからメッセージ送信**
1. 「ありがとう」と入力して送信
2. **期待される結果**:
   - AI応答が前回の会話を踏まえた内容（文脈が繋がっている）
   - conversation_idが同じ（開発者ツールで確認）

---

### シナリオ3: ログアウトと再ログイン（Supabaseから復元）

#### 目的
- ログアウト時にsessionStorageがクリアされる
- 再ログイン後、Supabaseから会話を復元できる

#### 手順

**Step 1: ログアウト前の準備**
1. シナリオ1-2を実施（会話を作成）
2. セッションIDをメモ

**Step 2: sessionStorage確認（ログアウト前）**
1. 開発者ツール → Session Storage
2. `consulting_state`と`conversation_session-xxx`が存在することを確認

**Step 3: ログアウト**
1. 右上の「Logout」ボタンをクリック
2. 確認ダイアログで「ログアウト」をクリック
3. **期待される結果**:
   - ホームページにリダイレクトされる

**Step 4: sessionStorage確認（ログアウト後）**
1. 開発者ツール → Session Storage
2. **期待される結果**:
   - `consulting_state`が削除されている
   - `conversation_session-xxx`が削除されている
   - sessionStorageが空

**Step 5: 再ログイン**
1. ログインページでログイン
2. Start画面に移動

**Step 6: 「既存」を選択**
1. 「既存」ボタンをクリック
2. **期待される結果**:
   - 以前のセッション一覧が表示される
   - メッセージ履歴が表示される

**Step 7: 続きから再開**
1. 以前のセッションを選択（タブをクリック）
2. メッセージを送信
3. **期待される結果**:
   - AI応答が前回の会話を踏まえた内容（文脈が繋がっている）
   - Supabaseに保存されていたconversation_idが使われている

---

### シナリオ4: エラーハンドリング

#### 目的
- ネットワークエラー時の挙動確認
- エラーメッセージの表示確認
- 入力内容の復元確認

#### 手順

**Step 1: ネットワークを切断**
1. 開発者ツール → Network タブ
2. 「Offline」を選択（ネットワークを無効化）

**Step 2: メッセージ送信**
1. 「テストメッセージ」と入力
2. 「送信」ボタンをクリック
3. **期待される結果**:
   - ユーザーメッセージが一瞬表示される（楽観的UI）
   - エラートースト通知が表示される
     - 「メッセージ送信に失敗しました」
     - 「もう一度お試しください。」
   - ユーザーメッセージが消える（ロールバック）
   - 入力欄に「テストメッセージ」が復元される

**Step 3: ネットワークを復旧**
1. 開発者ツール → Network タブ
2. 「Offline」を解除（「No throttling」を選択）

**Step 4: 再送信**
1. 入力欄に残っている「テストメッセージ」を確認
2. 「送信」ボタンをクリック
3. **期待される結果**:
   - 正常にメッセージが送信される
   - AI応答が返ってくる

---

## 🔍 確認ポイント

### sessionStorage確認（開発者ツール）

**確認項目**:
```javascript
// Session Storageに以下のキーが存在するか
consulting_state: {
  "userChoice": "new" | "existing",
  "activeSessionId": "session-xxx",
  "openSessionIds": ["session-xxx"],
  "lastActivity": 1234567890
}

conversation_session-xxx: "dify-conv-abc"
```

### Supabase確認（Supabase Studio）

**確認SQL**:
```sql
-- 最新のセッションを確認
SELECT 
  id, 
  title, 
  conversation_id, 
  current_round,
  created_at 
FROM consulting_sessions 
ORDER BY created_at DESC 
LIMIT 5;
```

**期待される結果**:
- conversation_idカラムに値が入っている

### ネットワークリクエスト確認（開発者ツール）

**確認項目**:
```
POST /api/consulting/sessions/[id]/messages
Request Body: {
  "message": "...",
  "conversationId": "dify-conv-abc"  // ← 2回目以降
}

Response Body: {
  "messages": [...],
  "conversation_id": "dify-conv-abc",  // ← Difyから返ってくる
  ...
}
```

---

## ✅ テスト合格基準

### 必須項目（すべて✅が必要）
- [ ] シナリオ1: 新規セッション開始とメッセージ送信
  - [ ] メッセージ送信できる
  - [ ] AI応答が返ってくる
  - [ ] conversation_idがSupabaseに保存される
  - [ ] conversation_idがsessionStorageにキャッシュされる
  
- [ ] シナリオ2: ページ遷移と復帰
  - [ ] ページ遷移後も状態が保持される
  - [ ] メッセージ履歴が復元される
  - [ ] 続きから会話できる
  - [ ] Difyの文脈が繋がっている
  
- [ ] シナリオ3: ログアウトと再ログイン
  - [ ] ログアウト時にsessionStorageがクリアされる
  - [ ] 再ログイン後、Supabaseから復元できる
  - [ ] 会話の続きができる
  
- [ ] シナリオ4: エラーハンドリング
  - [ ] ネットワークエラー時にエラー通知が表示される
  - [ ] 入力内容が復元される
  - [ ] 再送信できる

---

## 🐛 トラブルシューティング

### 問題1: AI応答が返ってこない

**確認項目**:
- Dify APIキーが設定されているか（`.env.local`）
- ネットワークタブでAPIエラーがないか
- サーバーログにエラーが出ていないか

**対応**:
```bash
# サーバーログ確認
tail -f /Users/eiichi/.cursor/projects/Users-eiichi-Documents-ai-consulting-zero/terminals/679598.txt
```

### 問題2: conversation_idが保存されない

**確認項目**:
- マイグレーションが実行されたか（Supabase Studioで確認）
- APIレスポンスにconversation_idが含まれているか（開発者ツール）

**対応**:
```sql
-- Supabase Studioで確認
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'consulting_sessions' 
AND column_name = 'conversation_id';
```

### 問題3: ページ遷移後に状態が失われる

**確認項目**:
- sessionStorageにデータが保存されているか
- useEffectが実行されているか（React DevTools）

**対応**:
- ブラウザコンソールでエラーがないか確認
- sessionStorageの内容を手動確認

---

## 📊 テスト実施記録

### 実施日時
[記入してください]

### テスト結果

#### シナリオ1: 新規セッション
- [ ] ✅ 成功 / [ ] ❌ 失敗
- メモ: 

#### シナリオ2: ページ遷移
- [ ] ✅ 成功 / [ ] ❌ 失敗
- メモ: 

#### シナリオ3: ログアウト
- [ ] ✅ 成功 / [ ] ❌ 失敗
- メモ: 

#### シナリオ4: エラーハンドリング
- [ ] ✅ 成功 / [ ] ❌ 失敗
- メモ: 

### 総合評価
- [ ] ✅ すべて合格 → 本番デプロイ可能
- [ ] ⚠️ 一部不合格 → 修正が必要
- [ ] ❌ 大幅な修正が必要

---

## 📝 発見された問題と対応

### 問題1
- **内容**: 
- **対応**: 
- **ステータス**: 

### 問題2
- **内容**: 
- **対応**: 
- **ステータス**: 

---

## ✅ 完了チェックリスト

- [ ] すべてのテストシナリオを実施
- [ ] 問題があれば記録・対応
- [ ] 本番デプロイ前の最終確認
- [ ] このドキュメントをアーカイブ

---

次のステップ: テスト実施後、問題があれば修正、なければ本番デプロイ
