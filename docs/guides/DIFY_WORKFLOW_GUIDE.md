# Difyワークフロー設定ガイド

**バージョン**: 2.0.0  
**最終更新**: 2026-01-05  
**対応**: Next.js 16+, Dify 1.0+, Supabase

---

## 📋 概要

Supabaseからクライアント情報を取得し、DifyでAIコンサルティングを実行するワークフローです。

**ワークフロー名**: AIコンサルティング - 新規案件対応

---

## 🔧 ワークフロー構成

```
[Start] 
  ↓ 入力: user_id, is_new_case, user_question
[HTTP Request: Supabaseコンテキスト取得]
  ↓ 出力: context
[Code: コンテキスト整形]
  ↓ 出力: formatted_context, company_name, user_name
[LLM: AIコンサルティング実行]
  ↓ 出力: text
[Answer: 回答]
```

---

## 📝 ノード詳細設定

### ノード1: Start（開始）

#### 入力変数

| 変数名 | 型 | 必須 | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| `user_id` | text | ✓ | - | Supabaseの`auth.users`のUUID |
| `is_new_case` | boolean | ✓ | `true` | 新規案件: `true` / 継続案件: `false` |
| `user_question` | text | ✓ | - | ユーザーからの質問内容 |

#### 設定例

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_new_case": true,
  "user_question": "AIを活用した業務効率化について相談したいです"
}
```

---

### ノード2: HTTP Request（Supabaseコンテキスト取得）

#### 基本設定

| 項目 | 設定値 |
|------|--------|
| **Method** | `POST` |
| **URL** | `https://your-domain.vercel.app/api/dify/context` |
| **Timeout** | `30` 秒 |
| **Output Variable** | `context` |

#### Headers

```json
{
  "Content-Type": "application/json",
  "x-api-key": "{{env.DIFY_API_KEY}}"
}
```

⚠️ **注意**: Difyのバージョンによっては `{{#sys.env.DIFY_API_KEY#}}` の可能性あり

#### Request Body

```json
{
  "userId": "{{start.user_id}}",
  "isNewCase": "{{start.is_new_case}}"
}
```

#### 期待されるレスポンス

```json
{
  "success": true,
  "data": {
    "profile": {
      "name": "山田太郎",
      "position": "部長",
      "department": "営業部",
      "email": "yamada@example.com",
      "phone": "03-1234-5678"
    },
    "company": {
      "name": "株式会社サンプル",
      "industry": "情報通信業",
      "employee_count": "50-100名",
      "annual_revenue": "10億円",
      "business_description": "...",
      "current_challenges": ["DX推進", "人材不足"],
      "growth_stage": "成長期",
      "it_maturity_level": "レベル2"
    },
    "webResources": [...],
    "businessCards": [...],
    "conversationHistory": null  // 新規案件の場合
  }
}
```

---

### ノード3: Code（コンテキスト整形）

#### 設定

| 項目 | 設定値 |
|------|--------|
| **Language** | `javascript` |
| **Input** | `args.context` (HTTP Requestの出力) |

#### コード

```javascript
function main(args) {
  // HTTP Requestの出力を取得
  const context = args.context;
  
  // エラーチェック
  if (!context || !context.success || !context.data) {
    return {
      formatted_context: 'エラー: データの取得に失敗しました',
      company_name: '不明',
      user_name: '不明',
      has_history: false
    };
  }
  
  const data = context.data;
  
  // 会社情報の整形
  const companyInfo = [
    '【会社情報】',
    '会社名: ' + (data.company.name || '不明'),
    '業種: ' + (data.company.industry || '不明'),
    '従業員数: ' + (data.company.employee_count || '不明'),
    '事業内容: ' + (data.company.business_description || 'なし'),
    '現在の課題: ' + ((data.company.current_challenges || []).join(', ') || 'なし'),
    'IT成熟度: ' + (data.company.it_maturity_level || '不明')
  ].join('\n');
  
  // プロフィール整形
  const profileInfo = [
    '',
    '【担当者情報】',
    '名前: ' + data.profile.name,
    '役職: ' + (data.profile.position || '不明'),
    '部署: ' + (data.profile.department || '不明'),
    'メール: ' + data.profile.email
  ].join('\n');
  
  // Web情報整形
  let webInfo = '';
  if (data.webResources && data.webResources.length > 0) {
    const resources = data.webResources.map(function(r) {
      return '- ' + (r.title || 'タイトルなし') + ': ' + (r.description || '');
    }).join('\n');
    webInfo = '\n\n【外部情報】\n' + resources;
  }
  
  // 会話履歴整形（継続案件の場合）
  let historyInfo = '';
  if (data.conversationHistory) {
    const session = data.conversationHistory.session;
    const messages = data.conversationHistory.recentMessages || [];
    
    const messageList = messages.map(function(m) {
      return m.role + ': ' + m.content;
    }).join('\n');
    
    historyInfo = [
      '',
      '',
      '【過去の相談】',
      'セッション: ' + session.title,
      '分析サマリー: ' + (session.summary || 'なし'),
      '前回の提案: ' + (session.recommendations ? JSON.stringify(session.recommendations) : 'なし'),
      '',
      '【直近の会話】',
      messageList
    ].join('\n');
  }
  
  return {
    formatted_context: companyInfo + profileInfo + webInfo + historyInfo,
    company_name: data.company.name || '不明',
    user_name: data.profile.name || '不明',
    has_history: !!data.conversationHistory
  };
}
```

