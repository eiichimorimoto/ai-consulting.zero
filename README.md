# AI Consulting App

AIを活用した経営コンサルティングSaaSアプリケーション

## 機能概要

| 機能 | 説明 |
|-----|------|
| AIコンサルティング | 24時間365日、経営課題についてAIに相談 |
| 名刺OCR | 名刺スキャンで連絡先・会社情報を自動取得 |
| 会社情報管理 | Web検索による企業情報の自動収集 |
| プロファイル管理 | ユーザー情報・会社情報の編集 |
| レポート生成 | AIとの対話から経営診断レポートを生成 |

## 技術スタック

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: Anthropic Claude API
- **検索**: Brave Search API
- **デプロイ**: Vercel

---

## セットアップ手順（Cursor使用）

### 1. プロジェクトをCursorで開く

```bash
# プロジェクトフォルダに移動
cd ai-consulting-app

# Cursorで開く
cursor .
```

### 2. 依存関係のインストール

Cursorのターミナルで実行：

```bash
npm install
```

### 3. Supabaseプロジェクトの作成

#### 3.1 Supabaseダッシュボードでプロジェクト作成

1. https://supabase.com にアクセス
2. 「New Project」をクリック
3. 以下の情報を入力：
   - **Organization**: eiichimorimoto'sOrg
   - **Project name**: ai-consulting
   - **Database Password**: 安全なパスワードを設定（メモしておく）
   - **Region**: Northeast Asia (Tokyo)
4. 「Create new project」をクリック

#### 3.2 データベーススキーマの適用

1. Supabaseダッシュボードで「SQL Editor」を開く
2. `supabase/schema.sql`の内容をコピー＆ペースト
3. 「Run」をクリックして実行

#### 3.3 認証設定

1. Supabaseダッシュボードで「Authentication」→「Providers」
2. 「Email」が有効になっていることを確認
3. 「Authentication」→「Settings」→「Email Auth」で以下を確認：
   - 「Enable email confirmations」の設定（開発環境では無効にすることも可能）
4. 「Authentication」→「URL Configuration」で以下を設定：
   - **Site URL**: `http://localhost:3000`（開発環境）
   - **Redirect URLs** に以下を追加：
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/complete-profile`
5. メールが届かない場合は、`README-EMAIL-TROUBLESHOOTING.md` を参照

#### 3.4 ストレージバケットの作成

1. Supabaseダッシュボードで「Storage」を開く
2. 以下のバケットを作成：
   - `avatars` (Public)
   - `business-cards` (Private)
   - `reports` (Private)

### 4. 環境変数の設定

#### 4.1 `.env.local`ファイルを作成

```bash
cp .env.local.example .env.local
```

#### 4.2 Supabaseの認証情報を取得

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下の値をコピー：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 4.3 `.env.local`を編集

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Cloud Vision API（名刺OCR用）
# 詳細は README-GOOGLE-VISION-SETUP.md を参照
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# Edge Functions用（後で設定）
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_SEARCH_API_KEY=BSA...
```

**Google Cloud Vision APIの設定**: 名刺OCR機能を使用する場合は、`README-GOOGLE-VISION-SETUP.md`を参照して設定してください。

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

---

## Edge Functions（Supabase）のデプロイ

### OCR処理、企業検索、AIチャット用のEdge Functionsを設定

#### 1. Supabase CLIのインストール

```bash
npm install -g supabase
```

#### 2. Supabaseにログイン

```bash
supabase login
```

#### 3. プロジェクトをリンク

```bash
supabase link --project-ref your-project-ref
```

#### 4. シークレットの設定

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
supabase secrets set BRAVE_SEARCH_API_KEY=BSAxxxxx
```

#### 5. Edge Functionsのデプロイ

```bash
# 各関数をデプロイ
supabase functions deploy ocr-business-card
supabase functions deploy search-company
supabase functions deploy ai-consulting
```

---

## Vercelへのデプロイ

### 1. GitHubリポジトリにプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/ai-consulting-app.git
git push -u origin main
```

### 2. Vercelでプロジェクトをインポート

1. https://vercel.com にアクセス
2. 「Add New」→「Project」
3. GitHubリポジトリを選択
4. 環境変数を設定：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 「Deploy」をクリック

### 3. Supabaseの設定を更新

デプロイ後、Supabaseダッシュボードで：

1. 「Authentication」→「URL Configuration」
2. **Site URL**: Vercelの本番URL（例：`https://ai-consulting.vercel.app`）
3. **Redirect URLs**: 上記URLを追加

---

## プロジェクト構造

```
ai-consulting-app/
├── src/
│   ├── app/
│   │   ├── globals.css      # グローバルスタイル
│   │   ├── layout.tsx       # ルートレイアウト
│   │   └── page.tsx         # メインアプリケーション
│   ├── components/          # 再利用可能なコンポーネント
│   ├── lib/
│   │   ├── supabase.ts      # Supabaseクライアント・型定義
│   │   └── auth-utils.ts    # 認証ユーティリティ
│   └── types/               # TypeScript型定義
├── supabase/
│   └── schema.sql           # データベーススキーマ
├── public/                  # 静的ファイル
├── .env.local.example       # 環境変数テンプレート
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## 主要な画面

| 画面 | パス | 説明 |
|-----|------|------|
| ランディングページ | `/` (未認証) | サービス紹介・料金プラン |
| ログイン | `/` (login state) | メール/パスワード認証 |
| サインアップ | `/` (signup state) | 2ステップ登録（個人情報→会社情報） |
| ダッシュボード | `/` (authenticated) | 概要・クイックアクション |
| AIコンサルティング | セッション管理 | AIチャット画面 |
| 名刺管理 | 名刺一覧・OCR | 連絡先管理 |
| レポート | レポート一覧 | 経営診断レポート |
| 設定 | プロファイル/会社情報/プラン | 各種設定 |

---

## データベーステーブル

| テーブル | 説明 |
|---------|------|
| `companies` | 会社情報（同一会社ユーザー間で共有） |
| `profiles` | ユーザープロファイル |
| `business_cards` | 名刺情報 |
| `consulting_sessions` | コンサルティングセッション |
| `consulting_messages` | チャットメッセージ |
| `reports` | 分析レポート |
| `subscriptions` | サブスクリプション |
| `activity_logs` | アクティビティログ |

---

## セキュリティ

- **Row Level Security (RLS)**: 全テーブルでRLS有効
- **認証**: Supabase Auth（Email/Password）
- **データ分離**: ユーザーは自分のデータのみアクセス可能
- **会社情報共有**: 同一会社IDを持つユーザー間で会社情報を共有

---

## トラブルシューティング

### npm install でエラーが出る

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### Supabase接続エラー

1. `.env.local`のURLとキーが正しいか確認
2. Supabaseダッシュボードでプロジェクトが起動しているか確認

### 認証が動作しない

1. Supabaseの「Authentication」→「Providers」でEmailが有効か確認
2. Site URLとRedirect URLsが正しく設定されているか確認

---

## ライセンス

MIT License
