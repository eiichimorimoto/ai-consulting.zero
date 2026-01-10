# AI Consulting Zero - 開発ガイド（人間用）

> バージョン: 3.1 | 最終更新: 2025-01-10

---

## 📖 このドキュメントについて

このガイドは**あなた（開発者）**のための運用マニュアルです。
`.cursorrules`がAI制御用、このファイルが人間用です。

**対象者:**
- Cursor AIで開発する開発者
- Next.js 16 + Supabase + Vercelの環境
- 手戻りを減らしたい方

---

## 🚀 初回セットアップ（30分）

### ステップ1: ファイル配置確認（5分）

```bash
# 1. .cursorrules の確認
ls -la .cursorrules

# 2. このファイルの確認
ls -la docs/development-guide.md

# 3. ディレクトリ構造確認
tree -L 2 -I 'node_modules|.next'
```

**期待される構造:**
```
プロジェクトルート/
├── .cursorrules           # AI制御ルール
├── docs/
│   └── development-guide.md  # このファイル
├── app/
├── components/
├── lib/
├── middleware.ts
├── next.config.js
├── package.json
└── .env.local
```

---

### ステップ2: package.json スクリプト追加（5分）

`package.json`に以下を追加：

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:clean": "rm -rf .next && next dev",
    "dev:webpack": "next dev --webpack",
    "build": "next build",
    "build:webpack": "next build --webpack",
    "start": "next start",
    "clean": "rm -rf .next node_modules/.cache",
    "reset": "rm -rf .next node_modules && npm install && npm run dev"
  }
}
```

**各スクリプトの用途:**
| コマンド | 用途 | 使用タイミング |
|---------|------|--------------|
| `npm run dev` | 通常起動 | 毎回の開発開始 |
| `npm run dev:clean` | キャッシュクリア起動 | サーバー起動失敗時 |
| `npm run dev:webpack` | Webpack使用 | Turbopack問題時 |
| `npm run clean` | キャッシュ削除のみ | エラー多発時 |
| `npm run reset` | 完全リセット | 最終手段 |

---

### ステップ3: Git設定（5分）

#### 3-1: .gitignore 確認

以下が含まれているか確認：

```gitignore
# Next.js
.next/
out/

# 環境変数
.env*.local

# 依存関係
node_modules/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# ログ
npm-debug.log*
yarn-debug.log*
```

#### 3-2: コミット頻度の設定

**推奨: 5-10分ごと、または機能単位**

```bash
# 良い例
git add app/api/auth/login/route.ts
git commit -m "feat: ログインAPIにバリデーション追加"

# 悪い例
git add .
git commit -m "色々修正"
```

---

### ステップ4: Cursor AI 動作テスト（10分）

#### テスト1: スコープ制限の確認

**プロンプト:**
```
app/page.tsx のタイトル（<h1>タグ）を「テスト」に変更してください
```

**期待される動作:**
1. AIが「変更通知」を表示
2. page.tsx のみ変更提案
3. 他のファイルは触らない

**確認方法:**
```bash
git diff
# → app/page.tsx のみ差分があること
```

---

#### テスト2: 変更前確認の動作

**プロンプト:**
```
ログイン処理を修正してください
```

**期待される動作:**
1. AIが「どのファイルのどの部分ですか？」と質問
2. 推測で変更しない

---

#### テスト3: 禁止事項の遵守

**プロンプト:**
```
未使用の変数を削除してください
```

**期待される動作:**
1. AIが「明示的な指示がない限り削除しません」と返答
2. または「どのファイルのどの変数ですか？」と確認

---

### ステップ5: トラブルシューティング準備（5分）

#### 5-1: エイリアス設定（任意）

`.bashrc` または `.zshrc` に追加：

```bash
# Next.js 開発用エイリアス
alias ndev='npm run dev'
alias nclean='npm run dev:clean'
alias nreset='npm run reset'
alias nkill='pkill -f "next" && sleep 3'
alias nport='lsof -i :3000'

# Git用エイリアス
alias gs='git status'
alias gd='git diff'
alias gl='git log --oneline -10'
```

#### 5-2: よく使うコマンドをメモ

```bash
# プロセス確認
ps aux | grep "[n]ext"

# ポート確認
lsof -i :3000

# キャッシュサイズ確認
du -sh .next node_modules/.cache

# 安全な再起動
pkill -f "next" && sleep 10 && npm run dev
```

---

## 🔄 日常的な開発ワークフロー

### 開発開始時（毎回実行）

```bash
# 1. ブランチ確認
git branch

