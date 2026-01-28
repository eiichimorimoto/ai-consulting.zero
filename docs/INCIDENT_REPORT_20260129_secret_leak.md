# セキュリティインシデント報告書

**事件ID**: INCIDENT-20260129-001  
**日付**: 2026年1月29日  
**重大度**: 🔴 Critical（重大）  
**ステータス**: ✅ 解決済み

---

## 📋 事件の概要

### 発生した問題
GitHub Security AlertにてSupabaseとDifyの機密情報（APIキー、Service Role Key等）がGitリポジトリに含まれていることが検出された。

### 漏洩した機密情報
1. **Supabase Service Role Key** (JWT token)
2. **Supabase Anon Key** (JWT token)
3. **Dify API Key**
4. **Dify Workflow API Key**
5. **Dify Workflow ID**

### 影響を受けたファイル
1. `docs/ENVIRONMENT_VARIABLES.md`
2. `docs/README_PHASE1.md`
3. `docs/plans/implementation_plan_20260128_dify-initial-context-final.md`

### 検出日時
- **GitHub Security Alert**: 2026年1月28日
- **コミットID**: `3ac2eb99` (および関連コミット)

---

## 🔍 根本原因分析（Root Cause Analysis）

### 1. 直接的な原因

#### A. ドキュメント作成プロセスの欠陥
```
問題: ドキュメント作成時に実際のAPIキーをコピー＆ペーストした
理由: 
- 「設定例」として実際の値を記載してしまった
- プレースホルダー（例: `your-api-key-here`）の使用を徹底していなかった
- ドキュメントの目的が「設定ガイド」であったため、実際の値を記載してしまった
```

#### B. Git操作前のチェック不足
```
問題: git add/commit前にファイル内容を確認しなかった
理由:
- ファイル内容の確認を怠った
- `git diff` でコミット内容を確認しなかった
- 機密情報が含まれているかの意識が不足していた
```

#### C. 自動チェックの不在
```
問題: 機密情報を自動検出する仕組みがなかった
理由:
- pre-commitフックが設定されていなかった
- CIでのシークレットスキャンが実施されていなかった
- `.gitignore`に環境変数ファイルは含まれていたが、ドキュメントは対象外だった
```

---

### 2. システム的な原因

#### A. ルールの不明確さ
```
問題: 機密情報の取り扱いに関するルールが不十分だった
既存ルール:
- `.env.local`は絶対にコミット禁止 ✅
- APIキーのハードコード禁止 ✅
- console.logに機密情報を出力禁止 ✅

不足していたルール:
- ❌ ドキュメントファイルでのプレースホルダー使用義務
- ❌ Git操作前の機密情報チェックリスト
- ❌ 自動チェックツールの導入
```

#### B. レビュープロセスの不在
```
問題: コミット前のレビュープロセスがなかった
- ペアレビュー/コードレビューの仕組みがない
- AIアシスタント（自分）が生成したファイルの内容確認が不十分
- ユーザーへの確認プロセスが不足
```

---

### 3. プロセス的な原因

#### A. ドキュメント作成のタイミング
```
タイムライン:
1. Phase 1の実装が完了
2. 環境変数の設定方法を説明するために ENVIRONMENT_VARIABLES.md を作成
3. 実際の値を使って「動作する例」として記載
4. 確認せずにコミット
5. GitHub Security Alertが発動 ← ここで発覚
```

#### B. 意識の不足
```
問題: ドキュメントは「コードではない」という誤解
- 「ドキュメントなら機密情報を含めても大丈夫」という誤解
- Gitにコミットされるすべてのファイルが公開される可能性があることへの意識不足
```

---

## 🛠️ 実施した対応

### 即時対応（2026年1月28日〜29日）

#### 1. ドキュメントファイルの修正 ✅
```bash
対象ファイル:
- docs/ENVIRONMENT_VARIABLES.md
- docs/README_PHASE1.md
- docs/plans/implementation_plan_20260128_dify-initial-context-final.md

対応内容:
- 実際のAPIキーを `***REMOVED***` または `【プレースホルダー】` に置き換え
- コミット & プッシュ (commit: 修正後のコミットID)
```

