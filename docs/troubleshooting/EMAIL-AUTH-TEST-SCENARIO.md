# メール認証URLテストシナリオ

## 📋 テスト目的
メール認証URLをクリックした際に、プロフィール画面（`/auth/complete-profile`）に正しくリダイレクトされるか確認する。

## 🔍 テスト手順

### ステップ1: ログファイルの確認
```bash
# ログファイルをクリア（テスト開始前）
rm -f .cursor/debug.log

# または、ログファイルの内容を確認
cat .cursor/debug.log | tail -n 50
```

### ステップ2: メール認証URLの取得
1. 新規登録を実行（`/auth/sign-up`）
2. メールボックスを確認
3. Supabaseから送信されたメール認証URLをコピー
   - 例: `https://fwruumlkxzfihlmygrww.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=https://ai-consulting-zero.vercel.app`

### ステップ3: メール認証URLをクリック
1. **ブラウザの開発者ツールを開く**（F12）
2. **Networkタブを開く**
3. **メール認証URLをクリック**（またはアドレスバーに貼り付けてEnter）
4. **リダイレクトの流れを確認**:
   - 最初のリクエスト: Supabaseのverify URL
   - 2番目のリクエスト: アプリケーションのリダイレクト先（`/auth/callback`または`/`）
   - 3番目のリクエスト: 最終的なリダイレクト先（`/auth/complete-profile`または`/auth/login`）

### ステップ4: リダイレクト先のURLを確認
**重要**: ブラウザのアドレスバーに表示される最終的なURLを確認してください。

**期待される動作**:
1. Supabaseのverify URLをクリック
2. `https://ai-consulting-zero.vercel.app/auth/callback?code=...` にリダイレクト
3. `https://ai-consulting-zero.vercel.app/auth/complete-profile` にリダイレクト

**実際の動作**（問題がある場合）:
1. Supabaseのverify URLをクリック
2. `https://ai-consulting-zero.vercel.app` にリダイレクト（`?code=`なし）
3. トップページが表示される

### ステップ5: ログファイルの確認
```bash
# ログファイルの内容を確認
cat .cursor/debug.log | jq -r '.message' | sort | uniq -c | sort -rn

# または、すべてのログエントリを確認
cat .cursor/debug.log | jq '.'
```

**確認項目**:
- `callback entry`: `/auth/callback`へのアクセスが記録されているか
- `code check`: `code`パラメータが検出されているか
- `redirecting to callback`: トップページから`/auth/callback`へのリダイレクトが実行されているか
- `success redirecting to profile`: プロフィール画面へのリダイレクトが成功しているか

## 🐛 問題の特定

### 問題1: `/auth/callback`へのアクセスログがない
**原因**: Supabaseが`redirect_to`を無視して、Site URL（トップ）に直接リダイレクトしている

**解決策**:
1. Supabaseの設定を確認（Site URLとRedirect URLs）
2. `emailRedirectTo`が正しく設定されているか確認
3. `proxy.ts`のフォールバック処理が動作しているか確認

### 問題2: `code`パラメータがない
**原因**: Supabaseが`?code=`パラメータを付けてリダイレクトしていない

**解決策**:
1. SupabaseのPKCE設定を確認
2. `emailRedirectTo`が完全なURLであることを確認
3. Redirect URLsに`/auth/callback`が登録されていることを確認

### 問題3: プロフィール画面にリダイレクトされない
**原因**: `exchangeCodeForSession`が失敗している、または`next`パラメータが正しく設定されていない

**解決策**:
1. `app/auth/callback/route.ts`のログを確認
2. `exchangeCodeForSession`のエラーを確認
3. `next`パラメータのデフォルト値（`/auth/complete-profile`）が正しく設定されているか確認

## 📊 テスト結果の記録

テスト実施後、以下の情報を記録してください：

1. **メール認証URL**: `https://fwruumlkxzfihlmygrww.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=...`
2. **最初のリダイレクト先**: `https://ai-consulting-zero.vercel.app/...`
3. **最終的なリダイレクト先**: `https://ai-consulting-zero.vercel.app/...`
4. **`?code=`パラメータの有無**: あり / なし
5. **ログファイルの内容**: `.cursor/debug.log`の内容

## 🔧 トラブルシューティング

### ログファイルが見つからない場合
```bash
# ログファイルの場所を確認
ls -la .cursor/debug.log

# ログファイルが存在しない場合は、ディレクトリを作成
mkdir -p .cursor
```

### ログファイルが大きすぎる場合
```bash
# 最後の50行を表示
tail -n 50 .cursor/debug.log

# または、特定のメッセージを検索
grep "callback entry" .cursor/debug.log
```

## ✅ 成功基準

テストが成功した場合：
- ✅ `/auth/callback`へのアクセスログが記録されている
- ✅ `code`パラメータが検出されている
- ✅ プロフィール画面（`/auth/complete-profile`）にリダイレクトされている
- ✅ ログにエラーがない

テストが失敗した場合：
- ❌ `/auth/callback`へのアクセスログがない
- ❌ `code`パラメータが検出されていない
- ❌ トップページにリダイレクトされている
- ❌ ログにエラーが記録されている

