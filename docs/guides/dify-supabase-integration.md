# Dify × Supabase 連携設計ガイド

## 目次
1. [連携パターンの選択](#連携パターンの選択)
2. [パターン1: API連携（推奨）](#パターン1-api連携推奨)
3. [パターン2: ナレッジベース連携](#パターン2-ナレッジベース連携)
4. [パターン3: Webhook連携](#パターン3-webhook連携)
5. [実装手順](#実装手順)

---

## 連携パターンの選択

| パターン | メリット | デメリット | 推奨度 |
|---------|---------|-----------|--------|
| **API連携** | リアルタイム、柔軟 | 開発必要 | ⭐⭐⭐ |
| **ナレッジベース** | セットアップ簡単 | 更新頻度制限 | ⭐⭐ |
| **Webhook** | イベント駆動 | 複雑 | ⭐ |

---

## パターン1: API連携（推奨）

### アーキテクチャ

```
[Dify Workflow]
    ↓ (HTTP Request)
[Next.js API Route: /api/dify/context]
    ↓ (Query)
[Supabase Database]
```

### 実装ステップ

#### Step 1: Next.js APIエンドポイント作成

```typescript
// app/api/dify/context/route.ts

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, isNewCase } = await request.json()
    
    // 認証チェック（Dify用APIキー）
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.DIFY_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // 1. 基本情報取得（新規・継続共通）
    const baseContext = await getBaseContext(supabase, userId)

    // 2. 継続案件の場合は会話履歴も取得
    const conversationHistory = isNewCase 
      ? null 
      : await getConversationHistory(supabase, userId)

    return NextResponse.json({
      success: true,
      data: {
        ...baseContext,
        conversationHistory
      }
    })
  } catch (error) {
    console.error('Dify context API error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// 基本情報取得
async function getBaseContext(supabase: any, userId: string) {
  // プロフィール取得
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      companies:company_id (*),
      business_cards (*)
    `)
    .eq('user_id', userId)
    .single()

  // Web情報取得
  const { data: webResources } = await supabase
    .from('company_web_resources')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('relevance_score', { ascending: false })
    .limit(5)

  return {
    profile: {
      name: profile.name,
      position: profile.position,
      department: profile.department,
      email: profile.email
    },
    company: profile.companies || {},
    webResources: webResources || [],
    businessCards: profile.business_cards || []
  }
}

// 会話履歴取得
async function getConversationHistory(supabase: any, userId: string) {
  // 最新のアクティブセッション取得
  const { data: sessions } = await supabase
    .from('consulting_sessions')
    .select(`
      *,
      consulting_messages!session_id (*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)

  if (!sessions || sessions.length === 0) return null

  const session = sessions[0]

  // 過去のレポート取得
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3)

  return {
    session: {
      id: session.id,
      title: session.title,
      summary: session.analysis_summary,
      insights: session.key_insights,
      recommendations: session.recommendations
    },
    messages: session.consulting_messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at
    })),
    reports: reports || []
  }
}
```

#### Step 2: Difyワークフロー設定

##### 🔹 変数設定（開始ノード）

```json
{
  "user_id": "{{user_id}}",
  "is_new_case": true  // または false
}
```

##### 🔹 HTTP Requestノード設定

| 項目 | 設定値 |
|------|--------|
| Method | POST |
| URL | `https://your-domain.com/api/dify/context` |
| Headers | `x-api-key: YOUR_DIFY_API_KEY` |
| Body | `{"userId": "{{user_id}}", "isNewCase": {{is_new_case}}}` |
| Output Variable | `context_data` |

##### 🔹 LLMノード設定（プロンプト例）

```
あなたはAIコンサルタントです。以下のクライアント情報を基に対応してください。

【クライアント情報】
名前: {{context_data.profile.name}}
役職: {{context_data.profile.position}}
部署: {{context_data.profile.department}}

【会社情報】
会社名: {{context_data.company.name}}
業種: {{context_data.company.industry}}
従業員数: {{context_data.company.employee_count}}
現在の課題: {{context_data.company.current_challenges}}

【外部情報】
{{#each context_data.webResources}}
- {{this.title}}: {{this.description}}
{{/each}}

{% if context_data.conversationHistory %}
【過去の相談履歴】
セッションタイトル: {{context_data.conversationHistory.session.title}}
前回の提案: {{context_data.conversationHistory.session.recommendations}}

【過去の会話（直近5件）】
{{#each context_data.conversationHistory.messages}}
{{this.role}}: {{this.content}}
{{/each}}
{% endif %}

ユーザーの質問: {{user_input}}
```

---

## パターン2: ナレッジベース連携

### 設定手順

#### Step 1: データエクスポート

```sql
-- 会社情報をJSON形式でエクスポート
SELECT 
  c.name as "会社名",
  c.industry as "業種",
  c.employee_count as "従業員数",
  c.business_description as "事業内容",
  c.current_challenges as "現在の課題",
  p.name as "担当者名",
  p.position as "役職"
FROM companies c
LEFT JOIN profiles p ON c.id = p.company_id
WHERE c.id = 'YOUR_COMPANY_ID';
```

#### Step 2: Difyナレッジベース設定

1. Dify管理画面 → Knowledge → Create Knowledge
2. データをテキスト形式で貼り付け
3. Chunk Strategy: `Automatic`
4. Embedding Model: `text-embedding-3-small` (推奨)

⚠️ **制限事項**
- 手動更新が必要（リアルタイム同期なし）
- 大量データには不向き

---

## パターン3: Webhook連携

### 使用シーン
- Difyから会話データをSupabaseに保存
- セッション終了時に自動レポート生成

### 実装例

```typescript
// app/api/dify/webhook/route.ts

export async function POST(request: NextRequest) {
  const { sessionId, messages, analysis } = await request.json()
  
  const supabase = createClient()
  
  // 会話履歴を保存
  await supabase.from('consulting_messages').insert(
    messages.map(msg => ({
      session_id: sessionId,
      role: msg.role,
      content: msg.content
    }))
  )
  
  // 分析結果を保存
  await supabase.from('consulting_sessions').update({
    analysis_summary: analysis.summary,
    key_insights: analysis.insights
  }).eq('id', sessionId)
  
  return NextResponse.json({ success: true })
}
```

---

## 実装手順

### Phase 1: 準備（1日）

- [ ] APIエンドポイント作成
- [ ] 環境変数設定（`DIFY_API_KEY`）
- [ ] ローカルテスト

### Phase 2: Dify設定（1日）

- [ ] ワークフロー作成
- [ ] HTTP Requestノード設定
- [ ] プロンプト調整

### Phase 3: テスト（1日）

- [ ] 新規案件フロー検証
- [ ] 継続案件フロー検証
- [ ] エラーハンドリング確認

### Phase 4: 本番適用（0.5日）

- [ ] 本番環境デプロイ
- [ ] Difyワークフロー公開
- [ ] モニタリング設定

---

## セキュリティチェックリスト

- [ ] APIキー認証実装
- [ ] Supabase RLS有効化確認
- [ ] ユーザーID検証
- [ ] レート制限設定
- [ ] エラーログ監視

---

## トラブルシューティング

| 問題 | 原因 | 解決策 |
|------|------|--------|
| 401 Unauthorized | APIキー不一致 | 環境変数を確認 |
| 500 Server Error | SQL構文エラー | ログを確認 |
| タイムアウト | データ量多すぎ | LIMIT追加 |

---

## 参考リンク

- [Dify HTTP Request Node](https://docs.dify.ai/guides/workflow/node/http-request)
- [Supabase REST API](https://supabase.com/docs/guides/api)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
