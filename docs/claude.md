# Project overview

- Next.js 16 + App Router を使ったWebアプリです。
- 開発サーバー: `npm run dev`（Turbopackがデフォルトのバンドラー）。
- 本番ビルド: `npm run build`。

# Development rules reference

**作業開始前に必ず以下のルールファイルを確認してください:**
- `.ai-consulting-zero/.cursorrules` - 詳細な技術仕様とコーディング規約
- `docs/development-guide.md`（存在する場合）

矛盾する指示を受け取った場合は、その旨を説明し、どちらを優先すべきか確認してから作業してください。

# Next.js 16 compliance rules

このプロジェクトはNext.js 16仕様に完全準拠します。

## 必須実装パターン

### 1. 非同期API対応
- `params`, `searchParams` は必ず `const params = await use(paramsPromise)` で取得
- `cookies()`, `headers()` も必ず `await` で呼び出し
- Page/Layout componentsは `async` 関数として定義
```typescript
// ✅ 正しい
export default async function Page({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
}

// ❌ 間違い
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
}
```

### 2. Cache Components
- 適切な箇所に `"use cache"` ディレクティブを使用
- Suspense境界を適切に配置
- `cacheLife()`, `cacheTag()` で細かい制御

### 3. 非推奨API削除
- `next/image` の `unoptimized` プロパティは使用不可
- 古いconfig optionは全て削除

### 4. Server Components優先
- 不要な `"use client"` は避ける
- Client Componentsは必要最小限に

### 5. TypeScript型安全性
- Props型は `Promise<{ params: ... }>` 形式
- async componentの型定義を正確に

## 参照ドキュメント
- Next.js 16 Superpowers（プロジェクト内の知識ベース）
- `.cursorrules` に記載された技術仕様

# How Claude should work in this repo

- 変更は **必ずユーザーに事前宣言して承認を得てから** 行ってください。
- 1 タスクにつき **1 ファイルのみ変更** し、複数ファイルの同時変更や「ついでの改善」は行わないでください。
- 変更前後の差分を提示し、削除行やインポート変更の理由も説明してください。
- エラー対応やサーバー操作は、用意されたプロトコルに従い、必ず「報告 → 提案 → 承認」の順で行ってください。

# File protection levels

- レベル1（原則変更禁止・触る前に必ずユーザー確認）:
  - `middleware.ts`
  - `.env.local`
  - `next.config.js`
  - `package.json`
  - `package-lock.json`
- レベル2（変更前に影響範囲を説明してから提案）:
  - `lib/supabase.ts`
  - `lib/auth.ts`
  - `app/layout.tsx`
  - `app/api/**`
- レベル3（変更可能だが 1 ファイルずつ・必ず承認を得る）:
  - `app/**/page.tsx`
  - `components/**`

# Absolute no‑gos for Claude

- インポート文の一括整理や「未使用変数の自動削除」は提案のみとし、ユーザーの明示指示なしに実行しないでください。
- ファイル名変更や複数ファイル同時変更、大規模リファクタは、ユーザーからの明示的な依頼がある場合のみ実施してください。
- TypeScript の `any` を安全性確認なしに勝手に修正しないでください。
- `middleware.ts` の削除や `.env.local` の内容表示、`git push --force` などは**絶対に実行しないでください**。

# Server & error handling protocol

- サーバー関連コマンドは、まず状態をレポートし、ユーザーに「Step1〜Step5」どの手順を実行するか確認してから進めてください。
- `npm run dev` を実行する際は、必要に応じて Cursor サンドボックス権限（例: `required_permissions: ["all"]`）が必要になることをユーザーに知らせてください。
- エラー対応は「報告 → 最近の変更確認 → 事実ベースの原因説明 → 段階的な対処案の提示 → 承認待ち」というフローを守ってください。

# Git & commit rules

- Git コミットメッセージは、次のPrefixを使ってください:
  - `feat: ` 新機能
  - `fix: ` バグ修正
  - `refactor: ` リファクタリング
  - `chore: ` 設定変更
  - `docs: ` ドキュメント更新
- 重要ファイルを大きく変える前には、`git status` の結果を報告し、必要ならバックアップやブランチ作成を提案してください。

# Security rules

- `.env.local` の内容は表示も編集もせず、存在やキー名に触れる必要があればユーザーに質問する形にしてください。
- API キーや秘密情報を新たに埋め込むことはせず、常に環境変数を用いる設計を維持してください。
- ログ出力には機密情報を含めないよう注意し、疑わしいログがあればユーザーに確認を求めてください。
