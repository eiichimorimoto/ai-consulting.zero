# Vercel環境変数設定 - 緊急対応

## 🚨 問題

本番環境（Vercel）で500エラーが発生しています。

## ✅ 解決方法

### ステップ1: Vercelダッシュボードを開く

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクト「ai-consulting-zero」を選択

### ステップ2: 環境変数を追加

1. 「Settings」→「Environment Variables」を開く
2. 「Add New」をクリック
3. 以下を入力：
   - **Name**: `GOOGLE_PAGESPEED_API_KEY`
   - **Value**: ローカルの`.env.local`に設定されているAPIキーをコピー
   - **Environment**: **すべてにチェック**（Production, Preview, Development）
4. 「Save」をクリック

### ステップ3: デプロイを再実行

環境変数を追加した後、**必ずデプロイを再実行**してください：

1. 「Deployments」タブを開く
2. 最新のデプロイメントの「...」メニューをクリック
3. 「Redeploy」を選択
4. または、Gitにプッシュして自動デプロイをトリガー

## ⚠️ 重要

- 環境変数を追加しただけでは反映されません
- **必ずデプロイを再実行**してください
- デプロイが完了するまで数分かかる場合があります

## 📋 確認方法

デプロイ完了後、以下で確認：

1. ブラウザで `https://ai-consulting-zero.vercel.app/api/test-env` にアクセス
2. `hasKey: true` が表示されれば設定成功

## 🔍 現在設定されている環境変数

以下の環境変数は既に設定されています：
- ✅ DIFY_API_KEY
- ✅ BRAVE_SEARCH_API_KEY
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ NEXT_PUBLIC_SITE_URL
- ✅ ANTHROPIC_API_KEY
- ✅ OPENAI_API_KEY
- ✅ FIRECRAWL_API_KEY

## ❌ 不足している環境変数

- ❌ **GOOGLE_PAGESPEED_API_KEY** ← **これが原因です**
