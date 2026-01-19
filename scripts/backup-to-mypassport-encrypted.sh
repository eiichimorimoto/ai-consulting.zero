#!/bin/bash

# =============================================================================
# AI Consulting Zero - MyPassport 暗号化バックアップスクリプト
# =============================================================================
# バックアップを暗号化ディスクイメージ（.dmg）として保存
# パスワード保護 + AES-256暗号化
# =============================================================================

set -e  # エラー時に停止

# 色付きログ
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# =============================================================================
# 1. 設定
# =============================================================================

PROJECT_NAME="ai-consulting-zero"
PROJECT_DIR="/Users/eiichi/Documents/${PROJECT_NAME}"
MYPASSPORT_MOUNT="/Volumes/My Passport"
BACKUP_BASE_DIR="${MYPASSPORT_MOUNT}/ai-consulting-Backup"
DATE=$(date +%Y%m%d)
TIME=$(date +%H%M%S)
TEMP_BACKUP_DIR="/tmp/ai-consulting-backup-${DATE}-${TIME}"
DMG_NAME="ai-consulting-backup-${DATE}-${TIME}.dmg"
DMG_PATH="${BACKUP_BASE_DIR}/${DMG_NAME}"

# =============================================================================
# 2. MyPassportのマウント確認
# =============================================================================

log_info "MyPassportのマウント状態を確認中..."

if [ ! -d "${MYPASSPORT_MOUNT}" ]; then
    log_error "MyPassportがマウントされていません。"
    log_error "マウントポイント: ${MYPASSPORT_MOUNT}"
    log_error "デバイスを接続して再度実行してください。"
    exit 1
fi

log_info "✅ MyPassportが見つかりました: ${MYPASSPORT_MOUNT}"

# =============================================================================
# 3. バックアップベースディレクトリの作成
# =============================================================================

log_info "バックアップディレクトリを確認中..."

if [ ! -d "${BACKUP_BASE_DIR}" ]; then
    mkdir -p "${BACKUP_BASE_DIR}"
    log_info "✅ ベースディレクトリを作成: ${BACKUP_BASE_DIR}"
fi

# =============================================================================
# 4. 一時バックアップディレクトリの作成
# =============================================================================

log_info "一時バックアップディレクトリを作成中..."
mkdir -p "${TEMP_BACKUP_DIR}"
log_info "✅ 一時ディレクトリ: ${TEMP_BACKUP_DIR}"

# =============================================================================
# 5. バックアップ実行
# =============================================================================

log_info "バックアップを開始します..."
log_info "プロジェクト: ${PROJECT_DIR}"
log_info "一時保存先: ${TEMP_BACKUP_DIR}"

# rsyncでバックアップ（除外ファイル指定）
rsync -a --progress \
    --exclude 'node_modules/' \
    --exclude '.next/' \
    --exclude '.turbo/' \
    --exclude 'dist/' \
    --exclude 'build/' \
    --exclude 'out/' \
    --exclude '.git/' \
    --exclude '.DS_Store' \
    --exclude '*.log' \
    --exclude 'coverage/' \
    --exclude '*.tsbuildinfo' \
    --exclude '.cache/' \
    "${PROJECT_DIR}/" "${TEMP_BACKUP_DIR}/"

BACKUP_SIZE=$(du -sh "${TEMP_BACKUP_DIR}" | cut -f1)
log_info "✅ バックアップ完了: ${BACKUP_SIZE}"

# =============================================================================
# 6. パスワードの設定
# =============================================================================

log_security ""
log_security "🔐 暗号化ディスクイメージを作成します"
log_security ""
log_warn "⚠️  重要: このパスワードは忘れないでください！"
log_warn "    パスワードを忘れるとバックアップを開けなくなります"
log_security ""

