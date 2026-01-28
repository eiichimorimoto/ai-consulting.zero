# Dify × Supabase 連携ドキュメント

**バージョン**: 2.0（修正版）  
**最終更新**: 2026-01-26  
**Dify対応バージョン**: v1.9.0+（安定版）/ v1.11.4（最新安定版）/ v2.0.0-beta.1+（ベータ版）  
**API Context バージョン**: 1.0.0

---

## 📚 ドキュメント一覧

### 🚀 スタートガイド

| ドキュメント | 説明 | 対象者 | 所要時間 |
|-------------|------|--------|---------|
| [QUICK_START.md](./QUICK_START.md) | 30分で完了するクイックスタート | 全員 | 30分 |
| [DIFY_SETUP_CHECKLIST.md](./DIFY_SETUP_CHECKLIST.md) | 詳細セットアップ手順 | 実装者 | 2-3時間 |

### 📖 技術ドキュメント

| ドキュメント | 説明 | 対象者 |
|-------------|------|--------|
| [dify-supabase-integration.md](./dify-supabase-integration.md) | 詳細な実装ガイド | 開発者 |
| [DIFY_CODE_EXAMPLES.md](./DIFY_CODE_EXAMPLES.md) | 修正済みコード例集 | 開発者 |
| [DIFY_WORKFLOW_GUIDE.md](./DIFY_WORKFLOW_GUIDE.md) | ワークフロー設定ガイド（マークダウン版） | 全員 |
| [dify-workflow-example.json](./dify-workflow-example.json) | Difyワークフロー設定（JSON版） | 全員 |

### 📊 リファレンス

| ドキュメント | 説明 | 対象者 |
|-------------|------|--------|
| [DIFY_INTEGRATION_SUMMARY.md](./DIFY_INTEGRATION_SUMMARY.md) | 統合サマリー | 全員 |
| [FACT_CHECK_REPORT.md](./FACT_CHECK_REPORT.md) | ファクトチェック報告書 | 開発者・レビュアー |

---

## 🎯 目的別ガイド

### 「とにかく動かしたい！」

→ [QUICK_START.md](./QUICK_START.md) を読んで30分で実装

---

### 「仕組みを理解したい」

1. [DIFY_INTEGRATION_SUMMARY.md](./DIFY_INTEGRATION_SUMMARY.md) - 全体像を把握
2. [dify-supabase-integration.md](./dify-supabase-integration.md) - 詳細を理解
3. [DIFY_CODE_EXAMPLES.md](./DIFY_CODE_EXAMPLES.md) - コード例を確認

---

### 「エラーが出た！」

1. [QUICK_START.md](./QUICK_START.md) のトラブルシューティング
2. [FACT_CHECK_REPORT.md](./FACT_CHECK_REPORT.md) のよくあるエラー
3. [DIFY_CODE_EXAMPLES.md](./DIFY_CODE_EXAMPLES.md) のエラー対処法

---

### 「本番環境にデプロイしたい」

[DIFY_SETUP_CHECKLIST.md](./DIFY_SETUP_CHECKLIST.md) に従って段階的に実施

---

## 🆕 バージョン 2.0 の変更点

### 主な修正

| 項目 | v1.0 | v2.0 |
|------|------|------|
| Supabaseクライアント | `createClient()` | `await createClient()` ✅ |
| 外部キー指定 | `companies(*)` | `companies:company_id(*)` ✅ |
| 逆方向リレーション | `consulting_messages(*)` | `consulting_messages!session_id(*)` ✅ |

### 追加ドキュメント

- ✅ [DIFY_CODE_EXAMPLES.md](./DIFY_CODE_EXAMPLES.md) - 修正済みコード例集
- ✅ [FACT_CHECK_REPORT.md](./FACT_CHECK_REPORT.md) - ファクトチェック報告書
- ✅ [QUICK_START.md](./QUICK_START.md) - クイックスタートガイド

---

## 🔧 実装ファイル

実際のコードは以下に配置されています：