# 2. 最新の状態を確認
git status

# 3. 未コミットの変更があれば
git add .
git commit -m "chore: 前回作業の保存"

# 4. サーバー起動
npm run dev
```

---

### 機能開発時

#### フェーズ1: 計画（5分）

**チェックリスト:**
- [ ] 変更するファイルを特定
- [ ] 依存関係を確認
- [ ] 影響範囲を把握
- [ ] プロンプトを準備

**プロンプトテンプレート:**
```
【変更依頼】
ファイル: [ファイルパス]
箇所: [行番号 or 関数名]
内容: [具体的な変更内容]
理由: [変更理由]

【変更禁止】
- 他のファイル
- インポート文
- [その他禁止事項]

【確認事項】
変更前に差分を表示してください
```

---

#### フェーズ2: 実装（10-15分）

**手順:**
1. **プロンプト送信** - 上記テンプレート使用
2. **差分確認** - AIの提案内容を確認
3. **承認** - 問題なければ「実行してください」
4. **動作確認** - ブラウザで確認
5. **コミット** - 動作確認後すぐに

```bash
# コミット例
git add app/api/auth/login/route.ts
git commit -m "feat: ログインAPIにバリデーション追加"
```

---

#### フェーズ3: テスト（5分）

**確認項目:**
- [ ] 変更した機能が動作する
- [ ] 既存機能が壊れていない
- [ ] エラーがコンソールに出ていない
- [ ] TypeScriptエラーがない

```bash
# ビルド確認（重要な変更時）
npm run build

# 型チェック
npx tsc --noEmit
```

---

### 開発終了時（毎回実行）

```bash
# 1. 未コミットの確認
git status

# 2. 変更をコミット
git add .
git commit -m "chore: 今日の作業完了"

# 3. サーバー停止
# Ctrl+C で停止

# 4. プッシュ（任意）
git push origin main
```

---

## 📝 プロンプトテンプレート集

### 1. ファイル変更（基本）

```
【変更依頼】
ファイル: app/api/auth/login/route.ts
箇所: 20-25行目
内容: エラーハンドリングを追加（try-catch）
理由: 現在は500エラーしか返さないため

【変更禁止】
- 他のファイル
- インポート文
- 関数名

【確認事項】
変更前に差分を表示してください
```

---

### 2. 新規機能追加

```
【機能追加】
対象ファイル: app/api/users/route.ts（新規作成）
機能内容: ユーザー一覧取得API
- GETメソッド
- Supabase からユーザー取得
- ページネーション対応（limit, offset）

【制約】
- 既存のAPIルートの構造に従う
- lib/supabase.ts のクライアントを使用
- エラーハンドリング必須

【参考】
app/api/auth/login/route.ts と同じ構造で
```

---

### 3. バグ修正

```
【バグ修正】
ファイル: components/LoginForm.tsx
症状: ログインボタン押下後、エラーメッセージが表示されない
期待動作: エラー時に赤文字でメッセージ表示
エラーログ: なし（エラーは発生するがUIに反映されない）

【修正範囲】
- このファイルの handleSubmit 関数のみ
- 他のコンポーネントは触らない
```

---

### 4. UI変更

```
【UI変更】
対象: components/Header.tsx
変更内容: ロゴのサイズを大きくする
- 現在: w-32 h-8
- 変更後: w-48 h-12

【変更範囲】
- このコンポーネントファイルのみ
- スタイルは既存のTailwind Classを使用
- レスポンシブ対応を維持
```

---

### 5. サーバー起動トラブル

```
【サーバー起動エラー】
エラーメッセージ: 
ENOENT: no such file or directory, open '.next/dev/BUILD_ID'

試したこと: 
- Step 1（再起動）→ 失敗
- Step 2（.next削除）→ 実行前

次に試すべきStepを提案してください。
実行前に必ず確認を取ってください。
```

---

### 6. 複数段階の変更

```
【フェーズ1】
ファイル: app/api/auth/login/route.ts
内容: バリデーション追加のみ
- emailの形式チェック
- passwordの長さチェック

完了後、フェーズ2に進みます。

（フェーズ1完了後に続けて）

【フェーズ2】
ファイル: 同じファイル
内容: エラーハンドリング追加
- バリデーションエラー時は400を返す
- DB接続エラー時は500を返す

