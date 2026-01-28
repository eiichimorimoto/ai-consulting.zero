# 環境変数設定ガイド

**プロジェクト**: AI Consulting Zero  
**最終更新**: 2026-01-28  
**対象**: Phase 1（Dify初期情報送信機能）

---

## 概要

このドキュメントでは、Phase 1 実装に必要な環境変数の設定方法を説明します。

---

## 必須環境変数

### 1. Supabase 設定

```bash
# Supabase URL（クライアント・サーバー共通）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anon Key（クライアント認証用）
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Service Role Key（サーバー管理操作用）
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**用途**:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase プロジェクトURL（クライアント・サーバー両方で使用）
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: ブラウザからのSupabase認証（RLS適用）
- `SUPABASE_SERVICE_ROLE_KEY`: サーバー側の管理操作（RLSバイパス）

**セキュリティ**:
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` は絶対にクライアントに公開しない
- ✅ `NEXT_PUBLIC_*` のみクライアントに公開される

---

### 2. Dify 設定

```bash
# /api/dify/context の認証用APIキー
DIFY_API_KEY=your-dify-api-key-here

# Dify Workflow API の Bearer Token
DIFY_WORKFLOW_API_KEY=app-xxxxxxxxxxxxx

# Dify API のベースURL
DIFY_API_BASE_URL=http://localhost/v1

# 実行するワークフローのID
DIFY_WORKFLOW_ID=your-workflow-id-here
```

**用途**:
- `DIFY_API_KEY`: Difyからの `/api/dify/context` 呼び出しを認証（x-api-key ヘッダー）
- `DIFY_WORKFLOW_API_KEY`: Next.jsからDify Workflow APIへの呼び出しを認証（Authorization: Bearer）
- `DIFY_API_BASE_URL`: Dify API のエンドポイント（環境により変更）
- `DIFY_WORKFLOW_ID`: 実行するワークフローの一意識別子

**環境別の DIFY_API_BASE_URL**:
```bash
# ローカル（Docker）
DIFY_API_BASE_URL=http://localhost/v1
# または
DIFY_API_BASE_URL=http://localhost:5001/v1

# VPS（自前サーバー）
DIFY_API_BASE_URL=https://your-vps-domain/v1

# Dify Cloud（公式クラウド）
DIFY_API_BASE_URL=https://api.dify.ai/v1
```

**取得方法**:
1. **DIFY_WORKFLOW_API_KEY**:
   - Difyダッシュボード → 対象ワークフロー → 設定 → APIキー → 作成
   - 形式: `app-XXXXXXXXXXXXX`

2. **DIFY_WORKFLOW_ID**:
   - Difyダッシュボード → 対象ワークフロー → URL から取得
   - URL: `http://localhost/app/{WORKFLOW_ID}/workflow`
   - 形式: `6f6461c7-b018-415c-bcf2-c1b501621553` (UUID形式)

3. **DIFY_API_KEY**:
   - 自分で生成（ランダムな文字列）
   - `/api/dify/context` の認証に使用
   - Dify の HTTPリクエストノードの `x-api-key` ヘッダーに設定

**セキュリティ**:
- ⚠️ すべてサーバー環境変数のみ（`NEXT_PUBLIC_*` 不要）
- ⚠️ APIキーは絶対にGitにコミットしない
- ⚠️ Vercelデプロイ時は環境変数として設定

---

### 3. アプリケーション設定

```bash
# アプリケーションのベースURL（クライアント用）
NEXT_PUBLIC_APP_URL=http://localhost:3000

# サイトURL（Supabase認証リダイレクト用）
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**環境別の設定**:
```bash
# ローカル開発
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Vercel本番環境
NEXT_PUBLIC_APP_URL=https://ai-consulting-zero.vercel.app
NEXT_PUBLIC_SITE_URL=https://ai-consulting-zero.vercel.app

# カスタムドメイン
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

---

## ローカル開発環境の設定

### 1. .env.local の作成

```bash
# プロジェクトルートに作成
cp .env.example .env.local  # サンプルがあれば
# または
touch .env.local
```

### 2. .env.local の内容

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Dify Configuration
DIFY_API_KEY=your-dify-api-key-here
DIFY_WORKFLOW_API_KEY=app-xxxxxxxxxxxxx
DIFY_API_BASE_URL=http://localhost/v1
DIFY_WORKFLOW_ID=your-workflow-id-here

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. .gitignore の確認

```bash
# .gitignore に以下が含まれていることを確認
.env.local
.env*.local
```

---

## Vercel デプロイ時の設定

### 1. Vercel ダッシュボードでの設定

1. Vercelプロジェクトを開く
2. **Settings** → **Environment Variables** に移動
3. 以下の変数を追加:

| 変数名 | 値 | 環境 |
|--------|---|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fwruumlkxzfihlmygrww.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Production, Preview, Development |
| `DIFY_API_KEY` | `your-dify-api-key-here` | Production, Preview, Development |
| `DIFY_WORKFLOW_API_KEY` | `app-XshFJVgsLzHM3FxAgJ9NXY07` | Production, Preview, Development |
| `DIFY_API_BASE_URL` | `https://your-dify-domain/v1` | Production, Preview, Development |
| `DIFY_WORKFLOW_ID` | `6f6461c7-b018-415c-bcf2-c1b501621553` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://ai-consulting-zero.vercel.app` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://your-preview-url.vercel.app` | Preview |
| `NEXT_PUBLIC_SITE_URL` | `https://ai-consulting-zero.vercel.app` | Production |

**注意事項**:
- ⚠️ `DIFY_API_BASE_URL` は本番環境のDify URLに変更
- ⚠️ `NEXT_PUBLIC_APP_URL` はVercelが自動割り当てたURLまたはカスタムドメイン
- ⚠️ 環境ごと（Production, Preview, Development）に適切な値を設定

