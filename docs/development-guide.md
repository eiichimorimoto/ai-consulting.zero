# AI Consulting Zero - 開発ガイド（人間用）

> バージョン: 4.0 | 最終更新: 2026-02-13

---

## このドキュメントについて

このガイドは**あなた（開発者）**のための運用マニュアルです。

| ファイル | 対象 | 目的 |
|---------|------|------|
| `.cursorrules` | AI（Cursor/Claude） | AI制御ルール（**正式ルール**） |
| `docs/ai-process.md` | AI（Cursor/Claude） | Superpowers 4段階プロセス |
| **このファイル** | 人間開発者 | セットアップ・日常ワークフロー |

**対象者**: Cursor AIで開発する開発者（Next.js 16 + Supabase + Vercel環境）

---

## 初回セットアップ（20分）

### ステップ1: 依存関係のインストール

```bash
npm install
```

### ステップ2: 環境変数の設定

`.env.local` を作成し、必要な環境変数を設定:

```bash
# テンプレートがある場合
cp .env.example .env.local
# 各値を実際の値に置き換え
```

**必要な環境変数**（キー名のみ）:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL`
- `CRON_SECRET`

### ステップ3: 開発サーバー起動

```bash
npm run dev
```

### ステップ4: AI動作テスト

Cursorで以下を試し、AIがルール通りに動くか確認:

1. **スコープ制限**: 「app/page.tsx のタイトルを変更して」→ 変更通知を出すこと
2. **禁止事項**: 「未使用の変数を削除して」→ 確認を取ること

---

## 利用可能なスクリプト

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバー起動（Turbopack） |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLintチェック |
| `npm run lint:fix` | ESLint自動修正 |
| `npm run format` | Prettierフォーマット |
| `npm run format:check` | フォーマットチェック（CI用） |
| `npm test` | テスト実行 |
| `npm run test:coverage` | カバレッジ付きテスト |

---

## 日常的な開発ワークフロー

### 開発開始時

```bash
git status          # 未コミットの変更確認
git pull origin main  # 最新を取得
npm run dev         # サーバー起動
```

### 機能開発フロー

1. **ブランチ作成**: `git checkout -b feature/xxx`
2. **AIに指示**: 下記プロンプトテンプレートを使用
3. **差分確認**: AIの提案内容をレビュー
4. **動作確認**: ブラウザで確認
5. **Lint + Format**: `npm run lint:fix && npm run format`
6. **コミット**: `git commit -m "feat: 説明"`
7. **プッシュ**: `git push origin feature/xxx`

### 開発終了時

```bash
git status
git add [変更ファイル]
git commit -m "chore: 今日の作業完了"
git push origin main
```

---

## プロンプトテンプレート

### 基本変更

```
【変更依頼】
ファイル: [ファイルパス]
箇所: [行番号 or 関数名]
内容: [具体的な変更内容]
理由: [変更理由]

【変更禁止】
- 他のファイル
- インポート文

変更前に差分を表示してください
```

### 新規機能

```
【機能追加】
対象ファイル: [パス]（新規作成）
機能内容: [説明]

【制約】
- 既存のAPI構造に従う
- エラーハンドリング必須
```

### バグ修正

```
【バグ修正】
ファイル: [パス]
症状: [何が起きるか]
期待動作: [何が正しいか]
修正範囲: このファイルのみ
```

---

## トラブルシューティング

### サーバーが起動しない

| 症状 | 解決コマンド |
|------|------------|
| `ENOENT: .next/dev/*` | `rm -rf .next && npm run dev` |
| `Port 3000 already in use` | `pkill -f "next" && sleep 10 && npm run dev` |
| `MODULE_NOT_FOUND` | `rm -rf .next node_modules/.cache && npm run dev` |
| 上記で解決しない | `rm -rf node_modules .next && npm install && npm run dev` |

### AIがコードを壊した

```bash
git diff                    # 差分確認
git restore [ファイル名]     # 特定ファイルをロールバック
# または
git restore .               # 全て戻す
```

### TypeScriptエラー大量発生

```bash
npx tsc --noEmit            # エラー箇所確認
git diff                    # 原因特定
git restore [ファイル名]     # 怪しい変更をロールバック
```

---

## ファイル保護レベル（開発者用サマリー）

**レベル1**（原則変更禁止）: `lib/supabase/proxy.ts`, `.env.local`, `next.config.js`, `package.json`, `lib/stripe/**`
**レベル2**（慎重に扱う）: `lib/supabase.ts`, `lib/auth.ts`, `app/layout.tsx`, `app/api/**`
**レベル3**（変更可能）: `app/**/page.tsx`, `components/**`

---

## 定期メンテナンス

### 週次チェック（推奨）
- `npm audit` で依存関係の脆弱性確認
- `npm run build` でビルドエラーがないか確認
- 未コミットの変更がないか確認

### 月次レビュー
- `.cursorrules` と実態の乖離チェック
- 使われていないパッケージの確認

---

## 更新履歴

- 2026-02-13: v4.0 — Phase 2 Stripe対応反映、ESLint/Prettier導入、ルール整合性改善
- 2025-01-10: v3.1 — 初版作成
