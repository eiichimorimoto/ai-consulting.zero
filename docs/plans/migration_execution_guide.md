# マイグレーション実行ガイド

> 日時: 2026-02-05
> 対象: consulting_sessionsテーブルにconversation_id追加

---

## 🔐 事前準備

### 1. バックアップ確認
- Supabaseは自動バックアップがあります（安心）
- 念のため、現在のテーブル構造を記録：

```sql
-- consulting_sessionsの現在の構造を確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'consulting_sessions'
ORDER BY ordinal_position;
```

---

## 🚀 実行手順（Supabase Studio）

### Step 1: Supabase Studioを開く
1. ブラウザで開く: https://supabase.com/dashboard
2. プロジェクト選択: `ai-consulting-zero`
3. 左メニュー「SQL Editor」をクリック

### Step 2: マイグレーションSQLを実行
1. 「New query」をクリック
2. 以下のSQLをコピー＆ペースト：

```sql
-- Migration: Add conversation_id to consulting_sessions
-- Date: 2026-02-05
-- Purpose: Difyの会話履歴IDを保存し、ページ遷移後も会話の文脈を維持する
-- Rollback: ALTER TABLE consulting_sessions DROP COLUMN IF EXISTS conversation_id;

-- Step 1: conversation_idカラム追加
ALTER TABLE consulting_sessions 
ADD COLUMN IF NOT EXISTS conversation_id TEXT NULL;

-- Step 2: インデックス追加（検索高速化）
-- 既存のインデックスと重複しないか確認
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'consulting_sessions' 
    AND indexname = 'idx_consulting_sessions_conversation_id'
  ) THEN
    CREATE INDEX idx_consulting_sessions_conversation_id 
    ON consulting_sessions(conversation_id);
  END IF;
END $$;

-- Step 3: カラムコメント追加（ドキュメント）
COMMENT ON COLUMN consulting_sessions.conversation_id IS 
'Dify Chat APIの会話履歴ID。会話の文脈を維持するために使用。NULLの場合は新規会話として扱う。';

-- Step 4: 確認用クエリ（実行後に確認）
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'consulting_sessions' 
AND column_name = 'conversation_id';
```

3. 「Run」ボタンをクリック

### Step 3: 実行結果の確認
- ✅ エラーがなければ成功
- ✅ 最後のSELECT文で以下が表示されればOK：

```
column_name      | data_type | is_nullable
-----------------|-----------|------------
conversation_id  | text      | YES
```

---

## ✅ 動作確認

### 1. テーブル構造を確認
```sql
\d consulting_sessions
-- または
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'consulting_sessions'
ORDER BY ordinal_position;
```

**期待される結果**:
- `conversation_id`カラムが追加されている
- 型: `text`
- Nullable: `YES`

### 2. インデックスを確認
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'consulting_sessions';
```

**期待される結果**:
- `idx_consulting_sessions_conversation_id`が存在する

### 3. 既存データへの影響確認
```sql
-- 既存のセッションを確認
SELECT id, title, conversation_id 
FROM consulting_sessions 
LIMIT 5;
```

**期待される結果**:
- 既存セッションの`conversation_id`は`NULL`
- エラーなし

---

## 🔄 ロールバック手順（問題が発生した場合）

### 元に戻すSQL
```sql
-- conversation_idカラムを削除
ALTER TABLE consulting_sessions 
DROP COLUMN IF EXISTS conversation_id;

-- インデックスも削除
DROP INDEX IF EXISTS idx_consulting_sessions_conversation_id;
```

### 実行方法
1. Supabase Studio の SQL Editor
2. 上記SQLを実行
3. 確認：

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'consulting_sessions' 
AND column_name = 'conversation_id';
```

**期待される結果**: 何も表示されない（カラムが削除された）

---

## 📊 トラブルシューティング

### エラー1: `column "conversation_id" already exists`
**原因**: すでに実行済み
**対応**: 問題なし（冪等性により安全）

### エラー2: `permission denied`
**原因**: 権限不足
**対応**: Supabaseのオーナー権限でログインしているか確認

### エラー3: `relation "consulting_sessions" does not exist`
**原因**: テーブルが存在しない
**対応**: テーブル名を確認、または先にテーブル作成

---

## ✅ 完了チェックリスト

- [ ] Supabase Studioでマイグレーション実行
- [ ] conversation_idカラムが追加されたことを確認
- [ ] インデックスが作成されたことを確認
- [ ] 既存データに影響がないことを確認
- [ ] このドキュメントを完了としてマーク

---

## 📝 実行記録

**実行日時**: 
**実行者**: 
**結果**: ✅ 成功 / ❌ 失敗 / 🔄 ロールバック
**備考**: 

---

次のステップ: Task 3（型定義更新）に進む
