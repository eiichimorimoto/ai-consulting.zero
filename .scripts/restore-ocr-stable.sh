#!/bin/bash
# OCR機能を最新の安定版に戻すスクリプト

set -e

echo "🔍 OCR機能の安定版タグを検索中..."
echo ""

# OCR機能の安定版タグを検索
STABLE_TAGS=$(git tag | grep "stable-ocr" | sort -V)
if [ -z "$STABLE_TAGS" ]; then
    echo "❌ OCR機能の安定版タグが見つかりません"
    echo "   先に .scripts/tag-stable.sh でタグを作成してください"
    exit 1
fi

# 最新のタグを取得
LATEST_TAG=$(echo "$STABLE_TAGS" | tail -1)
echo "📋 見つかったOCR安定版タグ:"
echo "$STABLE_TAGS" | tail -5
echo ""
echo "✅ 最新の安定版: $LATEST_TAG"
echo ""

# 確認
read -p "このタグに戻しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ キャンセルしました"
    exit 1
fi

# OCRファイルを戻す
OCR_FILE="app/api/ocr-business-card/route.ts"
echo "🔄 $OCR_FILE を $LATEST_TAG の状態に戻します..."

if git restore --source="$LATEST_TAG" -- "$OCR_FILE"; then
    echo "✅ ファイルを戻しました"
    echo ""
    echo "📋 変更内容:"
    git diff --stat
    echo ""
    
    read -p "変更をコミットしますか？ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add "$OCR_FILE"
        git commit -m "fix: OCR処理を安定版($LATEST_TAG)に戻す"
        echo "✅ コミットしました"
        
        read -p "リモートにプッシュしますか？ (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push origin main
            echo "✅ リモートにプッシュしました"
        fi
    else
        echo "ℹ️  変更はコミットされていません"
        echo "   コミットする場合: git add $OCR_FILE && git commit -m 'fix: OCR処理を安定版に戻す'"
    fi
else
    echo "❌ ファイルの復元に失敗しました"
    exit 1
fi

echo ""
echo "✅ OCR機能を安定版($LATEST_TAG)に戻しました"
echo "   動作確認: npm run dev"


