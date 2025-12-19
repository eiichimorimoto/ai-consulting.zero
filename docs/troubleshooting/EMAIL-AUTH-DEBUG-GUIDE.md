# メール認証リダイレクト デバッグガイド

## 📋 デバッグ手順

### ステップ1: ログファイルの準備

```bash
# .cursorディレクトリが存在することを確認
mkdir -p .cursor

# ログファイルをクリア（テスト開始前）
rm -f .cursor/debug.log
```

### ステップ2: ログ監視の開始

**方法1: リアルタイム監視（推奨）**
```bash
# 別のターミナルで実行
tail -f .cursor/debug.log
```

**方法2: ログ監視スクリプトを使用**
```bash
.cursor/test-log.sh
```

### ステップ3: 新規登録を実行

1. http://localhost:3000/auth/sign-up にアクセス
2. メールアドレスとパスワードを入力
3. サインアップボタンをクリック
4. ブラウザのConsoleタブ（F12）でログを確認

### ステップ4: メール認証URLをクリック

1. メールボックスを確認
2. Supabaseからのメール認証URLをコピー
3. ブラウザの開発者ツール（F12）を開く
4. **Networkタブ**を開く
5. メール認証URLをクリック（またはアドレスバーに貼り付けてEnter）

### ステップ5: ログを確認

#### 開発サーバーのターミナルで確認すべきログ

```
[auth/callback] ===== CALLBACK ENTRY =====
[auth/callback] Full URL: http://localhost:3000/auth/callback?code=...
[auth/callback] Code: present (XX chars)
[auth/callback] Session exchange successful
[auth/callback] User authenticated: { userId: '...', email: '...' }
[auth/callback] Profile check: { hasProfile: true/false, profileName: '...', hasCompanyId: true/false }
[auth/callback] Profile incomplete, redirecting to complete-profile
または
[auth/callback] Profile complete, redirecting to: /dashboard
```

#### ログファイルで確認

```bash
cat .cursor/debug.log | tail -50
```

#### ブラウザのNetworkタブで確認

1. `/auth/callback` リクエストを探す
2. Status Codeを確認（200, 302, 401, 500など）
3. Responseタブでレスポンス内容を確認

## 🔍 確認すべきポイント

### 1. codeパラメータの有無
- ✅ **正常**: `Code: present (XX chars)`
- ❌ **問題**: `Code: missing` → ログインページにリダイレクトされる

### 2. セッション交換の結果
- ✅ **正常**: `Session exchange successful`
- ❌ **問題**: `Session exchange error` → エラーメッセージを確認

### 3. プロフィールの状態
- ✅ **新規登録**: `Profile incomplete` → `/auth/complete-profile`にリダイレクト
- ✅ **既存ユーザー**: `Profile complete` → `/dashboard`にリダイレクト

### 4. リダイレクト先
- ✅ **期待**: `/auth/complete-profile`（新規登録の場合）
- ❌ **問題**: `/auth/login` → エラーが発生している可能性

## 🐛 よくある問題と対処法

### 問題1: codeパラメータがない

**症状**: `Code: missing` がログに表示される

**原因**:
- Supabaseが`redirect_to`を無視してトップページにリダイレクト
- メールリンクの`redirect_to`パラメータが正しく設定されていない

**対処法**:
1. Supabaseの「URL Configuration」でSite URLとRedirect URLsを確認
2. `middleware.ts`のフォールバック処理が動作しているか確認

### 問題2: セッション交換エラー

**症状**: `Session exchange error` がログに表示される

**原因**:
- codeが期限切れ
- codeが無効
- ネットワークエラー

**対処法**:
1. エラーメッセージを確認
2. 新しいメール認証URLを取得して再試行

### 問題3: プロフィールが完成していると判定される

**症状**: 新規登録なのに`Profile complete`と表示される

**原因**:
- トリガー関数がプロフィールを作成している
- 既存のプロフィールデータが残っている

**対処法**:
1. プロフィールの`name`と`company_id`を確認
2. `name='User'`または`company_id`がnullの場合は未完成と判定される

## 📊 ログの例

### 正常なケース（新規登録）

```
[auth/callback] ===== CALLBACK ENTRY =====
[auth/callback] Code: present (64 chars)
[auth/callback] Session exchange successful
[auth/callback] User authenticated: { userId: 'xxx', email: 'test@example.com' }
[auth/callback] Profile check: { hasProfile: true, profileName: 'User', hasCompanyId: false }
[auth/callback] Profile incomplete, redirecting to complete-profile
```

### 正常なケース（既存ユーザー）

```
[auth/callback] ===== CALLBACK ENTRY =====
[auth/callback] Code: present (64 chars)
[auth/callback] Session exchange successful
[auth/callback] User authenticated: { userId: 'xxx', email: 'test@example.com' }
[auth/callback] Profile check: { hasProfile: true, profileName: '田中太郎', hasCompanyId: 'xxx' }
[auth/callback] Profile complete, redirecting to: /dashboard
```

### エラーケース

```
[auth/callback] ===== CALLBACK ENTRY =====
[auth/callback] Code: missing
[auth/callback] No code parameter found, redirecting to login
```

または

```
[auth/callback] ===== CALLBACK ENTRY =====
[auth/callback] Code: present (64 chars)
[auth/callback] Session exchange error: { message: 'Code expired', status: 400 }
[auth/callback] Code expired or invalid, redirecting to login
```

