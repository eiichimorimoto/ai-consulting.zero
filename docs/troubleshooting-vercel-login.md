# Vercel プレビューでログインできない場合のチェックリスト

## 1. Vercel の環境変数（最も多い原因）

- **Vercel Dashboard** → 対象プロジェクト → **Settings** → **Environment Variables**
- 次が **すべての環境**（Production / Preview / Development）で設定されているか確認：
  - `NEXT_PUBLIC_SUPABASE_URL` … Supabase プロジェクトの URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` … Supabase の anon (public) key
- **重要**: プレビューURL（`*-xxx.vercel.app`）で使うには **Preview** にチェックが入っている必要があります。Production のみだとプレビューでは未設定になります。
- 変更したら **Redeploy**（Deployments → 該当デプロイの ⋮ → Redeploy）で再ビルドしてください。`NEXT_PUBLIC_*` はビルド時に埋め込まれるため、再デプロイしないと反映されません。

## 2. 画面上の状態で切り分け

| 症状 | 想定原因 | 対処 |
|------|----------|------|
| 「Supabase未設定」のカードが出る / ログインボタンが押せない | Vercel に環境変数が無い、または Preview に未適用 | 上記1を設定し、Redeploy |
| ログイン押下後に「Invalid login credentials」 | メール/パスワードの誤り、または Supabase にそのユーザーが無い | 正しいアカウントで再試行。Supabase Dashboard → Authentication → Users でユーザー確認 |
| ログイン押下後にネットワーク系エラー | Supabase URL/Key の誤り、または CORS/ネットワーク制限 | 環境変数の値を確認（本番用プロジェクトの URL/anon key か） |
| ログイン成功のように見えるがすぐログアウトされる | Cookie が保存されない（SameSite/ドメイン） | 本番ドメインとプレビュードメインで Cookie 設定を確認。通常は Vercel プレビューでも動作する想定 |

## 3. Supabase 側の確認

- **Authentication** → **Providers** で **Email** が有効か
- **Authentication** → **Users** で該当メールのユーザーが存在するか
- 本番とプレビューで**同じ Supabase プロジェクト**の URL/anon key を使っているか（別プロジェクトの key を入れていないか）

## 4. このプロジェクトの認証フロー（参考）

- ログイン: `app/auth/login/page.tsx` で **メール + パスワード**（`signInWithPassword`）
- 環境変数: `lib/supabase/client.ts` の `isSupabaseConfigured()` が `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` の有無を参照
- 保護ルート: `lib/supabase/proxy.ts`（proxy）で `/dashboard` 未ログイン時は `/auth/login` にリダイレクト

## 5. 再デプロイの注意

`NEXT_PUBLIC_*` を変更した場合、**必ず Redeploy** してください。既存のビルド成果物には古い値（または空）が埋め込まれたままです。

---

## 6. メール確認リンクで「確認コードエラー」「有効期限切れ」になる場合

### よくある原因

1. **リンクの有効期限（約1時間）**  
   メール内のリンクは発行から約1時間で無効になります。時間が経ってからクリックするとエラーになります。

2. **同じリンクを2回以上クリック**  
   確認リンクは**1回だけ**有効です。一度ログインに使うと、同じリンクを再度開くと「確認コードエラー」や「アクセスが拒否されました」になります。

3. **Supabase の Redirect URL 未登録**  
   メール内リンクの飛び先（`https://あなたのドメイン/auth/callback`）が Supabase に登録されていないと、Supabase がエラーで返すことがあります。

### 対処（Supabase 側）

- **Supabase Dashboard** → **Authentication** → **URL Configuration**
- **Redirect URLs** に、次の形式で**本番・プレビュー両方**を追加する：
  - `https://ai-consulting-zero.vercel.app/auth/callback`
  - プレビューを使う場合: `https://*.vercel.app/auth/callback` または各プレビューURLを1件ずつ追加
- **Site URL** を本番URLに合わせる（例: `https://ai-consulting-zero.vercel.app`）

### ユーザー向け

- 画面の「確認メールを再送信」から、新しい確認メールを送ってもらう。
- 新しいメールのリンクは**1回だけ**、**届いてから1時間以内**に開く。
