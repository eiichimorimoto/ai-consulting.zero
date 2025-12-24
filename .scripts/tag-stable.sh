#!/bin/bash
# 動作確認済みの状態にタグをつけるスクリプト

set -e

echo "🔍 現在の状態を確認中..."
echo ""

# Git状態を確認
echo "📋 Git状態:"
git status --short
echo ""

echo "📋 最新のコミット:"
git log --oneline -3
echo ""

# 未コミットの変更があるか確認
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  未コミットの変更があります"
    read -p "先にコミットしますか？ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "コミットメッセージ: " COMMIT_MSG
        git commit -m "$COMMIT_MSG"
    else
        echo "❌ 未コミットの変更があるため、タグ作成を中止します"
        exit 1
    fi
fi

# 動作確認の確認
read -p "全機能が正常動作していますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 動作確認を先に完了してください"
    exit 1
fi

# タグ名を決定
TAG_TYPE="stable"
read -p "タグタイプを選択 (1: stable, 2: stable-ocr, 3: stable-auth, 4: カスタム): " -n 1 -r
echo
case $REPLY in
    1)
        TAG_NAME="stable-$(date +%Y%m%d)"
        ;;
    2)
        TAG_NAME="stable-ocr-$(date +%Y%m%d)"
        ;;
    3)
        TAG_NAME="stable-auth-$(date +%Y%m%d)"
        ;;
    4)
        read -p "カスタムタグ名: " CUSTOM_TAG
        TAG_NAME="$CUSTOM_TAG-$(date +%Y%m%d)"
        ;;
    *)
        TAG_NAME="stable-$(date +%Y%m%d)"
        ;;
esac

# タグメッセージ
read -p "タグメッセージ（空欄可）: " TAG_MSG
if [ -z "$TAG_MSG" ]; then
    TAG_MSG="全機能動作確認済み - $(date +%Y-%m-%d)"
fi

echo ""
echo "🏷️  タグを作成: $TAG_NAME"
echo "📝 メッセージ: $TAG_MSG"
echo ""

read -p "このタグを作成しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ タグ作成をキャンセルしました"
    exit 1
fi

# タグを作成
git tag "$TAG_NAME" -m "$TAG_MSG"

# リモートにプッシュ
read -p "リモートにプッシュしますか？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    git push origin "$TAG_NAME"
    echo "✅ タグ $TAG_NAME をリモートにプッシュしました"
else
    echo "ℹ️  ローカルのみにタグを作成しました"
    echo "   後でプッシュする場合: git push origin $TAG_NAME"
fi

echo ""
echo "✅ タグ $TAG_NAME を作成しました"
echo "   このタグに戻す場合: git restore --source=$TAG_NAME -- <ファイル>"


