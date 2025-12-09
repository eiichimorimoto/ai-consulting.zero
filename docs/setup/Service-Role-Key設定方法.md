# Supabase Service Role Key 設定方法

## 問題

新規登録時にRLSポリシー違反（エラーコード42501）が発生しています。これは、サインアップ直後はセッションが確立されていないため、サーバー側で`auth.uid()`が取得できず、プロファイル作成がブロックされているためです。

## 解決方法

Service Roleキーを使用してRLSをバイパスする必要があります。

## ステップ1: Service Role Keyを取得

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にアクセス
2. プロジェクト「ai^consulting-zero」を選択
3. 「Settings」→「API」を開く
4. 「Project API keys」セクションを確認
5. **`service_role`キー**をコピー
   - ⚠️ **重要**: `anon`（公開）キーではなく、`service_role`（秘密）キーを使用してください
   - `service_role`キーは機密情報です。Gitにコミットしないでください

## ステップ2: 環境変数に追加

`.env.local`ファイルを開いて、以下を追加：

```env
# Supabase Service Role Key (RLSをバイパスするために使用)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**重要**: `service_role`キー全体をコピー＆ペーストしてください。

## ステップ3: 開発サーバーを再起動

```bash
npm run dev
```

## 動作の説明

- Service Roleキーを使用することで、RLSポリシーをバイパスしてプロファイルを作成できます
- サインアップ直後、セッションがなくてもプロファイルを作成可能になります
- セキュリティ上、Service Roleキーはサーバー側のみで使用し、クライアント側には公開しないでください

## セキュリティ注意事項

⚠️ **Service Role Keyは機密情報です**:

1. **Gitにコミットしない**: `.env.local`は`.gitignore`に含まれていることを確認
2. **公開しない**: このキーをGitHubやその他の公開リポジトリにプッシュしない
3. **サーバー側のみで使用**: クライアント側のコードでは使用しない
4. **本番環境**: Vercelなどの環境変数として設定

## トラブルシューティング

### Service Role Keyが見つからない場合

Supabaseダッシュボードで：
1. 「Settings」→「API」を開く
2. 「Project API keys」セクションを確認
3. `service_role`キーが表示されない場合は、Supabaseのドキュメントを参照