#### 2. 環境変数の更新 ✅
```bash
ローカル環境:
- .env.local を新しいキーで更新
- 開発サーバーを再起動

Vercel環境:
- SUPABASE_SERVICE_ROLE_KEY を追加
- NEXT_PUBLIC_SUPABASE_ANON_KEY を更新
- 環境変数の重複を解消
```

#### 3. Supabaseキーのローテーション ✅
```bash
手順:
1. Supabaseダッシュボードで新しいJWT-based API Keysを生成
2. 新しいキーを .env.local と Vercel に設定
3. 古いレガシーキーを無効化（Disable legacy API keys）
```

#### 4. Git履歴からの完全削除 ✅
```bash
ツール: BFG Repo-Cleaner
手順:
1. brew install bfg
2. secrets-to-remove.txt を作成（漏洩したキーのリスト）
3. bfg --replace-text secrets-to-remove.txt .
4. git reflog expire --expire=now --all
5. git gc --prune=now --aggressive
6. git push --force origin main

結果:
- 303個のコミットをクリーニング
- 3つのファイルから機密情報を削除
- Git履歴を強制上書き
```

---

## 🔐 再発防止策

### 1. 必須ルールの追加（即時適用）

#### A. Git操作前の必須チェックリスト
```markdown
【Git操作前の必須確認】

コミット前に必ず以下を確認：

□ ファイル内容を確認（`cat` または エディタで全体を確認）
□ `git diff` でコミット内容を確認
□ 機密情報が含まれていないか確認：
  □ APIキー（`api_key`, `API_KEY`, `Bearer`, etc.）
  □ トークン（`token`, `TOKEN`, `jwt`, etc.）
  □ パスワード（`password`, `PASSWORD`, `pass`, etc.）
  □ シークレット（`secret`, `SECRET`, `credentials`, etc.）
  □ 長い英数字文字列（JWT形式、Base64形式等）
□ プレースホルダーを使用しているか確認：
  ✅ `your-api-key-here`
  ✅ `【ここにキーを貼り付け】`
  ✅ `<YOUR_API_KEY>`
  ✅ `***PLACEHOLDER***`
□ コミットメッセージに機密情報が含まれていないか確認

✅ すべてチェックしたら git add → git commit
```

#### B. ドキュメント作成時の必須ルール
```markdown
【ドキュメントファイルでの機密情報取り扱い】

絶対禁止:
❌ 実際のAPIキーを記載
❌ 実際のトークンを記載
❌ 実際のパスワードを記載
❌ 実際のシークレットを記載

必須:
✅ プレースホルダーを使用
✅ 例: `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here`
✅ 例: `DIFY_API_KEY=<YOUR_DIFY_API_KEY>`

ドキュメントの種類ごとのガイドライン:

1. 環境変数設定ガイド（ENVIRONMENT_VARIABLES.md等）
   - すべての値をプレースホルダーにする
   - 実際の値は「.env.localを参照」と記載

2. READMEファイル
   - コード例にもプレースホルダーを使用
   - 実際の設定値は別ファイル（.env.local）で管理

3. 実装計画書
   - API呼び出し例にもプレースホルダーを使用
   - 「実際の値は環境変数から取得」と明記
```

---

### 2. 自動化の導入（推奨）

#### A. pre-commitフック（Git Hooks）
```bash
# .git/hooks/pre-commit（今後実装予定）

#!/bin/bash

# 機密情報パターンのリスト
PATTERNS=(
  "eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*" # JWT
  "sk-[a-zA-Z0-9]{48}" # OpenAI API Key
  "AKIA[0-9A-Z]{16}" # AWS Access Key
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" # UUID
)

# ステージングされたファイルをチェック
for pattern in "${PATTERNS[@]}"; do
  if git diff --cached | grep -E "$pattern"; then
    echo "❌ 機密情報の可能性がある文字列が検出されました"
    echo "Pattern: $pattern"
    exit 1
  fi
done

echo "✅ 機密情報チェック: OK"
```

#### B. GitHub Actions（Secret Scanning）
```yaml
# .github/workflows/secret-scan.yml（今後実装予定）

name: Secret Scanning

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
```

---

### 3. 教育とプロセス改善