### 2. Vercel CLI での設定（オプション）

```bash
# Vercel CLI をインストール
npm i -g vercel

# ログイン
vercel login

# 環境変数を追加
vercel env add DIFY_API_KEY
vercel env add DIFY_WORKFLOW_API_KEY
vercel env add DIFY_API_BASE_URL
vercel env add DIFY_WORKFLOW_ID

# 環境変数を確認
vercel env ls
```

---

## 環境変数の確認方法

### 1. ヘルスチェックエンドポイント

#### /api/dify/context
```bash
# ローカル
curl http://localhost:3000/api/dify/context

# Vercel
curl https://ai-consulting-zero.vercel.app/api/dify/context

# 期待するレスポンス
{
  "status": "ok",
  "endpoint": "Dify Context API",
  "version": "1.0.0",
  "lastUpdated": "2026-01-26",
  "supportedDifyVersions": ["v1.9.0+", "v1.11.4+", "v2.0.0-beta.1+"],
  "latestVersion": "v1.11.4",
  "nextjsVersion": "16.1.0+"
}
```

#### /api/consulting/dify
```bash
# ローカル
curl http://localhost:3000/api/consulting/dify

# Vercel
curl https://ai-consulting-zero.vercel.app/api/consulting/dify

# 期待するレスポンス
{
  "status": "ok",
  "endpoint": "Dify Workflow Proxy",
  "configured": true
}
```

**configured: false の場合**:
- 環境変数が未設定または誤っている
- 以下を確認:
  - `DIFY_WORKFLOW_API_KEY`
  - `DIFY_API_BASE_URL`
  - `DIFY_WORKFLOW_ID`

### 2. 開発サーバーでの確認

```bash
# 開発サーバー起動
npm run dev

# ブラウザで確認
# http://localhost:3000/api/dify/context
# http://localhost:3000/api/consulting/dify
```

---

## トラブルシューティング

### 問題1: configured: false と表示される

**原因**: 環境変数が未設定

**解決策**:
1. `.env.local` を確認
2. 変数名のスペルミスがないか確認
3. 開発サーバーを再起動

```bash
# サーバー再起動
pkill -f "next"
npm run dev
```

### 問題2: Dify API 呼び出しで 401 エラー

**原因**: 
- `DIFY_API_KEY` が Dify の HTTPリクエストノードの `x-api-key` と不一致
- `DIFY_WORKFLOW_API_KEY` が誤っている

**解決策**:
1. `.env.local` の `DIFY_API_KEY` を確認
2. Dify ワークフローの HTTPリクエストノード設定を確認
   - Headers: `x-api-key: {DIFY_API_KEY の値}`
3. `DIFY_WORKFLOW_API_KEY` を Dify ダッシュボードで再確認

### 問題3: Dify Workflow API 呼び出しで 500 エラー

**原因**: 
- `DIFY_API_BASE_URL` が誤っている
- `DIFY_WORKFLOW_ID` が存在しない

**解決策**:
1. `DIFY_API_BASE_URL` を確認
   - ローカル: `http://localhost/v1` または `http://localhost:5001/v1`
   - VPS: `https://your-vps-domain/v1`
   - Cloud: `https://api.dify.ai/v1`
2. `DIFY_WORKFLOW_ID` を確認
   - Dify ダッシュボード → ワークフロー → URL から取得

### 問題4: Vercel デプロイ後に動作しない

**原因**: Vercel の環境変数が未設定または誤っている

**解決策**:
1. Vercel ダッシュボード → Settings → Environment Variables を確認
2. すべての必須環境変数が設定されているか確認
3. `DIFY_API_BASE_URL` が本番環境のURLになっているか確認
4. 変更後、再デプロイ

```bash
# 再デプロイ
vercel --prod
```

---

## セキュリティベストプラクティス

### 1. 環境変数の管理

✅ **推奨**:
- `.env.local` は `.gitignore` に含める
- APIキーは定期的にローテーション
- 本番環境とローカル環境で異なるAPIキーを使用

❌ **禁止**:
- APIキーをGitにコミット
- APIキーをコード内にハードコード
- APIキーをクライアントサイドで使用（`NEXT_PUBLIC_*` は除く）

### 2. NEXT_PUBLIC_* の使い分け

| 変数名 | `NEXT_PUBLIC_*` | 理由 |
|--------|----------------|------|
| `SUPABASE_URL` | ✅ Yes | クライアントからのSupabase接続に必要 |
| `SUPABASE_ANON_KEY` | ✅ Yes | ブラウザからの認証に必要（RLS保護済み） |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ No | RLSをバイパスするため、サーバーのみ |
| `DIFY_API_KEY` | ❌ No | サーバー側の認証専用 |
| `DIFY_WORKFLOW_API_KEY` | ❌ No | サーバー側のDify呼び出し専用 |
| `APP_URL` | ✅ Yes | クライアント側でのURL構築に使用 |

---

## まとめ

### ローカル開発に必要な環境変数
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DIFY_API_KEY
DIFY_WORKFLOW_API_KEY
DIFY_API_BASE_URL
DIFY_WORKFLOW_ID
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_URL
```

### Vercel デプロイに必要な環境変数
上記すべて + 本番環境に応じた値の変更

### 確認チェックリスト
- [ ] `.env.local` に全ての必須変数が設定されている
- [ ] ヘルスチェックエンドポイントで `configured: true` が返る
- [ ] Dify ワークフローの設定が完了している
- [ ] Vercel の環境変数が設定されている（デプロイ時）
- [ ] `.gitignore` に `.env.local` が含まれている
