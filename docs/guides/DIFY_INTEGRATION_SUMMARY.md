# Dify × Supabase 連携 - 実装サマリー

## 📝 概要

Supabaseのデータベースからクライアント情報を取得し、Difyのワークフローで高度なAIコンサルティングを実現する連携システムを構築しました。

**作成日**: 2026-01-05  
**最終更新**: 2026-01-26  
**Dify対応バージョン**: v1.9.0+（安定版）/ v1.11.4（最新安定版）/ v2.0.0-beta.1+（ベータ版）  
**API Context バージョン**: 1.0.0

---

## 🎯 実現したこと

### 新規案件（is_new_case: true）
- ✅ 会社情報の自動取得
- ✅ ユーザープロフィールの取得
- ✅ Web検索結果の活用
- ✅ 名刺情報の統合

### 継続案件（is_new_case: false）
- ✅ 過去の会話履歴の取得
- ✅ セッション情報の継続
- ✅ 過去のレポート参照
- ✅ 文脈を踏まえた提案

---

## 📂 作成したファイル

| ファイル | 説明 | バージョン |
|---------|------|-----------|
| `app/api/dify/context/route.ts` | APIエンドポイント（修正済み） | v2.0 |
| `docs/guides/dify-supabase-integration.md` | 詳細な実装ガイド（修正済み） | v2.0 |
| `docs/guides/dify-workflow-example.json` | Difyワークフロー設定例 | v1.0 |
| `docs/guides/DIFY_SETUP_CHECKLIST.md` | セットアップ手順チェックリスト | v1.0 |
| `docs/guides/DIFY_CODE_EXAMPLES.md` | 修正済みコード例集（新規） | v2.0 |
| `docs/guides/FACT_CHECK_REPORT.md` | ファクトチェック報告書（新規） | v1.0 |

---

## 🗄️ 使用するSupabaseテーブル

### 新規案件で使用

```sql
-- 1. profiles（必須）
SELECT 
  name, position, department, email, phone, company_id
FROM profiles
WHERE user_id = :user_id;

-- 2. companies（必須）
SELECT 
  name, industry, employee_count, annual_revenue,
  business_description, current_challenges, 
  growth_stage, it_maturity_level
FROM companies
WHERE id = :company_id;

-- 3. company_web_resources（オプション）
SELECT 
  title, description, url, relevance_score
FROM company_web_resources
WHERE company_id = :company_id
ORDER BY relevance_score DESC
LIMIT 5;

-- 4. business_cards（オプション）
SELECT 
  person_name, company_name, position, email, phone
FROM business_cards
WHERE user_id = :user_id
ORDER BY created_at DESC
LIMIT 10;
```

### 継続案件で追加使用

```sql
-- 5. consulting_sessions
SELECT 
  id, title, analysis_summary, 
  key_insights, recommendations
FROM consulting_sessions
WHERE user_id = :user_id 
  AND status = 'active'
ORDER BY updated_at DESC
LIMIT 1;

-- 6. consulting_messages
SELECT 
  role, content, created_at
FROM consulting_messages
WHERE session_id = :session_id
ORDER BY created_at DESC
LIMIT 10;

-- 7. reports
SELECT 
  id, title, report_type, 
  executive_summary, score, created_at
FROM reports
WHERE user_id = :user_id
ORDER BY created_at DESC
LIMIT 3;
```

---

## 🔧 Dify側の初期設定

### 1. 環境変数

```
DIFY_API_KEY=<32文字以上のランダム文字列>
```

### 2. ワークフロー構成

```
[Start] 
  ↓ (user_id, is_new_case, user_question)
[HTTP Request: /api/dify/context]
  ↓ (context data)
[Code: データ整形]
  ↓ (formatted_context)
[LLM: GPT-4]
  ↓ (consultation_result)
[Answer]
```

### 3. 入力変数

| 変数名 | 型 | 説明 | 例 |
|--------|-----|------|-----|
| `user_id` | text | Supabase auth.usersのID | `550e8400-e29b-41d4-a716-446655440000` |
| `is_new_case` | boolean | 新規案件フラグ | `true` / `false` |
| `user_question` | text | ユーザーの質問 | `AIを活用した業務効率化について...` |

---

## 🚀 使い方

### ステップ1: APIキー生成

```bash
openssl rand -base64 32
```

### ステップ2: 環境変数設定

