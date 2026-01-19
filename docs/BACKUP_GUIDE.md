# AI Consulting Zero - バックアップガイド

## 📋 目次

1. [バックアップ方法の種類](#バックアップ方法の種類)
2. [自動バックアップの設定](#自動バックアップの設定)
3. [手動バックアップ](#手動バックアップ)
4. [復元方法](#復元方法)
5. [トラブルシューティング](#トラブルシューティング)

---

## 🗂️ バックアップ方法の種類

### **1. 通常バックアップ（自動実行推奨）**

- **ファイル:** `scripts/backup-to-mypassport.sh`
- **暗号化:** なし
- **速度:** 超高速（約1分）
- **用途:** 毎日の自動バックアップ
- **注意:** `.env.local`は除外（機密情報保護）

### **2. ZIP暗号化バックアップ**

- **ファイル:** `scripts/backup-to-mypassport-zip.sh`
- **暗号化:** AES-256相当
- **速度:** 高速（約1-2分）
- **用途:** 週次の手動バックアップ

### **3. 暗号化ディスクイメージ（.dmg）**

- **ファイル:** `scripts/backup-to-mypassport-encrypted.sh`
- **暗号化:** AES-256（macOS標準、最高レベル）
- **速度:** 普通（約5-10分）
- **用途:** 重要なマイルストーン時のバックアップ

---

## ⚙️ 自動バックアップの設定

### **設定手順**

#### **1. 自動バックアップを設定**

```bash
cd /Users/eiichi/Documents/ai-consulting-zero
./scripts/setup-auto-backup.sh
```

#### **2. 設定内容**

- **実行時刻:** 毎日 午前2:00
- **バックアップ先:** `/Volumes/My Passport/ai-consulting-Backup/`
- **ログ:** `logs/backup.log`

#### **3. 必要な準備**

- ✅ MyPassportを毎晩接続しておく
- ✅ Macをスリープさせない（または電源アダプタ接続中はスリープさせない設定）

---

### **自動バックアップの管理**

#### **ログを確認**

```bash
# リアルタイムでログを確認
tail -f logs/backup.log

# 最新のバックアップ結果を確認
tail -20 logs/backup.log
```

#### **自動バックアップを停止**

```bash
launchctl unload ~/Library/LaunchAgents/com.ai-consulting-zero.daily-backup.plist
```

#### **自動バックアップを再開**

```bash
launchctl load ~/Library/LaunchAgents/com.ai-consulting-zero.daily-backup.plist
```

#### **設定を削除**

```bash
launchctl unload ~/Library/LaunchAgents/com.ai-consulting-zero.daily-backup.plist
rm ~/Library/LaunchAgents/com.ai-consulting-zero.daily-backup.plist
```

---

## 🔧 手動バックアップ

### **1. 通常バックアップ（暗号化なし）**

```bash
./scripts/backup-to-mypassport.sh
```

**所要時間:** 約1分

---

### **2. ZIP暗号化バックアップ（推奨）**

```bash
./scripts/backup-to-mypassport-zip.sh
```

**手順:**
1. パスワードを入力
2. 1-2分待つ
3. 完了！

**保存先:**
```
/Volumes/My Passport/ai-consulting-Backup/ai-consulting-backup-YYYYMMDD-HHMMSS.zip
```

---

### **3. 暗号化ディスクイメージ（最高セキュリティ）**

```bash
./scripts/backup-to-mypassport-encrypted.sh
```

**手順:**
1. パスワードを入力（2回）
2. 5-10分待つ（**絶対にキャンセルしない**）
3. 完了！

**保存先:**
```
/Volumes/My Passport/ai-consulting-Backup/ai-consulting-backup-YYYYMMDD-HHMMSS.dmg
```

---

## 🔓 復元方法

### **通常バックアップから復元**

```bash
# バックアップフォルダから直接コピー
cp -r "/Volumes/My Passport/ai-consulting-Backup/YYYYMMDD/" ~/Documents/ai-consulting-zero-restored/
```

---

### **ZIP暗号化バックアップから復元**

1. ZIPファイルをダブルクリック
2. パスワードを入力
3. 解凍されたフォルダをコピー

---

### **暗号化ディスクイメージ（.dmg）から復元**

1. `.dmg`ファイルをダブルクリック
2. パスワードを入力
3. マウントされたボリュームからファイルをコピー
4. 完了後、ボリュームを取り出す

---

## 📅 推奨バックアップスケジュール

| 頻度 | 方法 | 実行方法 |
|------|------|---------|
| **毎日** | 通常バックアップ | 自動（午前2時） |
| **毎週** | ZIP暗号化 | 手動（金曜日夜） |
| **重要時** | .dmg暗号化 | 手動（大きな変更前） |

---

## 🛠️ トラブルシューティング

### **Q1: 自動バックアップが実行されない**

**確認事項:**
1. MyPassportが接続されているか？
2. Macがスリープしていないか？
3. ログを確認: `tail -f logs/backup.log`

**解決方法:**
```bash
# launchdの状態を確認
launchctl list | grep ai-consulting-zero

# 手動で実行してみる
./scripts/backup-to-mypassport.sh
```

---

### **Q2: パスワードを忘れた**

**暗号化バックアップのパスワードを忘れた場合:**
- ❌ 復元不可能
- ✅ 最新の通常バックアップから復元

**対策:**
- パスワードマネージャーに保存
- 紙に書いて金庫に保管

---

### **Q3: MyPassportの容量が不足**

**確認:**
```bash
df -h "/Volumes/My Passport"
```

**対策:**
```bash
# 古いバックアップを削除
rm -rf "/Volumes/My Passport/ai-consulting-Backup/YYYYMMDD"
```

---

### **Q4: バックアップが途中で止まる**

**原因:**
- MyPassportの接続が切れた
- Macがスリープした
- ディスク容量不足

**解決方法:**
1. MyPassportを再接続
2. 再実行

---

## 🔐 セキュリティ推奨事項

1. **パスワードは強力なものを**
   - 最低12文字以上
   - 大文字・小文字・数字・記号を含む

2. **MyPassportの物理的保護**
   - 盗難・紛失に注意
   - 自宅の安全な場所に保管

3. **定期的なバックアップ検証**
   - 月1回、復元テストを実施

---

## 📊 バックアップ履歴の管理

### **バックアップ一覧を確認**

```bash
ls -lht "/Volumes/My Passport/ai-consulting-Backup/" | head -20
```

### **古いバックアップの削除（10個以上ある場合）**

```bash
# 30日以上前のバックアップを削除
find "/Volumes/My Passport/ai-consulting-Backup/" -type d -mtime +30 -exec rm -rf {} \;
```

---

## 📞 サポート

問題が発生した場合は、以下を確認してください：
- ログファイル: `logs/backup.log`
- エラーログ: `logs/backup-error.log`

---

**最終更新:** 2026-01-19