#### 出力変数

| 変数名 | 型 | 説明 |
|--------|-----|------|
| `formatted_context` | string | 整形されたコンテキスト（LLMへの入力用） |
| `company_name` | string | 会社名 |
| `user_name` | string | ユーザー名 |
| `has_history` | boolean | 会話履歴の有無 |

#### 出力例（新規案件）

```
【会社情報】
会社名: 株式会社サンプル
業種: 情報通信業
従業員数: 50-100名
事業内容: クラウドサービスの提供
現在の課題: DX推進, 人材不足
IT成熟度: レベル2

【担当者情報】
名前: 山田太郎
役職: 部長
部署: 営業部
メール: yamada@example.com

【外部情報】
- 企業ニュース: 新サービスをリリース
- プレスリリース: 資金調達を実施
```

---

### ノード4: LLM（AIコンサルティング実行）

#### Model設定

| 項目 | 設定値 |
|------|--------|
| **Provider** | OpenAI |
| **Model** | GPT-4 |
| **Mode** | Chat |
| **Temperature** | 0.7 |
| **Max Tokens** | 2000 |

#### System Prompt

```
あなたは経験豊富なAIコンサルタントです。
クライアントの状況を分析し、実践的なアドバイスを提供してください。

【対応方針】
- 新規案件: 現状分析と初期提案を重視
- 継続案件: 過去の相談内容を踏まえた継続的な支援

【回答フォーマット】
1. 状況の理解
2. 分析結果
3. 具体的な提案（3〜5点）
4. 次のステップ
```

#### User Prompt

```
{{code_1.formatted_context}}

【ユーザーの質問】
{{start.user_question}}

上記の情報をもとに、{{code_1.company_name}}の{{code_1.user_name}}様に対して、
専門的なコンサルティングを提供してください。
```

#### 出力変数

`text` - LLMが生成したコンサルティング内容

---

### ノード5: Answer（回答）

#### 設定

| 項目 | 設定値 |
|------|--------|
| **Answer** | `{{llm_1.text}}` |

#### 追加の出力変数

| 変数名 | 値 |
|--------|-----|
| `company_name` | `{{code_1.company_name}}` |
| `user_name` | `{{code_1.user_name}}` |
| `has_history` | `{{code_1.has_history}}` |

---

## 🔗 ノード接続（Edges）

```
Start → HTTP Request
HTTP Request → Code
Code → LLM
LLM → Answer
```

---

## 🔐 環境変数

### Difyで設定が必要な環境変数

| 変数名 | 説明 | 設定例 |
|--------|------|--------|
| `DIFY_API_KEY` | Next.js APIとの認証用キー（32文字以上推奨） | `openssl rand -base64 32` で生成 |

### 設定方法

1. Dify管理画面 → **Settings** → **Environment Variables**
2. **Add Variable** をクリック
3. Key: `DIFY_API_KEY`
4. Value: Next.jsの`.env.local`と同じ値を設定

---

## 🚀 セットアップ手順

### Step 1: Next.jsアプリのデプロイ

```bash
# 環境変数設定
echo "DIFY_API_KEY=$(openssl rand -base64 32)" >> .env.local

# デプロイ
git add .
git commit -m "feat: Add Dify integration API"
git push
```

