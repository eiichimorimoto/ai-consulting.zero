# Supabase リダイレクト設定ガイド

## 📧 メール認証URLについて

メールに表示されるSupabaseのURLは**正常な動作**です。これはSupabaseが生成する認証用のURLで、セキュリティ上問題ありません。

```
https://fwruumlkxzfihlmygrww.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=https://ai-consulting-zero.vercel.app
```

このURLは：
- ✅ Supabaseの公式ドメイン（`supabase.co`）を使用
- ✅ トークンベースの認証で安全
- ✅ 有効期限付き（通常24時間）

## 🔧 Supabase設定手順

### ステップ1: Site URLの設定

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にアクセス
2. プロジェクトを選択
3. 左メニューから「**Authentication**」→「**URL Configuration**」を開く
4. **Site URL**を以下のように設定：
   ```
   https://ai-consulting-zero.vercel.app
   ```
   ⚠️ **重要**: 末尾にスラッシュ（`/`）を付けないでください

### ステップ2: Redirect URLsの設定

**Redirect URLs**に以下を追加（1行ずつ）：

```
https://ai-consulting-zero.vercel.app/auth/callback
https://ai-consulting-zero.vercel.app/auth/complete-profile
https://ai-consulting-zero.vercel.app/**
```

最後の`/**`はワイルドカードで、すべてのパスを許可します。

### ステップ3: 環境変数の確認

Vercelの環境変数で以下が設定されているか確認：

```
NEXT_PUBLIC_SITE_URL=https://ai-consulting-zero.vercel.app
```

⚠️ **重要**: 末尾にスラッシュ（`/`）を付けないでください

### ステップ4: 保存と確認

1. 「**Save**」をクリック
2. 設定が反映されるまで数秒待つ
3. 新しいサインアップでメールを確認し、`redirect_to`パラメータが正しく設定されているか確認

## 🔍 トラブルシューティング

### 問題: メールの`redirect_to`がトップ（`/`）になっている

**原因**: SupabaseのSite URLが正しく設定されていない、または`emailRedirectTo`が正しく渡されていない

**解決方法**:
1. Supabaseの「URL Configuration」でSite URLを確認
2. 環境変数`NEXT_PUBLIC_SITE_URL`が正しく設定されているか確認
3. アプリケーション側のフォールバック処理により、`?code=`が付いている場合は自動的に`/auth/callback`にリダイレクトされます

### 問題: メールからプロフィール画面に飛ばない

**確認項目**:
1. `app/auth/callback/route.ts`が正しく動作しているか
2. `proxy.ts`のフォールバック処理が動作しているか
3. ブラウザのコンソールでエラーがないか確認

## 📝 コード側の実装

アプリケーション側では以下のフォールバック処理が実装されています：

1. **`app/auth/sign-up/page.tsx`**: `emailRedirectTo`を`/auth/callback?next=/auth/complete-profile`に設定
2. **`app/auth/callback/route.ts`**: `next`パラメータに基づいてリダイレクト（デフォルト: `/auth/complete-profile`）
3. **`proxy.ts`**: トップページに`?code=`が付いている場合、自動的に`/auth/callback`にリダイレクト
4. **`app/page.tsx`**: クライアント側でも`?code=`を検出してリダイレクト

これにより、Supabaseの設定が不完全でも、アプリケーション側で確実にプロフィール画面にリダイレクトされます。