```
ai-consulting-zero/
├── app/
│   └── api/
│       └── dify/
│           └── context/
│               └── route.ts          # APIエンドポイント（v2.0修正済み）
├── docs/
│   └── guides/
│       ├── README.md                  # このファイル
│       ├── QUICK_START.md             # クイックスタート（新規）
│       ├── dify-supabase-integration.md  # 実装ガイド（v2.0修正済み）
│       ├── DIFY_CODE_EXAMPLES.md      # コード例集（新規）
│       ├── DIFY_SETUP_CHECKLIST.md    # セットアップ手順
│       ├── DIFY_INTEGRATION_SUMMARY.md # 統合サマリー（v2.0更新）
│       ├── FACT_CHECK_REPORT.md       # ファクトチェック報告書（新規）
│       └── dify-workflow-example.json # Difyワークフロー設定
└── supabase/
    └── schema.sql                     # データベーススキーマ
```

---

## 📊 アーキテクチャ概要

```
┌─────────────┐
│   Dify      │  ← ユーザーの質問
│ Workflow    │
└──────┬──────┘
       │ POST /api/dify/context
       │ {userId, isNewCase}
       ↓
┌─────────────────────┐
│  Next.js API Route  │  ← v2.0で修正
│ /api/dify/context   │  ・await createClient()
└──────┬──────────────┘  ・外部キー明示
       │
       ↓
┌──────────────┐
│  Supabase    │
│  Database    │
│              │
│ ・profiles   │
│ ・companies  │
│ ・sessions   │
│ ・messages   │
│ ・reports    │
└──────┬───────┘
       │
       ↓
┌─────────────────────┐
│   JSON Response     │
│                     │
│ ・profile           │
│ ・company           │
│ ・webResources      │
│ ・conversationHistory│
└──────┬──────────────┘
       │
       ↓
┌─────────────┐
│   Dify      │
│  LLM Node   │  ← AIコンサルティング実行
│  (GPT-4)    │
└──────┬──────┘
       │
       ↓
    ユーザーへ回答
```

---

## 🎓 学習パス

### 初級（30分）

1. [QUICK_START.md](./QUICK_START.md) を読む
2. 実際に動かしてみる
3. テストデータで動作確認

### 中級（2時間）

1. [DIFY_INTEGRATION_SUMMARY.md](./DIFY_INTEGRATION_SUMMARY.md) で全体像理解
2. [dify-supabase-integration.md](./dify-supabase-integration.md) で詳細理解
3. [DIFY_CODE_EXAMPLES.md](./DIFY_CODE_EXAMPLES.md) でコード理解

### 上級（1日）

1. [DIFY_SETUP_CHECKLIST.md](./DIFY_SETUP_CHECKLIST.md) で本番環境構築
2. カスタマイズして独自機能追加
3. パフォーマンスチューニング

---

## ⚠️ 重要な注意事項

### v1.0 からのアップグレード

v1.0のコードを使用している場合は、必ず以下を修正してください：

```typescript
// ❌ v1.0（動作しない）
const supabase = createClient()

// ✅ v2.0（正しい）
const supabase = await createClient()
```

詳細は [FACT_CHECK_REPORT.md](./FACT_CHECK_REPORT.md) を参照

---

### セキュリティ

- APIキーは絶対に公開しない
- `.env.local` はGitにコミットしない
- Vercelの環境変数は必ず設定する

---

### パフォーマンス

- LIMIT句を適切に設定
- 不要なデータは取得しない
- タイムアウト設定は30秒

---

## 🆘 サポート

### ドキュメントで解決しない場合

1. [FACT_CHECK_REPORT.md](./FACT_CHECK_REPORT.md) のトラブルシューティング
2. [DIFY_CODE_EXAMPLES.md](./DIFY_CODE_EXAMPLES.md) のエラー対処法
3. GitHubでIssueを作成

### よくある質問

**Q: v1.0とv2.0の違いは？**  
A: [FACT_CHECK_REPORT.md](./FACT_CHECK_REPORT.md) の「修正した問題点」を参照

**Q: 環境変数が認識されない**  
A: [QUICK_START.md](./QUICK_START.md) の「Step 2」を確認

**Q: Difyのワークフローが動かない**  
A: [DIFY_SETUP_CHECKLIST.md](./DIFY_SETUP_CHECKLIST.md) の「Phase 3」を確認

---

## 📞 連絡先

- プロジェクトリポジトリ: [GitHub]
- Dify公式ドキュメント: https://docs.dify.ai
- Supabase公式ドキュメント: https://supabase.com/docs

---

**作成日**: 2026-01-05  
**バージョン**: 2.0  
**メンテナ**: AI Assistant