フェーズ1の変更は維持してください。
```

---

## 🚨 トラブルシューティング詳細版

### パターンA: サーバーが起動しない

#### 症状1: `ENOENT: no such file or directory, open '.next/dev/BUILD_ID'`

**原因:** .nextフォルダの破損

**解決手順:**
```bash
# Step 1: プロセス確認
ps aux | grep "[n]ext"
# → プロセスがあればkill

# Step 2: 完全停止
pkill -f "next"
sleep 10

# Step 3: .next削除
rm -rf .next

# Step 4: 再起動
npm run dev

# Step 5: 15秒待機後に確認
sleep 15
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
# → 200が返ればOK
```

---

#### 症状2: `Port 3000 is already in use`

**原因:** プロセスが残っている、またはゾンビ接続

**解決手順:**
```bash
# Step 1: ポート使用確認
lsof -i :3000

# Step 2: プロセスID確認
# 上記の出力から PID を確認

# Step 3: 強制終了
kill -9 [PID]

# Step 4: 10秒待機（重要）
sleep 10

# Step 5: 再確認
lsof -i :3000
# → 空であることを確認

# Step 6: 再起動
npm run dev
```

---

#### 症状3: `MODULE_NOT_FOUND`

**原因:** node_modules の不整合

**解決手順:**
```bash
# Step 1: プロセス停止
pkill -f "next"
sleep 10

# Step 2: キャッシュ削除
rm -rf .next node_modules/.cache

# Step 3: 再起動
npm run dev

# ↑で解決しない場合

# Step 4: 完全再インストール
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### パターンB: コードが壊れた

#### 症状: AIが勝手に複数ファイルを変更した

**即座にロールバック:**
```bash
# Step 1: 差分確認
git diff

# Step 2: 壊れたファイルを特定
# （git diff の出力を見る）

# Step 3: 全て戻す場合
git restore .

# Step 4: 特定ファイルのみ戻す場合
git restore app/api/auth/login/route.ts

# Step 5: サーバー再起動
pkill -f "next" && sleep 5 && npm run dev
```

**予防策:**
1. プロンプトを明確に
2. ファイルを明示
3. 変更前に差分確認

---

#### 症状: TypeScriptエラーが大量発生

**原因:** インポート文の破損、型定義の変更

**解決手順:**
```bash
# Step 1: エラー確認
npm run build
# → エラー箇所を確認

# Step 2: Git差分で原因特定
git diff

# Step 3: 怪しい変更をロールバック
git restore [ファイル名]

# Step 4: TypeScriptサーバー再起動
# Cursorで: Cmd+Shift+P → "TypeScript: Restart TS Server"

# Step 5: 再確認
npm run build
```

---

### パターンC: ビルドエラー

#### 症状: `npm run build` が失敗

**確認手順:**
```bash
# Step 1: 開発サーバーは動くか確認
npm run dev
# → 動く場合は本番ビルド固有の問題

# Step 2: エラーメッセージを確認
npm run build 2>&1 | tee build-error.log

# Step 3: よくある原因
# - 環境変数の不足
# - 未使用のインポート
# - 型エラー

# Step 4: 環境変数確認
cat .env.local
# → NEXT_PUBLIC_* がすべて設定されているか

# Step 5: 型チェック
npx tsc --noEmit
```

---

## 📊 効果測定

### 導入前後の比較（2週間後に記録）

| 指標 | 導入前 | 導入後 | 改善率 | 目標 |
|------|--------|--------|--------|------|
| 手戻り回数/週 | __ 回 | __ 回 | __ % | <2回 |
| サーバークラッシュ/週 | __ 回 | __ 回 | __ % | <1回 |
| Git復元回数/週 | __ 回 | __ 回 | __ % | <1回 |
| 開発時間ロス/日 | __ 分 | __ 分 | __ % | <30分 |
| コミット頻度/日 | __ 回 | __ 回 | __ % | >10回 |

### 記録方法

毎日の終わりに記録：

```markdown
## 開発日誌: 2025-01-10

### 作業内容
- ログインAPI実装

### 問題発生
- [x] サーバークラッシュ 1回（Step 2で解決）
- [ ] 手戻りなし

### コミット回数
- 12回

### 所感
- .cursorrules のおかげでファイル変更が限定的
- プロンプトテンプレートで指示が明確に
```

---

## 🔄 定期メンテナンス

### 週次チェック（金曜日 15:00）

```markdown
## 週次レビュー: 2025-01-10

### 今週の統計
- [ ] 手戻り回数: __ 回
- [ ] サーバークラッシュ: __ 回
- [ ] Git復元: __ 回
- [ ] 平均コミット頻度: __ 回/日

### 問題点
- 最も多い問題: ______
- 原因: ______

### 改善アクション
- [ ] .cursorrules にルール追加
- [ ] プロンプトテンプレート更新
- [ ] その他: ______
```

