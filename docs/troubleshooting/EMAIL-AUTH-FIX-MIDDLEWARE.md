# メール認証リダイレクト修正 - ミドルウェアの修正

## 📅 修正日
2024-12-19

## 🐛 問題
メール認証URLをクリックした際に、プロフィール画面（`/auth/complete-profile`）にリダイレクトされない問題が発生していました。

## 🔍 原因
`proxy.ts`がNext.jsのミドルウェアとして認識されていませんでした。

**Next.jsの仕様**:
- Next.jsは`middleware.ts`という名前のファイルを自動的にミドルウェアとして認識します
- `proxy.ts`という名前では認識されません
- ミドルウェアの関数名は`middleware`である必要があります

## ✅ 修正内容

### 1. ファイル名の変更
```bash
proxy.ts → middleware.ts
```

### 2. 関数名の変更
```typescript
// 修正前
export async function proxy(request: NextRequest) {
  // ...
}

// 修正後
export async function middleware(request: NextRequest) {
  // ...
}
```

### 3. ログメッセージの更新
- `location:'proxy.ts:7'` → `location:'middleware.ts:7'`
- `'proxy entry'` → `'middleware entry'`
- `console.log('[proxy] ...')` → `console.log('[middleware] ...')`

## 📋 修正ファイル
- `middleware.ts` (旧: `proxy.ts`)
- `app/auth/sign-up/page.tsx` (ログメッセージの追加)

## 🧪 テスト結果
- ✅ プロフィール画面の存在確認 - 成功
- ✅ コールバックルートの存在確認 - 成功
- ✅ ミドルウェアの存在確認 - 成功
- ✅ コード内のリダイレクト先確認 - 成功
- ✅ 実際のメール認証URLテスト - 成功（プロフィール画面にリダイレクト）

## 🔄 動作フロー（修正後）

1. **メール認証URLをクリック**
   ```
   https://fwruumlkxzfihlmygrww.supabase.co/auth/v1/verify?token=...&type=signup&redirect_to=https://ai-consulting-zero.vercel.app
   ```

2. **Supabaseがリダイレクト**
   - `redirect_to`が`/auth/callback`に設定されている場合: `https://ai-consulting-zero.vercel.app/auth/callback?code=...`
   - `redirect_to`がトップ（`/`）に設定されている場合: `https://ai-consulting-zero.vercel.app?code=...`

3. **ミドルウェア（middleware.ts）が処理**
   - トップページ（`/`）に`?code=`パラメータがある場合、`/auth/callback?code=...&next=/auth/complete-profile`にリダイレクト
   - `/auth/callback`に直接アクセスした場合、そのまま処理を続行

4. **コールバックルート（app/auth/callback/route.ts）が処理**
   - `code`パラメータを検証
   - `exchangeCodeForSession`でセッション交換
   - 成功した場合、`/auth/complete-profile`にリダイレクト

5. **プロフィール画面（app/auth/complete-profile/page.tsx）が表示**
   - 認証状態を確認
   - プロフィール登録画面を表示

## ⚠️ 重要な注意事項

### チェックリスト
- [ ] `middleware.ts`がプロジェクトルートに存在する
- [ ] 関数名が`middleware`である
- [ ] `export const config`が設定されている
- [ ] `matcher`が正しく設定されている
- [ ] ログメッセージが正しく更新されている

### 今後の変更時の注意
1. **ファイル名を変更しない**: `middleware.ts`はNext.jsが自動認識するため、名前を変更しないでください
2. **関数名を変更しない**: `middleware`という関数名は必須です
3. **configの設定**: `export const config`は必須です

## 📚 関連ドキュメント
- `docs/troubleshooting/EMAIL-AUTH-TEST-SCENARIO.md`: テストシナリオ
- `docs/setup/README-SUPABASE-REDIRECT-SETUP.md`: Supabase設定ガイド

## 🔗 参考リンク
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)


