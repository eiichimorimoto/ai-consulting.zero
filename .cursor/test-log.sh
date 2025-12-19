#!/bin/bash
# ログファイルをリアルタイムで監視するスクリプト

echo "=== ログ監視を開始します ==="
echo "メール認証URLをクリックして、ログを確認してください"
echo ""
echo "監視を停止するには Ctrl+C を押してください"
echo ""

tail -f .cursor/debug.log 2>/dev/null || echo "ログファイルがまだ生成されていません。メール認証URLをクリックしてください。"
