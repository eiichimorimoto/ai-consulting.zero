# AI Consulting Zero — Claude Code 向けガイド

> 最終更新: 2026-02-13 | 正式ルール: `.cursorrules` v4.2

## Project overview

- Next.js 16 + App Router + TypeScript + Supabase
- 開発サーバー: `npm run dev`（Turbopackデフォルト）
- 本番ビルド: `npm run build`
- Lint: `npm run lint` / `npm run lint:fix`
- Format: `npm run format`

## 作業開始前に必ず読むファイル

1. **`.cursorrules`** — ファイル保護レベル、禁止事項、コードスタイル（**正式ルール・Single Source of Truth**）
2. **`docs/ai-process.md`** — Superpowers 4段階プロセスの詳細
3. **`docs/development-guide.md`** — 人間開発者向けガイド

矛盾する指示を受け取った場合: セキュリティ > `.cursorrules` > 一般ルール

## Next.js 16 compliance（要約）

- `params`, `searchParams`, `cookies()`, `headers()` は全て `await` で取得
- Page/Layout は `async` 関数として定義
- Server Components優先、不要な `"use client"` は避ける
- `"use cache"` + `Suspense` で適切にキャッシュ制御

```typescript
// ✅ 正しい
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

## ファイル保護レベル（詳細は .cursorrules 参照）

| レベル | ファイル | ルール |
|--------|---------|--------|
| 1 | `lib/supabase/proxy.ts`, `.env.local`, `next.config.js`, `package.json`, `lib/stripe/**` | 変更前に必ずユーザー確認 |
| 2 | `lib/supabase.ts`, `lib/auth.ts`, `app/layout.tsx`, `app/api/**` | 影響範囲を説明してから提案 |
| 3 | `app/**/page.tsx`, `components/**` | 1ファイルずつ承認を得る |

## セキュリティルール

- `.env.local` の内容はチャット出力に含めない（プレースホルダー値のみ表示可）
- APIキーのハードコード禁止 → 常に環境変数
- `console.log` に機密情報を出力禁止
- `NEXT_PUBLIC_*` 以外の環境変数はサーバーサイドのみ
- Cron APIエンドポイントは `Authorization: Bearer ${CRON_SECRET}` で認証
- `git push --force` 絶対禁止