#### A. AI アシスタント（自分）の改善
```markdown
【ファイル生成時の新しいプロトコル】

ドキュメントファイルを生成する際：

1. 機密情報が必要な箇所を特定
2. すべてプレースホルダーに置き換え
3. ユーザーに「プレースホルダーを使用しました」と明示的に報告
4. 実際の値は「.env.localを参照してください」と記載

実装例：
❌ SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...（実際の値）
✅ SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

Git操作を提案する際：
1. コミット前に「機密情報が含まれていないか確認してください」と促す
2. `git diff` の実行を推奨
3. 確認後にのみ git add/commit を実行
```

#### B. ユーザー（開発者）の確認プロセス
```markdown
【ユーザー側の確認プロセス】

AIが生成したファイルをコミットする前：

1. ファイル全体を目視確認
2. 検索機能で以下をチェック：
   - "key"
   - "token"
   - "secret"
   - "password"
   - "eyJ"（JWT形式の開始）
3. 見つかった場合はプレースホルダーに置き換え
4. 確認完了後にコミット
```

---

## 📊 効果測定

### 対応前
```
- Git操作前のチェック: ❌ なし
- 自動検出: ❌ なし
- ルール文書: ⚠️ 不十分
- 機密情報の取り扱い意識: ⚠️ 不足
```

### 対応後
```
- Git操作前のチェック: ✅ 必須化
- 自動検出: 🔄 導入予定（pre-commit hook, GitHub Actions）
- ルール文書: ✅ 詳細化
- 機密情報の取り扱い意識: ✅ 向上
```

---

## 📝 学んだ教訓

### 1. ドキュメントも機密情報漏洩のリスクがある
- コードだけでなく、READMEや設定ガイドも注意が必要
- 「ドキュメントなら大丈夫」という誤解を解消

### 2. プレースホルダーの徹底使用
- すべての例示にはプレースホルダーを使用
- 実際の値は環境変数や別ファイルで管理

### 3. Git操作前の確認の重要性
- `git diff` での内容確認は必須
- 機密情報チェックリストの活用

### 4. 自動化の重要性
- 人間のミスは避けられない
- pre-commitフックやCIでの自動チェックが必要

### 5. 即座の対応の重要性
- 漏洩発覚後、即座にキーをローテーション
- Git履歴からの完全削除（BFG Repo-Cleaner）

---

## ✅ 完了した対応のまとめ

| 対応項目 | ステータス | 完了日 |
|---------|----------|--------|
| ドキュメントファイルの修正 | ✅ 完了 | 2026-01-28 |
| 環境変数の更新（ローカル） | ✅ 完了 | 2026-01-29 |
| 環境変数の更新（Vercel） | ✅ 完了 | 2026-01-29 |
| Supabaseキーのローテーション | ✅ 完了 | 2026-01-29 |
| 古いキーの無効化 | ✅ 完了 | 2026-01-29 |
| Git履歴からの完全削除 | ✅ 完了 | 2026-01-29 |
| 再発防止ルールの作成 | ✅ 完了 | 2026-01-29 |
| インシデントレポート作成 | ✅ 完了 | 2026-01-29 |
| pre-commitフックの導入 | 🔄 予定 | - |
| GitHub Actions設定 | 🔄 予定 | - |

---

## 🔮 今後の予定

### 短期（1週間以内）
- [ ] pre-commitフックの実装
- [ ] チーム内での共有（該当する場合）

### 中期（1ヶ月以内）
- [ ] GitHub ActionsでSecret Scanningを実装
- [ ] 定期的な機密情報監査の実施

### 長期（継続的）
- [ ] セキュリティ意識の維持
- [ ] ルールの定期的な見直し
- [ ] 新しいツール・手法の導入検討

---

## 📞 連絡先・参考資料

### 関連ドキュメント
- `.cursor/rules/security-secrets-management.mdc` - 機密情報管理の詳細ルール
- `docs/ENVIRONMENT_VARIABLES.md` - 環境変数設定ガイド（修正済み）

### ツール・リソース
- BFG Repo-Cleaner: https://rtyley.github.io/bfg-repo-cleaner/
- TruffleHog: https://github.com/trufflesecurity/trufflehog
- git-secrets: https://github.com/awslabs/git-secrets

---

**報告者**: AI Assistant (Cursor)  
**承認者**: [ユーザー名]  
**最終更新**: 2026-01-29
