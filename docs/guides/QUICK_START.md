# Dify × Supabase 連携 - クイックスタートガイド

**所要時間**: 30分  
**難易度**: ⭐⭐☆☆☆（中級）

---

## 🎯 このガイドで実現すること

- ✅ Supabaseからクライアント情報を自動取得
- ✅ 新規案件・継続案件の自動判別
- ✅ DifyでAIコンサルティングを実行
- ✅ 過去の会話履歴を活用した提案

---

## 📋 前提条件

- [ ] Next.js 16+ プロジェクトが稼働中
- [ ] Supabaseプロジェクトが設定済み
- [ ] Difyアカウント作成済み
- [ ] `app/api/dify/context/route.ts` が作成済み

---

## 🚀 5ステップで完了

### Step 1: APIキー生成（2分）

```bash
# ターミナルで実行
openssl rand -base64 32
```

**出力例**:
```
xK2m9PqR7sN4vW8yB3cD5eF6gH7iJ8kL9mN0oP1qR2s=
```

このキーをコピーしてください 📋

---

### Step 2: 環境変数設定（3分）

#### ローカル環境

`.env.local` ファイルに追加:

```bash
# Dify連携用
DIFY_API_KEY=xK2m9PqR7sN4vW8yB3cD5eF6gH7iJ8kL9mN0oP1qR2s=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 本番環境（Vercel）

1. Vercel Dashboard → Settings → Environment Variables
2. 以下を追加:
   - Key: `DIFY_API_KEY`
   - Value: `<生成したキー>`
   - Environment: `Production`, `Preview`, `Development` 全てチェック

---

### Step 3: デプロイ（5分）

```bash
# ビルド確認
npm run build

# エラーがなければデプロイ
git add .
git commit -m "feat: Add Dify integration API v2.0"
git push
```

**Vercelで自動デプロイが開始されます**

デプロイ完了を確認:
```bash
curl https://your-domain.vercel.app/api/dify/context
```

期待する出力:
```json
{
  "status": "ok",
  "endpoint": "Dify Context API",
  "version": "1.0.0"
}
```

---

### Step 4: Difyワークフロー作成（15分）

#### 4-1. ワークフロー作成

1. Dify → **Studio** → **Create Workflow**
2. 名前: `AIコンサルティング`
3. タイプ: **Chatflow**

#### 4-2. 環境変数設定

1. Settings → **Environment Variables**
2. **Add Variable**:
   - Key: `DIFY_API_KEY`
   - Value: `<Step 1で生成したキー>`

#### 4-3. ノード追加

##### ノード1: Start

変数を3つ追加:

| 変数名 | 型 | 必須 | デフォルト値 |
|--------|-----|------|------------|
| `user_id` | text | ✓ | - |
| `is_new_case` | boolean | ✓ | `true` |
| `user_question` | text | ✓ | - |

##### ノード2: HTTP Request

| 設定項目 | 値 |
|---------|-----|
| Method | `POST` |
| URL | `https://your-domain.vercel.app/api/dify/context` |
| Headers | `Content-Type: application/json`<br>`x-api-key: {{env.DIFY_API_KEY}}` |
| Body (JSON) | `{"userId": "{{start.user_id}}", "isNewCase": {{start.is_new_case}}}` |
| Output Variable | `context` |

##### ノード3: Code

Language: `JavaScript`

```javascript
function main(args) {
  const data = args.context.data;
  
  const companyInfo = `
【会社情報】
会社名: ${data.company.name}
業種: ${data.company.industry || '不明'}
従業員数: ${data.company.employee_count || '不明'}
課題: ${(data.company.current_challenges || []).join(', ')}
`;

  const profileInfo = `
【担当者】
${data.profile.name} (${data.profile.position || '役職不明'})
`;

  let historyInfo = '';
  if (data.conversationHistory) {
    historyInfo = `
【過去の相談】
${data.conversationHistory.session.title}
前回の提案: ${JSON.stringify(data.conversationHistory.session.recommendations)}
`;
  }

  return {
    context: companyInfo + profileInfo + historyInfo,
    company_name: data.company.name,
    user_name: data.profile.name
  };
}
```

