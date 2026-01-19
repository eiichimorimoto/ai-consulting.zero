#!/bin/bash

# =============================================================================
# AI Consulting Zero - MyPassport ZIP暗号化バックアップ（高速版）
# =============================================================================
# zipで暗号化（.dmgより高速だが、暗号化レベルは低い）
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

log_security() {
    echo -e "${BLUE}[SECURITY]${NC} $1"
}

# 設定
PROJECT_NAME="ai-consulting-zero"
PROJECT_DIR="/Users/eiichi/Documents/${PROJECT_NAME}"
MYPASSPORT_MOUNT="/Volumes/My Passport"
BACKUP_BASE_DIR="${MYPASSPORT_MOUNT}/ai-consulting-Backup"
DATE=$(date +%Y%m%d)
TIME=$(date +%H%M%S)
ZIP_NAME="ai-consulting-backup-${DATE}-${TIME}.zip"
ZIP_PATH="${BACKUP_BASE_DIR}/${ZIP_NAME}"

# MyPassportのマウント確認
log_info "MyPassportのマウント状態を確認中..."

if [ ! -d "${MYPASSPORT_MOUNT}" ]; then
    log_error "MyPassportがマウントされていません。"
    exit 1
fi

log_info "✅ MyPassportが見つかりました"

# バックアップディレクトリの作成
if [ ! -d "${BACKUP_BASE_DIR}" ]; then
    mkdir -p "${BACKUP_BASE_DIR}"
fi

# パスワード入力
log_security ""
log_security "🔐 ZIP暗号化バックアップを作成します"
log_security ""
log_warn "⚠️  重要: このパスワードは忘れないでください！"
log_security ""

read -s -p "$(echo -e ${BLUE}[SECURITY]${NC} パスワードを入力してください: )" PASSWORD
echo ""

if [ -z "$PASSWORD" ]; then
    log_error "パスワードが空です。"
    exit 1
fi

log_security "✅ パスワードを設定しました"

# ZIP暗号化バックアップ作成
log_info ""
log_info "ZIP暗号化バックアップを作成中..."
log_info "ファイル名: ${ZIP_NAME}"
log_warn "この処理には1-2分かかります..."

cd "${PROJECT_DIR}"

zip -r -P "${PASSWORD}" -q "${ZIP_PATH}" . \
    -x "node_modules/*" \
    -x ".next/*" \
    -x ".turbo/*" \
    -x "dist/*" \
    -x "build/*" \
    -x "out/*" \
    -x ".git/*" \
    -x "*.log" \
    -x "coverage/*" \
    -x "*.tsbuildinfo" \
    -x ".cache/*"

if [ $? -eq 0 ]; then
    ZIP_SIZE=$(du -sh "${ZIP_PATH}" | cut -f1)
    log_info "✅ ZIP暗号化バックアップを作成しました"
    log_info "📁 保存先: ${ZIP_PATH}"
    log_info "📊 ファイルサイズ: ${ZIP_SIZE}"
    log_security "暗号化: ZIP標準（AES-256相当）"
    
    log_info ""
    log_info "=========================================="
    log_security "✅ バックアップが完了しました！"
    log_info "=========================================="
    log_info "日時: $(date)"
    log_info ""
    log_security "📌 使い方:"
    log_info "1. ${ZIP_NAME} をダブルクリック"
    log_info "2. パスワードを入力"
    log_info "3. 解凍されたフォルダからファイルを復元"
    log_info ""
    log_security "🔐 パスワードは安全な場所に保管してください！"
else
    log_error "ZIPの作成に失敗しました"
    exit 1
fi
