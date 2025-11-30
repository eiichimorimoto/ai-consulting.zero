# データベースセットアップ手順

## Supabaseデータベースにテーブルを作成する方法

### 方法1: Supabaseダッシュボードを使用（推奨・最も簡単）

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard にアクセス
   - プロジェクト「ai^consulting-zero」を選択

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック
   - 「New query」をクリック

3. **スキーマファイルの内容をコピー＆ペースト**
   - `supabase/schema.sql` ファイルを開く
   - ファイルの内容をすべてコピー
   - SQL Editorにペースト

4. **SQLを実行**
   - 「Run」ボタンをクリック（または `Cmd/Ctrl + Enter`）
   - 実行が完了するまで待つ（数秒〜数十秒）

5. **確認**
   - 左メニューから「Table Editor」を開く
   - 以下のテーブルが作成されていることを確認：
     - `companies`
     - `profiles`
     - `business_cards`
     - `company_web_resources`
     - `consulting_sessions`
     - `consulting_messages`
     - `reports`
     - `subscriptions`
     - `activity_logs`

### 方法2: Supabase CLIを使用

1. **Supabase CLIにログイン**
   ```bash
   supabase login
   ```
   - ブラウザが開くので、Supabaseアカウントでログイン

2. **プロジェクトにリンク**
   ```bash
   supabase link --project-ref fwruumlkxzfihlmygrww
   ```

3. **スキーマを適用**
   ```bash
   supabase db execute --file supabase/schema.sql
   ```

   または、スクリプトを使用：
   ```bash
   npm run apply-schema
   ```

## 作成されるテーブルとフィールド

### 1. companies（会社情報）
- 基本情報: `id`, `name`, `name_kana`, `corporate_number`
- 住所情報: `postal_code`, `prefecture`, `city`, `address`, `building`
- 連絡先: `phone`, `fax`, `email`, `website`
- 会社情報: `industry`, `employee_count`, `capital`, `annual_revenue`, `established_date`, `representative_name`, `business_description`
- 配列フィールド: `main_products[]`, `main_clients[]`, `main_banks[]`
- 課題・状況: `current_challenges[]`, `growth_stage`, `it_maturity_level`
- メタデータ: `source`, `source_url`, `is_verified`, `created_at`, `updated_at`

### 2. profiles（ユーザープロファイル）
- 基本情報: `id`, `user_id`, `company_id`, `name`, `name_kana`, `email`, `phone`, `mobile`
- 職務情報: `position`, `department`, `avatar_url`
- プラン情報: `plan_type`, `monthly_chat_count`, `monthly_ocr_count`
- タイムスタンプ: `created_at`, `updated_at`

### 3. business_cards（名刺情報）
- 個人情報: `id`, `user_id`, `company_id`, `person_name`, `person_name_kana`, `position`, `department`
- 連絡先: `email`, `phone`, `mobile`, `fax`
- 住所情報: `postal_code`, `address`
- 会社情報: `company_name`, `website`
- OCR関連: `image_url`, `ocr_raw_text`, `ocr_confidence`
- メモ: `notes`, `tags[]`, `is_favorite`
- タイムスタンプ: `created_at`, `updated_at`

### 4. company_web_resources（Web検索結果）
- 基本情報: `id`, `company_id`, `url`, `title`, `description`, `resource_type`
- コンテンツ: `scraped_content`, `is_primary`, `relevance_score`
- タイムスタンプ: `created_at`, `updated_at`

### 5. consulting_sessions（コンサルセッション）
- 基本情報: `id`, `user_id`, `company_id`, `title`, `session_type`, `status`
- 分析結果: `analysis_summary`, `key_insights` (JSONB), `recommendations` (JSONB), `risk_assessment` (JSONB)
- メッセージ数: `message_count`
- タイムスタンプ: `created_at`, `updated_at`

### 6. consulting_messages（チャットメッセージ）
- 基本情報: `id`, `session_id`, `role`, `content`
- 添付ファイル: `attachments` (JSONB)
- 分析情報: `analysis_type`, `confidence_score`
- タイムスタンプ: `created_at`

### 7. reports（レポート）
- 基本情報: `id`, `user_id`, `session_id`, `company_id`, `title`, `report_type`, `status`
- コンテンツ: `executive_summary`, `content` (JSONB), `metrics` (JSONB), `charts_data` (JSONB), `score`
- PDF: `pdf_url`
- タイムスタンプ: `created_at`, `updated_at`

### 8. subscriptions（サブスクリプション）
- 基本情報: `id`, `user_id`, `plan_type`, `status`
- Stripe情報: `stripe_customer_id`, `stripe_subscription_id`
- 期間情報: `current_period_start`, `current_period_end`, `trial_start`, `trial_end`
- 使用量: `chat_count`, `ocr_count`
- タイムスタンプ: `created_at`, `updated_at`

### 9. activity_logs（アクティビティログ）
- 基本情報: `id`, `user_id`, `action_type`, `entity_type`, `entity_id`
- 詳細: `details` (JSONB)
- タイムスタンプ: `created_at`

## 自動設定される機能

### トリガー
- `updated_at` フィールドの自動更新
- ユーザー登録時の自動プロファイル・サブスクリプション作成
- メッセージ追加時のセッションメッセージ数自動更新

### Row Level Security (RLS)
すべてのテーブルでRLSが有効化され、以下のポリシーが設定されます：
- ユーザーは自分のデータのみアクセス可能
- 同じ会社のユーザーは会社情報を共有可能
- 適切な読み取り・書き込み・削除権限が設定

## ストレージバケットの作成（オプション）

名刺画像やレポートPDFを保存する場合：

1. Supabaseダッシュボードで「Storage」→「Buckets」を開く
2. 「New bucket」をクリック
3. 以下のバケットを作成：
   - `avatars` (Public) - ユーザーアバター画像
   - `business-cards` (Private) - 名刺画像
   - `reports` (Private) - レポートPDF

## トラブルシューティング

### エラー: "relation already exists"
- テーブルが既に存在する場合、スキーマファイルの `CREATE TABLE` を `CREATE TABLE IF NOT EXISTS` に変更するか、既存のテーブルを削除してから再実行

### エラー: "permission denied"
- SupabaseダッシュボードのSQL Editorを使用していることを確認
- Service Role Keyが必要な操作は、ダッシュボードから実行してください

### エラー: "extension uuid-ossp does not exist"
- Supabaseでは `uuid-ossp` 拡張機能は通常利用可能ですが、エラーが出る場合はスキーマファイルの該当行を削除してください（SupabaseはデフォルトでUUIDをサポート）

## 確認方法

スキーマが正しく適用されたか確認するには：

```sql
-- テーブル一覧を確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 各テーブルのカラムを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position;
```


