# 確認メールが届かない場合のトラブルシューティング

## 1. Supabaseダッシュボードでの設定確認

### ステップ1: メール送信が有効になっているか確認

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にアクセス
2. プロジェクト「ai^consulting-zero」を選択
3. 左メニューから「Authentication」→「Providers」を開く
4. 「Email」が有効（Enabled）になっているか確認
   - 無効の場合は、有効にして「Save」をクリック

### ステップ2: メール確認の設定を確認

1. 「Authentication」→「Settings」を開く
2. 「Email Auth」セクションを確認
3. 「Enable email confirmations」が有効になっているか確認
   - 開発環境では無効にすることも可能（後述）

### ステップ3: Site URLとRedirect URLsを確認

1. 「Authentication」→「URL Configuration」を開く
2. **Site URL** が設定されているか確認：
   - 開発環境: `http://localhost:3000`
   - 本番環境: 実際のドメイン
3. **Redirect URLs** に以下が追加されているか確認：
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/complete-profile`
   - 本番環境のURLも同様に追加

### ステップ4: メールテンプレートの確認

1. 「Authentication」→「Email Templates」を開く
2. 「Confirm signup」テンプレートが設定されているか確認
3. テンプレートが空の場合は、`supabase/email-templates.md`の内容をコピー＆ペースト

## 2. 開発環境でのメール送信設定

### オプションA: メール確認を無効にする（開発用）

開発中は、メール確認をスキップしてテストできます：

1. Supabaseダッシュボードで「Authentication」→「Settings」を開く
2. 「Email Auth」セクションで「Enable email confirmations」を**無効**にする
3. 「Save」をクリック

これで、サインアップ後すぐにログインできるようになります。

### オプションB: 実際のメールを送信する（推奨）

1. 「Authentication」→「Settings」を開く
2. 「SMTP Settings」セクションを確認
3. カスタムSMTPサーバーを設定するか、Supabaseのデフォルトメールサービスを使用

**注意**: Supabaseの無料プランでは、メール送信に制限があります。

## 3. よくある問題と解決方法

### 問題1: メールがスパムフォルダに入っている

- スパムフォルダを確認してください
- Gmailの場合、「すべてのメール」フォルダも確認

### 問題2: 無効なメールアドレスを使用している

- 実際に存在するメールアドレスを使用してください
- テスト用のメールアドレス（例: `test@example.com`）は届かない場合があります

### 問題3: メール送信の制限に達している

- Supabaseの無料プランでは、1時間あたりのメール送信数に制限があります
- しばらく待ってから再試行してください

### 問題4: メール確認が無効になっている

- 開発環境では、メール確認を無効にしてテストすることも可能です
- 上記の「オプションA」を参照

## 4. 開発環境での推奨設定

開発中は、以下の設定を推奨します：

1. **メール確認を無効にする**（開発用）
   - サインアップ後すぐにログインできる
   - テストが簡単

2. **または、実際のメールアドレスを使用**
   - 本番環境に近い状態でテストできる
   - メール確認のフローを確認できる

## 5. メール送信の確認方法

### 方法1: Supabaseダッシュボードで確認

1. 「Authentication」→「Users」を開く
2. 作成したユーザーを確認
3. 「Email confirmed」が `false` の場合、メール確認が必要です

### 方法2: ブラウザのコンソールで確認

サインアップ時に、以下のようなログが表示されます：

```javascript
// 成功時
{ user: {...}, session: null }  // メール確認待ち
```

### 方法3: メール送信ログを確認

Supabaseダッシュボードで「Logs」→「Auth Logs」を確認すると、メール送信の履歴が表示されます。

## 6. 緊急時の対処法

メールが届かない場合、以下の方法で一時的にログインできます：

1. Supabaseダッシュボードで「Authentication」→「Users」を開く
2. 対象のユーザーを選択
3. 「Actions」→「Send password reset email」をクリック
4. または、「Actions」→「Confirm email」をクリックして手動で確認

## 7. 本番環境での設定

本番環境では、必ず以下を設定してください：

1. **カスタムSMTPサーバーを設定**
   - SendGrid、Mailgun、AWS SESなどを使用
   - 「Authentication」→「Settings」→「SMTP Settings」で設定

2. **メール確認を有効にする**
   - セキュリティのため、本番環境では必須

3. **Site URLとRedirect URLsを正しく設定**
   - 本番環境のドメインを設定




