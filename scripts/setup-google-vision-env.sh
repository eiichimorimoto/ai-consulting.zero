#!/bin/bash

# Google Cloud Vision API 環境変数設定スクリプト
# 使用方法: ./scripts/setup-google-vision-env.sh <JSONファイルのパス>

if [ $# -eq 0 ]; then
    echo "使用方法: $0 <JSONファイルのパス>"
    echo "例: $0 ~/Downloads/ai-consulting-ocr-xxxxx.json"
    exit 1
fi

JSON_FILE=$1

if [ ! -f "$JSON_FILE" ]; then
    echo "エラー: ファイルが見つかりません: $JSON_FILE"
    exit 1
fi

# JSONファイルの内容を1行に変換（jqを使用、なければNode.jsを使用）
if command -v jq &> /dev/null; then
    JSON_CONTENT=$(jq -c . "$JSON_FILE" | sed "s/'/\\\'/g")
elif command -v node &> /dev/null; then
    JSON_CONTENT=$(node -e "console.log(JSON.stringify(require('$JSON_FILE')))" | sed "s/'/\\\'/g")
else
    # jqもNode.jsもない場合は、改行と余分なスペースを削除
    JSON_CONTENT=$(cat "$JSON_FILE" | tr -d '\n' | sed 's/  */ /g' | sed 's/ *{ */{/g' | sed 's/ *} */}/g' | sed 's/ *: */:/g' | sed 's/ *, */,/g' | sed "s/'/\\\'/g")
fi

# .env.localファイルに追加
ENV_FILE=".env.local"

# 既存のGOOGLE_CLOUD_CREDENTIALSを削除（あれば）
if grep -q "GOOGLE_CLOUD_CREDENTIALS" "$ENV_FILE" 2>/dev/null; then
    echo "既存のGOOGLE_CLOUD_CREDENTIALSを削除します..."
    sed -i.bak '/^GOOGLE_CLOUD_CREDENTIALS=/d' "$ENV_FILE"
    sed -i.bak '/^# Google Cloud Vision API/d' "$ENV_FILE"
fi

# 環境変数を追加
echo "" >> "$ENV_FILE"
echo "# Google Cloud Vision API (名刺OCR用)" >> "$ENV_FILE"
echo "GOOGLE_CLOUD_CREDENTIALS='$JSON_CONTENT'" >> "$ENV_FILE"

echo "✅ 環境変数を設定しました: $ENV_FILE"
echo ""
echo "次のステップ:"
echo "1. 開発サーバーを再起動: npm run dev"
echo "2. プロフィール登録画面で名刺画像をアップロードしてテスト"

