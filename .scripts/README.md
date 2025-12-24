# 安定版管理スクリプト

動作確認済みの処理を固定化し、問題発生時に即座に戻せるようにするためのスクリプト集です。

## 📋 スクリプト一覧

### 1. `tag-stable.sh` - 安定版タグ作成

動作確認済みの状態にタグをつけます。

```bash
./.scripts/tag-stable.sh
```

**使い方:**
1. 全機能が正常動作することを確認
2. スクリプトを実行
3. タグタイプを選択（stable / stable-ocr / stable-auth / カスタム）
4. タグメッセージを入力（空欄可）
5. リモートにプッシュするか選択

**例:**
```bash
# OCR機能が正常動作した場合
./.scripts/tag-stable.sh
# → タグタイプ: 2 (stable-ocr)
# → タグ名: stable-ocr-20241223
```

### 2. `restore-ocr-stable.sh` - OCR機能を安定版に戻す

OCR機能を最新の安定版タグに戻します。

```bash
./.scripts/restore-ocr-stable.sh
```

**使い方:**
1. スクリプトを実行
2. 最新の安定版タグが表示される
3. 確認して実行
4. 変更をコミット・プッシュするか選択

**例:**
```bash
# OCR機能が壊れた場合
./.scripts/restore-ocr-stable.sh
# → 最新の安定版: stable-ocr-20241223
# → app/api/ocr-business-card/route.ts を戻す
```

## 🎯 運用フロー

### 日常的な運用

#### 1. 機能追加時

```bash
# 1. 最新の安定版タグを確認
git tag | grep stable | sort -V | tail -1

# 2. 新機能ブランチを作成
git checkout -b feature/xxx stable-20241223

# 3. 機能を実装
# ... コード変更 ...

# 4. 動作確認（新機能 + 既存機能）
npm run build
npm run dev

# 5. 問題なければマージ
git checkout main
git merge feature/xxx

# 6. 再度全機能をテスト
npm run dev

# 7. 新しい安定版タグ
./.scripts/tag-stable.sh
```

#### 2. 問題発生時

```bash
# OCR機能が壊れた場合
./.scripts/restore-ocr-stable.sh

# または、手動で戻す場合
git restore --source=stable-ocr-20241223 -- app/api/ocr-business-card/route.ts
```

### タグの確認

```bash
# 全ての安定版タグを確認
git tag | grep stable | sort -V

# 最新の安定版を確認
git tag | grep stable | sort -V | tail -1

# 特定のタグの詳細を確認
git show stable-ocr-20241223
```

### タグに戻す

```bash
# 特定のファイルだけ戻す
git restore --source=stable-ocr-20241223 -- app/api/ocr-business-card/route.ts

# 全体を戻す（注意！）
git checkout stable-20241223
```

## 📝 タグ命名規則

| タグ名 | 用途 | 例 |
|--------|------|-----|
| `stable-YYYYMMDD` | 全機能動作確認済み | `stable-20241223` |
| `stable-ocr-YYYYMMDD` | OCR機能のみ動作確認済み | `stable-ocr-20241223` |
| `stable-auth-YYYYMMDD` | 認証機能のみ動作確認済み | `stable-auth-20241223` |
| `working-YYYYMMDD-HHMM` | 一時的な動作確認ポイント | `working-20241223-1430` |

## ⚠️ 注意事項

1. **タグは削除しない**
   - 過去の安定版に戻るために必要
   - 削除する場合は慎重に

2. **リモートにプッシュする**
   - ローカルのみでは他のマシンで使えない
   - `git push origin --tags` でプッシュ

3. **動作確認は必ず全機能**
   - 新機能だけではなく、既存機能も必ずテスト

4. **問題発生時は即座にロールバック**
   - 原因調査より先に安定版に戻す
   - 安定版に戻してから原因を調査

## 🔗 関連ドキュメント

- `.cursorrules` - 開発ルール（固定化戦略の詳細）
- `docs/troubleshooting/` - トラブルシューティング


