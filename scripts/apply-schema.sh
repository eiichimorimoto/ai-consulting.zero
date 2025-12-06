#!/bin/bash

# Supabaseデータベーススキーマを適用するスクリプト
# 
# 使用方法:
# 1. Supabase CLIでログイン: supabase login
# 2. このスクリプトを実行: bash scripts/apply-schema.sh

set -e

echo "🚀 Supabaseデータベーススキーマの適用を開始します..."
echo ""

# プロジェクト参照ID
PROJECT_REF="fwruumlkxzfihlmygrww"
SCHEMA_FILE="supabase/schema.sql"

# Supabase CLIがインストールされているか確認
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLIがインストールされていません。"
    echo "インストール: npm install -g supabase"
    exit 1
fi

# ログイン状態を確認
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Supabase CLIにログインしていません。"
    echo "ログイン: supabase login"
    exit 1
fi

# プロジェクトにリンク
echo "📎 プロジェクトにリンク中..."
supabase link --project-ref "$PROJECT_REF" || {
    echo "⚠️  プロジェクトのリンクに失敗しました。"
    echo "手動でリンク: supabase link --project-ref $PROJECT_REF"
    exit 1
}

# スキーマファイルが存在するか確認
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ スキーマファイルが見つかりません: $SCHEMA_FILE"
    exit 1
fi

# SQLを実行
echo "📋 スキーマを適用中..."
supabase db execute --file "$SCHEMA_FILE" || {
    echo "⚠️  スキーマの適用に失敗しました。"
    echo "手動で適用する場合:"
    echo "  1. Supabaseダッシュボードで「SQL Editor」を開く"
    echo "  2. $SCHEMA_FILE の内容をコピー＆ペースト"
    echo "  3. 「Run」をクリック"
    exit 1
}

echo ""
echo "✅ スキーマの適用が完了しました！"
echo ""
echo "📊 作成されたテーブル:"
echo "  - companies (会社情報)"
echo "  - profiles (ユーザープロファイル)"
echo "  - business_cards (名刺情報)"
echo "  - company_web_resources (Web検索結果)"
echo "  - consulting_sessions (コンサルセッション)"
echo "  - consulting_messages (チャットメッセージ)"
echo "  - reports (レポート)"
echo "  - subscriptions (サブスクリプション)"
echo "  - activity_logs (アクティビティログ)"
echo ""