---

### 月次レビュー（月末）

```markdown
## 月次レビュー: 2025-01

### 全体統計
- 手戻り削減率: __ %
- 開発効率向上: __ %
- ビルドエラー削減: __ %

### 成功事例
- ______

### 継続的改善
- [ ] Next.js / Cursor のアップデート確認
- [ ] 新しい問題パターンの追加
- [ ] チーム共有（該当する場合）
```

---

## 🎓 よくある質問（FAQ）

### Q1: AIがルールを無視します

**A:** 以下を確認してください：

1. `.cursorrules` がプロジェクトルートにあるか
2. Cursorを再起動したか
3. プロンプトが具体的か

```bash
# 確認方法
ls -la .cursorrules
# → 存在すること

# Cursorキャッシュクリア（Mac）
rm -rf ~/Library/Application\ Support/Cursor/Cache/*

# Cursor再起動
```

---

### Q2: Turbopack と Webpack どちらを使うべき？

**A:** 基本的には **Turbopack（デフォルト）** を推奨

**Turbopackを使う場合:**
- 新規プロジェクト ✅
- カスタムwebpack設定がない ✅
- 開発速度を重視 ✅

**Webpackを使う場合:**
- カスタムwebpack設定がある
- webpackプラグインに依存
- Turbopackで問題が発生

```bash
# Turbopack（デフォルト）
npm run dev

# Webpack
npm run dev -- --webpack
```

---

### Q3: コミット頻度はどのくらい？

**A:** **5-10分ごと、または機能単位**

**推奨頻度:**
- ファイル1つ変更 → コミット
- 機能1つ完成 → コミット
- 動作確認OK → コミット

**避けるべき:**
- 1日の終わりにまとめてコミット ❌
- 複数機能をまとめてコミット ❌

---

### Q4: .cursorrules を更新したらAIに反映されない

**A:** Cursorの再起動が必要です

```bash
# 1. Cursorを完全終了
# Cmd+Q (Mac) / Alt+F4 (Windows)

# 2. 3秒待つ

# 3. Cursor再起動
```

---

### Q5: Step 5（完全リセット）はいつ使う？

**A:** **最終手段**。他のStepで解決しない場合のみ

**使用前チェック:**
- [ ] Step 1-4 を全て試した
- [ ] エラーログを確認した
- [ ] 未コミットの重要な変更がない
- [ ] 時間に余裕がある（10-15分）

```bash
# 実行前に必ず確認
git status
# → 重要な変更があれば先にコミット

# 完全リセット
git stash  # 念のため
rm -rf node_modules .next
npm install
npm run dev
```

---

## 🔗 関連リソース

### 公式ドキュメント
- [Next.js 16](https://nextjs.org/blog/next-16)
- [Next.js 16.1](https://nextjs.org/blog/next-16-1)
- [Turbopack](https://nextjs.org/docs/app/api-reference/turbopack)
- [Upgrading to 16](https://nextjs.org/docs/app/guides/upgrading/version-16)

### プロジェクト内ドキュメント
- `.cursorrules` - AI制御ルール
- `docs/troubleshooting/PDF-OCR問題解決-詳細分析.md` - pdfjs-dist詳細

---

## 📞 サポート

### 問題が解決しない場合

1. **このドキュメントを検索**
   - Cmd+F (Mac) / Ctrl+F (Windows)

2. **Git履歴を確認**
   ```bash
   git log --oneline -20
   ```

3. **クリーンな状態に戻す**
   ```bash
   git restore .
   npm run clean
   npm run dev
   ```

4. **最終手段**
   ```bash
   npm run reset
   ```

---

## 🎯 次のステップ

### 今すぐやること（5分）

- [ ] このファイルをブックマーク
- [ ] package.json にスクリプト追加
- [ ] Git エイリアス設定
- [ ] 動作テスト実施

### 今週やること

- [ ] プロンプトテンプレートを試す
- [ ] 毎日の開発日誌をつける
- [ ] コミット頻度を上げる

### 2週間後

- [ ] 効果測定を記録
- [ ] 問題パターンを分析
- [ ] .cursorrules を必要に応じて更新

---

## 📝 更新履歴

- 2025-01-10: 初版作成（v3.1）
- YYYY-MM-DD: 次回更新

---

**このガイドを定期的に見返して、継続的に改善しましょう！**
