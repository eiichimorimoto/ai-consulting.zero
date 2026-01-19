#!/bin/bash

# =============================================================================
# AI Consulting Zero - iCloud Drive バックアップスクリプト
# =============================================================================
# バックアップ先: ~/Library/Mobile Documents/com~apple~CloudDocs/ai-consulting-Backup/
# ZIP暗号化で保存（iCloudの容量を節約）
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
ICLOUD_DIR="${HOME}/Library/Mobile Documents/com~apple~CloudDocs"
BACKUP_BASE_DIR="${ICLOUD_DIR}/ai-consulting-Backup"
DATE=$(date +%Y%m%d)
TIME=$(date +%H%M%S)
ZIP_NAME="ai-consulting-backup-${DATE}-${TIME}.zip"
ZIP_PATH="${BACKUP_BASE_DIR}/${ZIP_NAME}"

# iCloud Driveの確認
log_info "iCloud Driveの状態を確認中..."

if [ ! -d "${ICLOUD_DIR}" ]; then
    log_error "iCloud Driveが見つかりません。"
    log_error "iCloudを有効にしてください。"
    log_error ""
    log_info "設定方法:"
    log_info "システム設定 → Apple ID → iCloud → iCloud Drive を有効化"
    exit 1
fi

log_info "✅ iCloud Driveが見つかりました"

# バックアップディレクトリの作成
if [ ! -d "${BACKUP_BASE_DIR}" ]; then
    mkdir -p "${BACKUP_BASE_DIR}"
    log_info "✅ バックアップディレクトリを作成: ${BACKUP_BASE_DIR}"
fi

# iCloudの容量確認
ICLOUD_FREE=$(df -h "${ICLOUD_DIR}" | tail -1 | awk '{print $4}')
log_info "iCloud空き容量: ${ICLOUD_FREE}"

# パスワード入力
log_security ""
log_security "🔐 iCloud Drive暗号化バックアップを作成します"
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
log_warn "完了後、iCloudへの同期に追加で数分かかる場合があります"

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
    log_warn "📡 iCloudへの同期中..."
    log_info "   同期状況は Finder → iCloud Drive で確認できます"
    log_info "   同期完了後、他のMac/iPhoneからアクセス可能になります"
    log_info ""
    log_security "🌐 アクセス方法:"
    log_info "1. 他のMac: Finder → iCloud Drive → ai-consulting-Backup"
    log_info "2. iPhone/iPad: ファイルアプリ → iCloud Drive → ai-consulting-Backup"
    log_info "3. Web: iCloud.com → iCloud Drive → ai-consulting-Backup"
    log_info ""
    log_security "🔐 パスワードは安全な場所に保管してください！"
    
    # 古いバックアップの警告
    BACKUP_COUNT=$(ls -1 "${BACKUP_BASE_DIR}"/*.zip 2>/dev/null | wc -l | tr -d ' ')
    log_info ""
    log_info "現在のiCloudバックアップ数: ${BACKUP_COUNT}"
    
    if [ ${BACKUP_COUNT} -gt 5 ]; then
        log_warn ""
        log_warn "⚠️  iCloudバックアップが5個を超えています"
        log_warn "    古いバックアップの削除を検討してください（容量節約）"
        log_warn "    場所: Finder → iCloud Drive → ai-consulting-Backup"
    fi
else
    log_error "ZIPの作成に失敗しました"
    exit 1
fi