`.env.local` に追加:
```bash
DIFY_API_KEY=生成したキー
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### ステップ3: デプロイ

```bash
npm run build
git add .
git commit -m "feat: Add Dify integration"
git push
```

### ステップ4: Difyワークフロー作成

1. `dify-workflow-example.json` をインポート
2. HTTP RequestノードのURLを本番URLに変更
3. 環境変数 `DIFY_API_KEY` を設定
4. テスト実行

### ステップ5: テスト

**新規案件テスト:**
```json
{
  "user_id": "実際のユーザーID",
  "is_new_case": true,
  "user_question": "AIを活用した業務効率化について相談したいです"
}
```

**継続案件テスト:**
```json
{
  "user_id": "同じユーザーID",
  "is_new_case": false,
  "user_question": "前回提案いただいた内容の進捗を報告します"
}
```

---

## 📊 データフロー図

```
┌─────────────┐
│   Dify      │
│ Workflow    │
└──────┬──────┘
       │ POST /api/dify/context
       │ Headers: x-api-key
       │ Body: {userId, isNewCase}
       ↓
┌─────────────────────┐
│  Next.js API Route  │
│ /api/dify/context   │
└──────┬──────────────┘
       │ 1. API認証
       │ 2. userId検証
       ↓
┌──────────────┐
│  Supabase    │
│  Database    │
└──────┬───────┘
       │ profiles, companies,
       │ web_resources, sessions,
       │ messages, reports
       ↓
┌─────────────────────┐
│   JSON Response     │
│ ・profile           │
│ ・company           │
│ ・webResources      │
│ ・conversationHistory│
└──────┬──────────────┘
       │
       ↓
┌─────────────┐
│   Dify      │
│  LLM Node   │
│  (GPT-4)    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Response   │
│  to User    │
└─────────────┘
```

---

## 🔐 セキュリティ対策

- ✅ APIキー認証（`x-api-key` ヘッダー）
- ✅ Supabase RLS（Row Level Security）有効
- ✅ ユーザーID検証
- ✅ 環境変数による秘密情報管理
- ✅ タイムアウト設定（30秒）

---

## 📈 パフォーマンス目標

| 指標 | 目標値 | 現状 |
|------|--------|------|
| APIレスポンス時間 | < 3秒 | 測定中 |
| データ取得クエリ | < 1秒 | 測定中 |
| LLM生成時間 | < 10秒 | 測定中 |
| 同時接続数 | 100 | 測定中 |

---

## 🐛 トラブルシューティング

### よくある問題と解決策

| 問題 | 原因 | 解決策 |
|------|------|--------|
| 401 Unauthorized | APIキー不一致 | 環境変数を確認 |
| 404 User not found | 存在しないユーザーID | Supabaseでユーザー確認 |
| 500 Server Error | SQL構文エラー | Vercel Logsを確認 |
| タイムアウト | データ量過多 | LIMITを追加 |
| 空のレスポンス | RLS設定ミス | Supabaseポリシー確認 |

### デバッグコマンド

```bash
# ローカルテスト
curl -X POST http://localhost:3000/api/dify/context \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"userId":"test-id","isNewCase":true}'

# Vercelログ確認
vercel logs --follow

# Supabase RLS確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## 🔄 今後の拡張案

### Phase 2（優先度：高）

- [ ] リアルタイム会話のSupabase保存
- [ ] セッション自動作成機能
- [ ] レポート自動生成API

### Phase 3（優先度：中）

- [ ] ナレッジベース統合
- [ ] ベクトル検索による類似案件検索
- [ ] マルチモーダル対応（画像分析）

### Phase 4（優先度：低）

- [ ] 音声入力対応
- [ ] リアルタイム翻訳
- [ ] 業界別テンプレート

---

## 📚 参考ドキュメント

| ドキュメント | URL |
|-------------|-----|
| 詳細実装ガイド | `docs/guides/dify-supabase-integration.md` |
| セットアップチェックリスト | `docs/guides/DIFY_SETUP_CHECKLIST.md` |
| ワークフロー例 | `docs/guides/dify-workflow-example.json` |
| Dify公式ドキュメント | https://docs.dify.ai |
| Supabase公式ドキュメント | https://supabase.com/docs |

---

## 👥 貢献者

- 実装: AI Assistant
- レビュー: -
- テスト: -

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-01-05 | 1.0.0 | 初版作成 |
| 2026-01-05 | 2.0.0 | ファクトチェック後修正版リリース |

### v2.0.0 の主な変更点

1. **Supabaseクライアント作成を修正**
   - `createClient()` → `await createClient()`

2. **クエリ構文を修正**
   - 外部キー名を明示: `companies:company_id(...)`
   - 逆方向リレーション: `consulting_messages!session_id(...)`

3. **ドキュメント追加**
   - コード例集を追加
   - ファクトチェック報告書を追加

---

**最終更新**: 2026-01-05  
**バージョン**: 2.0.0  
**ステータス**: ✅ 修正完了・テスト準備完了
