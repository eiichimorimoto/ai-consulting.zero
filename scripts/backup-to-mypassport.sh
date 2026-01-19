#!/bin/bash

# =============================================================================
# AI Consulting Zero - MyPassport バックアップスクリプト
# =============================================================================
# バックアップ先: /Volumes/My Passport/ai-consulting-Backup/
# 実行方法: bash scripts/backup-to-mypassport.sh
# =============================================================================

set -e  # エラー時に停止

# 色付きログ
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# =============================================================================
# 1. 設定
# =============================================================================

PROJECT_NAME="ai-consulting-zero"
PROJECT_DIR="/Users/eiichi/Documents/${PROJECT_NAME}"
MYPASSPORT_MOUNT="/Volumes/My Passport"
BACKUP_BASE_DIR="${MYPASSPORT_MOUNT}/ai-consulting-Backup"
DATE=$(date +%Y%m%d)
TIME=$(date +%H%M%S)
BACKUP_DIR="${BACKUP_BASE_DIR}/${DATE}"

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
# 3. バックアップディレクトリの作成
# =============================================================================

log_info "バックアップディレクトリを作成中..."

if [ ! -d "${BACKUP_BASE_DIR}" ]; then
    mkdir -p "${BACKUP_BASE_DIR}"
    log_info "✅ ベースディレクトリを作成: ${BACKUP_BASE_DIR}"
fi

if [ ! -d "${BACKUP_DIR}" ]; then
    mkdir -p "${BACKUP_DIR}"
    log_info "✅ 日付ディレクトリを作成: ${BACKUP_DIR}"
else
    log_warn "既に今日のバックアップディレクトリが存在します。"
    log_warn "時刻を追加してバックアップします: ${TIME}"
    BACKUP_DIR="${BACKUP_DIR}_${TIME}"
    mkdir -p "${BACKUP_DIR}"
fi

# =============================================================================
# 4. バックアップ実行
# =============================================================================

log_info "バックアップを開始します..."
log_info "プロジェクト: ${PROJECT_DIR}"
log_info "バックアップ先: ${BACKUP_DIR}"
log_info ""
log_info "📌 機密情報の扱い:"
log_info "   - .env.local は除外（セキュリティ保護）"
log_info "   - .vercel/ は含まれる（デプロイ設定）"
log_info ""

# rsyncでバックアップ（除外ファイル指定）
# 注意: .env.local は除外（暗号化バックアップで保存）
rsync -av --progress \
    --exclude 'node_modules/' \
    --exclude '.next/' \
    --exclude '.turbo/' \
    --exclude 'dist/' \
    --exclude 'build/' \
    --exclude 'out/' \
    --exclude '.git/' \
    --exclude '.DS_Store' \
    --exclude '*.log' \
    --exclude '.env.local' \
    --exclude '.env*.local' \
    --exclude 'coverage/' \
    --exclude '*.tsbuildinfo' \
    --exclude '.cache/' \
    "${PROJECT_DIR}/" "${BACKUP_DIR}/"

# =============================================================================
# 5. バックアップ検証
# =============================================================================

log_info "バックアップを検証中..."

if [ -d "${BACKUP_DIR}" ] && [ "$(ls -A ${BACKUP_DIR})" ]; then
    BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
    log_info "✅ バックアップ完了！"
    log_info "📁 バックアップ先: ${BACKUP_DIR}"
    log_info "📊 サイズ: ${BACKUP_SIZE}"
    
    # バックアップ内容の確認
    log_info ""
    log_info "バックアップ内容:"
    ls -lh "${BACKUP_DIR}" | head -20
    
    # ディスクの空き容量確認
    log_info ""
    log_info "MyPassportの空き容量:"
    df -h "${MYPASSPORT_MOUNT}" | tail -1
else
    log_error "バックアップに失敗しました。"
    exit 1
fi

# =============================================================================
# 6. 古いバックアップの削除（オプション）
# =============================================================================

log_info ""
log_warn "古いバックアップの管理:"
BACKUP_COUNT=$(ls -1 "${BACKUP_BASE_DIR}" | wc -l | tr -d ' ')
log_info "現在のバックアップ数: ${BACKUP_COUNT}"

if [ ${BACKUP_COUNT} -gt 10 ]; then
    log_warn "バックアップが10個を超えています。"
    log_warn "古いバックアップを手動で削除することをお勧めします。"
    log_warn "場所: ${BACKUP_BASE_DIR}"
fi

# =============================================================================
# 7. 完了
# =============================================================================

log_info ""
log_info "=========================================="
log_info "✅ バックアップが正常に完了しました！"
log_info "=========================================="
log_info "日時: $(date)"
log_info "バックアップ先: ${BACKUP_DIR}"
log_info ""