### Step 2: Difyワークフロー作成

1. Dify → **Studio** → **Create Workflow**
2. 名前: `AIコンサルティング`
3. タイプ: **Chatflow**

### Step 3: 各ノードを設定

上記の「ノード詳細設定」に従って、5つのノードを追加・設定

### Step 4: URLを本番環境に変更

HTTP Requestノードの**URL**を本番環境のURLに変更:
```
https://your-actual-domain.vercel.app/api/dify/context
```

### Step 5: 環境変数を設定

Difyの環境変数に`DIFY_API_KEY`を追加

### Step 6: テスト実行

Debug画面で以下を入力してテスト:

```json
{
  "user_id": "実際のSupabase auth.usersのUUID",
  "is_new_case": true,
  "user_question": "AIを活用した業務効率化について相談したいです"
}
```

---

## 🧪 テストケース

### テストケース1: 新規案件

**入力:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_new_case": true,
  "user_question": "AIを活用した業務効率化について相談したいです"
}
```

**期待結果:**
- 会社情報が表示される
- プロフィール情報が表示される
- 会話履歴は表示されない（新規案件のため）
- AIからの初期提案が生成される

---

### テストケース2: 継続案件

**入力:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_new_case": false,
  "user_question": "前回提案いただいた内容の進捗を報告します"
}
```

**期待結果:**
- 会社情報が表示される
- プロフィール情報が表示される
- **会話履歴が表示される**（継続案件のため）
- 過去の文脈を踏まえた提案が生成される

---

## ⚠️ 重要な注意事項

### 1. 変数参照構文の違い

Difyのバージョンによって構文が異なる可能性があります：

| 構文 | 使用例 |
|------|--------|
| **新しい構文** | `{{env.DIFY_API_KEY}}` |
| **古い構文** | `{{#sys.env.DIFY_API_KEY#}}` |

**確認方法**: Difyの実際の画面で他のノードの変数参照を確認

---

### 2. LLMノードの出力変数

LLMノードの出力は通常 `text` です：

```
{{llm_1.text}}  ← 正しい
{{llm_1.consultation_result}}  ← カスタム設定の場合
```

---

### 3. エラーハンドリング

Codeノードでエラーチェックを実装しているため、以下の場合も安全に動作：

- APIが失敗した場合
- データが不完全な場合
- 外部キーがNULLの場合

---

## 🐛 トラブルシューティング

### Q1: "Unauthorized" エラー

**原因**: APIキーの不一致

**解決策**:
1. `.env.local`の`DIFY_API_KEY`を確認
2. Dify環境変数と同じ値か確認
3. Vercelの環境変数も確認（本番の場合）

---

### Q2: "User not found" エラー

**原因**: 存在しないユーザーIDを指定

**解決策**:
1. Supabase Dashboard → Authentication → Users
2. 実際のUUIDをコピー
3. Difyテストで正しいIDを使用

---

### Q3: データが空で返る

**原因**: プロフィールに`company_id`が設定されていない

**解決策**:
1. Supabase → Table Editor → `profiles`
2. 該当ユーザーの`company_id`を確認
3. NULLの場合は、会社IDを設定

---

### Q4: コンテキストが整形されない

**原因**: Codeノードのコードにエラーがある

**解決策**:
1. Dify Debug画面でエラーメッセージ確認
2. `console.log()`を追加してデバッグ
3. 上記のコード例をそのままコピー

---

## 📚 関連ドキュメント

- [クイックスタートガイド](./QUICK_START.md)
- [詳細実装ガイド](./dify-supabase-integration.md)
- [コード例集](./DIFY_CODE_EXAMPLES.md)
- [セットアップチェックリスト](./DIFY_SETUP_CHECKLIST.md)
- [統合サマリー](./DIFY_INTEGRATION_SUMMARY.md)

---

## 📄 JSONエクスポート

このワークフロー設定のJSON版: [`dify-workflow-example.json`](./dify-workflow-example.json)

Difyへのインポート方法:
1. Dify → Studio → Import Workflow
2. `dify-workflow-example.json`を選択
3. 設定を確認して保存

---

**作成日**: 2026-01-05  
**バージョン**: 2.0.0  
**ステータス**: ✅ 動作確認済み