# パスワード入力（表示なし）
read -s -p "$(echo -e ${BLUE}[SECURITY]${NC} パスワードを入力してください: )" PASSWORD
echo ""
read -s -p "$(echo -e ${BLUE}[SECURITY]${NC} パスワードを再入力してください: )" PASSWORD_CONFIRM
echo ""

if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
    log_error "パスワードが一致しません。"
    rm -rf "${TEMP_BACKUP_DIR}"
    exit 1
fi

if [ -z "$PASSWORD" ]; then
    log_error "パスワードが空です。"
    rm -rf "${TEMP_BACKUP_DIR}"
    exit 1
fi

log_security "✅ パスワードを設定しました"

# =============================================================================
# 7. 暗号化ディスクイメージの作成
# =============================================================================

log_info ""
log_info "暗号化ディスクイメージを作成中..."
log_info "ファイル名: ${DMG_NAME}"
log_warn "この処理には数分かかる場合があります..."

# ディスクイメージのサイズを計算（バックアップサイズ + 50MB余裕）
BACKUP_SIZE_MB=$(du -sm "${TEMP_BACKUP_DIR}" | cut -f1)
DMG_SIZE_MB=$((BACKUP_SIZE_MB + 50))

# 暗号化ディスクイメージを作成（AES-256）
hdiutil create \
    -size ${DMG_SIZE_MB}m \
    -fs HFS+ \
    -volname "AI Consulting Backup ${DATE}" \
    -encryption AES-256 \
    -stdinpass \
    -srcfolder "${TEMP_BACKUP_DIR}" \
    "${DMG_PATH}" <<< "$PASSWORD"

if [ $? -eq 0 ]; then
    log_info "✅ 暗号化ディスクイメージを作成しました"
    log_info "📁 保存先: ${DMG_PATH}"
    
    DMG_FILE_SIZE=$(du -sh "${DMG_PATH}" | cut -f1)
    log_info "📊 ファイルサイズ: ${DMG_FILE_SIZE}"
else
    log_error "ディスクイメージの作成に失敗しました"
    rm -rf "${TEMP_BACKUP_DIR}"
    exit 1
fi

# =============================================================================
# 8. 一時ファイルの削除
# =============================================================================

log_info "一時ファイルを削除中..."
rm -rf "${TEMP_BACKUP_DIR}"
log_info "✅ 一時ファイルを削除しました"

# =============================================================================
# 9. バックアップ情報の表示
# =============================================================================

log_info ""
log_info "=========================================="
log_security "✅ 暗号化バックアップが完了しました！"
log_info "=========================================="
log_info "日時: $(date)"
log_info "ファイル: ${DMG_NAME}"
log_info "場所: ${BACKUP_BASE_DIR}/"
log_info "サイズ: ${DMG_FILE_SIZE}"
log_security "暗号化: AES-256"
log_info ""
log_security "📌 使い方:"
log_info "1. ${DMG_NAME} をダブルクリック"
log_info "2. パスワードを入力"
log_info "3. マウントされたボリュームからファイルを復元"
log_info ""

# =============================================================================
# 10. 古いバックアップの管理
# =============================================================================

log_info "バックアップファイル一覧:"
ls -lh "${BACKUP_BASE_DIR}" | grep ".dmg" | tail -10

BACKUP_COUNT=$(ls -1 "${BACKUP_BASE_DIR}"/*.dmg 2>/dev/null | wc -l | tr -d ' ')
log_info "現在のバックアップ数: ${BACKUP_COUNT}"

if [ ${BACKUP_COUNT} -gt 10 ]; then
    log_warn ""
    log_warn "⚠️  バックアップが10個を超えています"
    log_warn "    古いバックアップの削除を検討してください"
    log_warn "    場所: ${BACKUP_BASE_DIR}"
fi

# MyPassportの空き容量確認
log_info ""
log_info "MyPassportの空き容量:"
df -h "${MYPASSPORT_MOUNT}" | tail -1

log_info ""
log_security "🔐 パスワードは安全な場所に保管してください！"