Output Variables: `context`, `company_name`, `user_name`

##### ノード4: LLM

| 設定項目 | 値 |
|---------|-----|
| Model | GPT-4 |
| Temperature | 0.7 |
| Max Tokens | 2000 |

**System Prompt**:
```
あなたは経験豊富なAIコンサルタントです。
クライアントの状況を分析し、実践的な提案を行ってください。

【回答フォーマット】
1. 状況の理解
2. 分析結果
3. 具体的な提案（3〜5点）
4. 次のステップ
```

**User Prompt**:
```
{{code_1.context}}

【質問】
{{start.user_question}}

上記をもとに、{{code_1.company_name}}の{{code_1.user_name}}様へ
専門的なコンサルティングを提供してください。
```

##### ノード5: Answer

Answer: `{{llm_1.text}}`

#### 4-4. ノード接続

```
Start → HTTP Request → Code → LLM → Answer
```

---

### Step 5: テスト実行（5分）

#### 新規案件テスト

Difyの Debug 画面で実行:

```json
{
  "user_id": "実際のSupabase auth.usersのID",
  "is_new_case": true,
  "user_question": "AIを活用した業務効率化について相談したいです"
}
```

**期待結果**:
- 会社情報が表示される
- プロフィール情報が表示される
- AIからの提案が生成される

#### 継続案件テスト

```json
{
  "user_id": "同じユーザーID",
  "is_new_case": false,
  "user_question": "前回提案いただいた内容の進捗を報告します"
}
```

**期待結果**:
- 過去の相談内容が含まれる
- 文脈を踏まえた回答が生成される

---

## ✅ 完了チェックリスト

- [ ] APIキーを生成した
- [ ] 環境変数を設定した（ローカル・本番）
- [ ] デプロイが成功した
- [ ] Health Checkが通った
- [ ] Difyワークフローを作成した
- [ ] 新規案件テストが成功した
- [ ] 継続案件テストが成功した

---

## 🐛 トラブルシューティング

### Q1: "Unauthorized" エラーが出る

**原因**: APIキーが一致していない

**解決方法**:
1. `.env.local` の `DIFY_API_KEY` を確認
2. Difyの環境変数と一致しているか確認
3. Vercelの環境変数を確認（本番の場合）

---

### Q2: "User not found" エラーが出る

**原因**: 存在しないユーザーIDを指定している

**解決方法**:
1. Supabase Dashboard → Authentication → Users
2. 実際のユーザーIDをコピー
3. Difyのテストで正しいIDを使用

---

### Q3: 会社情報が表示されない

**原因**: プロフィールに `company_id` が設定されていない

**解決方法**:
1. Supabase Dashboard → Table Editor → profiles
2. 該当ユーザーの `company_id` を確認
3. NULLの場合は、companiesテーブルからIDをコピーして設定

---

### Q4: "companies is not defined" エラー

**原因**: クエリ構文が古い

**解決方法**:
`route.ts` のコードが最新版（v2.0）になっているか確認:

```typescript
// ✅ 正しい（v2.0）
.select(`
  *,
  companies:company_id (*)
`)

// ❌ 古い（v1.0）
.select('*, companies(*)')
```

---

## 📚 次のステップ

基本的な連携ができたら、以下にチャレンジしてください：

1. **会話の保存**: DifyからSupabaseへの保存機能を追加
2. **レポート生成**: セッション終了時に自動レポート作成
3. **通知機能**: 重要な提案をメール/Slack通知

詳細は各ドキュメントを参照:
- [詳細実装ガイド](./dify-supabase-integration.md)
- [コード例集](./DIFY_CODE_EXAMPLES.md)
- [セットアップチェックリスト](./DIFY_SETUP_CHECKLIST.md)

---

## 🆘 サポート

問題が解決しない場合:

1. [ファクトチェック報告書](./FACT_CHECK_REPORT.md) を確認
2. [統合サマリー](./DIFY_INTEGRATION_SUMMARY.md) を確認
3. GitHubでIssueを作成

---

**作成日**: 2026-01-05  
**バージョン**: 2.0  
**対象バージョン**: Next.js 16+, Dify 1.0+, Supabase
