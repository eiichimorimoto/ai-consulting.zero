#!/bin/bash

# =============================================================================
# AI Consulting Zero - 自動バックアップ設定スクリプト
# =============================================================================
# launchdを使用して毎日午前2時に自動バックアップを実行
# =============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${BLUE}[SUCCESS]${NC} $1"
}

PROJECT_DIR="/Users/eiichi/Documents/ai-consulting-zero"
PLIST_FILE="${PROJECT_DIR}/scripts/auto-backup.plist"
LAUNCHD_DIR="${HOME}/Library/LaunchAgents"
LAUNCHD_PLIST="${LAUNCHD_DIR}/com.ai-consulting-zero.daily-backup.plist"
LOG_DIR="${PROJECT_DIR}/logs"

echo ""
log_info "=========================================="
log_info "自動バックアップ設定"
log_info "=========================================="
echo ""

# ログディレクトリの作成
if [ ! -d "${LOG_DIR}" ]; then
    mkdir -p "${LOG_DIR}"
    log_info "✅ ログディレクトリを作成: ${LOG_DIR}"
fi

# LaunchAgentsディレクトリの確認
if [ ! -d "${LAUNCHD_DIR}" ]; then
    mkdir -p "${LAUNCHD_DIR}"
    log_info "✅ LaunchAgentsディレクトリを作成"
fi

# plistファイルのコピー
log_info "plistファイルをコピー中..."
cp "${PLIST_FILE}" "${LAUNCHD_PLIST}"
log_info "✅ コピー完了: ${LAUNCHD_PLIST}"

# launchdに登録
log_info "launchdに登録中..."
launchctl unload "${LAUNCHD_PLIST}" 2>/dev/null || true
launchctl load "${LAUNCHD_PLIST}"

if [ $? -eq 0 ]; then
    log_success "✅ 自動バックアップの設定が完了しました！"
else
    log_error "❌ 登録に失敗しました"
    exit 1
fi

echo ""
log_info "=========================================="
log_success "設定完了"
log_info "=========================================="
echo ""
log_info "📅 実行スケジュール: 毎日 午前2:00"
log_info "📁 バックアップ先: /Volumes/My Passport/ai-consulting-Backup/"
log_info "📝 ログファイル: ${LOG_DIR}/backup.log"
echo ""
log_warn "⚠️  注意事項:"
log_info "1. MyPassportを毎晩接続しておいてください"
log_info "2. Macをスリープしないでください（または電源オプションで「電源アダプタ接続中はスリープさせない」に設定）"
log_info "3. 暗号化バックアップは週1回手動で実行してください"
echo ""
log_info "📌 手動バックアップコマンド:"
log_info "   ./scripts/backup-to-mypassport-encrypted.sh"
echo ""
log_info "📌 自動バックアップを停止する場合:"
log_info "   launchctl unload ${LAUNCHD_PLIST}"
echo ""
log_info "📌 ログを確認:"
log_info "   tail -f ${LOG_DIR}/backup.log"
echo ""
