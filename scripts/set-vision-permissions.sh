#!/bin/bash

# Cloud Vision API 権限設定スクリプト
# サービスアカウントにEditorロールを付与します

PROJECT_ID="aiconsultingzero"
SERVICE_ACCOUNT="vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com"
ROLE="roles/editor"

echo "🔧 Cloud Vision API 権限を設定します..."
echo "プロジェクト: $PROJECT_ID"
echo "サービスアカウント: $SERVICE_ACCOUNT"
echo "ロール: $ROLE"
echo ""

# gcloudがインストールされているか確認
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLIがインストールされていません"
    echo ""
    echo "インストール方法:"
    echo "1. https://cloud.google.com/sdk/docs/install にアクセス"
    echo "2. お使いのOSに合わせてインストール手順に従う"
    echo ""
    echo "または、Google Cloud Consoleから手動で設定してください"
    exit 1
fi

# 認証確認
echo "🔐 認証状態を確認します..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "⚠️ 認証されていません。ログインします..."
    gcloud auth login
fi

# プロジェクトを設定
echo "📁 プロジェクトを設定します..."
gcloud config set project $PROJECT_ID

# ロールを付与
echo "🔑 ロールを付与します..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="$ROLE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ロールの付与が完了しました！"
    echo ""
    echo "次のステップ:"
    echo "1. 5-10分待つ（権限の反映に時間がかかる場合があります）"
    echo "2. 開発サーバーを再起動: npm run dev"
    echo "3. 名刺画像をアップロードしてテスト"
else
    echo ""
    echo "❌ ロールの付与に失敗しました"
    echo ""
    echo "考えられる原因:"
    echo "- プロジェクトのオーナー権限がない"
    echo "- サービスアカウントが存在しない"
    echo "- ネットワークエラー"
    echo ""
    echo "Google Cloud Consoleから手動で設定してください"
    exit 1
fi



