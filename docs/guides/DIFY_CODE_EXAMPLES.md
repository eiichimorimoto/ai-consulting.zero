# Dify × Supabase 連携 - 修正済みコード例集

**最終更新**: 2026-01-05  
**バージョン**: 2.0（ファクトチェック後修正版）

---

## 📌 重要な修正点

### 1. Supabaseクライアント作成

```typescript
// ❌ 修正前（動作しない）
const supabase = createClient()

// ✅ 修正後（正しい）
const supabase = await createClient()
```

**理由**: `createClient()`は非同期関数（`async`）のため、`await`が必須

---

### 2. ネストクエリの外部キー指定

```typescript
// ❌ 修正前（曖昧）
.select('*, companies(*)')

// ✅ 修正後（明示的）
.select(`
  *,
  companies:company_id (*)
`)
```

**理由**: 外部キー名を明示することで、PostgRESTが正確にJOINを実行

---

### 3. 逆方向のリレーション

```typescript
// ❌ 修正前
.select('*, consulting_messages(*)')

// ✅ 修正後（関係名を明示）
.select(`
  *,
  consulting_messages!session_id (*)
`)
```

**理由**: `!session_id`で外部キーを明示（子テーブルから親を参照）

---

## 🔧 完全なAPIエンドポイント実装

### `/app/api/dify/context/route.ts`

```typescript
/**
 * Dify Context API（修正済み最終版）
 * 
 * 修正内容:
 * 1. await createClient() に修正
 * 2. 外部キー名を明示的に指定
 * 3. エラーハンドリング強化
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// 型定義（省略 - route.tsを参照）

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, isNewCase = true } = body

    // バリデーション
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    // APIキー認証
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.DIFY_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ✅ 修正: await追加
    const supabase = await createClient()

    const baseContext = await getBaseContext(supabase, userId)
    if (!baseContext) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

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
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      },
      { status: 500 }
    )
  }
}
```

---

## 📊 基本情報取得（修正版）

```typescript
async function getBaseContext(supabase: any, userId: string) {
  try {
    // ✅ 修正: 外部キー名を明示
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        name,
        position,
        department,
        email,
        phone,
        company_id,
        companies:company_id (
          name,
          industry,
          employee_count,
          annual_revenue,
          business_description,
          current_challenges,
          growth_stage,
          it_maturity_level
        )
      `)
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return null
    }

    // Web情報取得
    let webResources = []
    if (profile.company_id) {
      const { data: webData } = await supabase
        .from('company_web_resources')
        .select('title, description, url, relevance_score')
        .eq('company_id', profile.company_id)
        .order('relevance_score', { ascending: false })
        .limit(5)

      webResources = webData || []
    }

    // 名刺情報取得
    const { data: cardsData } = await supabase
      .from('business_cards')
      .select('person_name, company_name, position, email, phone')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    return {
      profile: {
        name: profile.name,
        position: profile.position,
        department: profile.department,
        email: profile.email,
        phone: profile.phone
      },
      company: profile.companies || {
        name: '',
        industry: null,
        employee_count: null,
        annual_revenue: null,
        business_description: null,
        current_challenges: null,
        growth_stage: null,
        it_maturity_level: null
      },
      webResources,
      businessCards: cardsData || []
    }
  } catch (error) {
    console.error('Error in getBaseContext:', error)
    throw error
  }
}
```

---

## 💬 会話履歴取得（修正版）

```typescript
async function getConversationHistory(
  supabase: any, 
  userId: string
): Promise<ConversationHistoryContext | null> {
  try {
    // ✅ 修正: !session_id で外部キーを明示
    const { data: sessions } = await supabase
      .from('consulting_sessions')
      .select(`
        id,
        title,
        analysis_summary,
        key_insights,
        recommendations,
        consulting_messages!session_id (
          role,
          content,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (!sessions || sessions.length === 0) {
      return null
    }

    const session = sessions[0]

    // 直近10件のメッセージを取得
    const recentMessages = (session.consulting_messages || [])
      .slice(-10)
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at
      }))

    // 過去のレポート取得
    const { data: reports } = await supabase
      .from('reports')
      .select('id, title, report_type, executive_summary, score, created_at')
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
      recentMessages,
      reports: reports || []
    }
  } catch (error) {
    console.error('Error in getConversationHistory:', error)
    return null
  }
}
```

---

## 🔍 Supabaseクエリ構文リファレンス

### 1. 単純なJOIN（外部キー: company_id）

```typescript
// profiles → companies
.select(`
  *,
  companies:company_id (
    name,
    industry
  )
`)
```

### 2. 逆方向のリレーション（子から親）

```typescript
// consulting_sessions → consulting_messages
.select(`
  *,
  consulting_messages!session_id (
    role,
    content
  )
`)
```

**ポイント**: `!session_id` は「session_idという外部キーを使って参照」という意味

### 3. 複数のJOIN

```typescript
.select(`
  *,
  companies:company_id (
    name,
    industry
  ),
  business_cards (
    person_name,
    position
  )
`)
```

### 4. ネストされたJOIN

```typescript
.select(`
  *,
  companies:company_id (
    name,
    company_web_resources (
      url,
      title
    )
  )
`)
```

---

## 🧪 テスト用cURLコマンド

### ローカルテスト

```bash
# 新規案件テスト
curl -X POST http://localhost:3000/api/dify/context \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "isNewCase": true
  }' | jq

# 継続案件テスト
curl -X POST http://localhost:3000/api/dify/context \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "isNewCase": false
  }' | jq

# Health Check
curl http://localhost:3000/api/dify/context | jq
```

### 本番環境テスト

```bash
curl -X POST https://your-domain.vercel.app/api/dify/context \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -d '{
    "userId": "actual-user-id",
    "isNewCase": true
  }' | jq
```

---

## ⚠️ よくあるエラーと対処法

### エラー1: "Cannot read property 'from' of undefined"

**原因**: `await createClient()` を忘れている

```typescript
// ❌ 間違い
const supabase = createClient()

// ✅ 正しい
const supabase = await createClient()
```

---

### エラー2: "relation does not exist"

**原因**: テーブル名のスペルミスまたは外部キー名の誤り

```typescript
// ❌ 間違い
.select('*, company(*)')  // テーブル名が単数形

// ✅ 正しい
.select('*, companies:company_id(*)')
```

---

### エラー3: "Multiple rows returned"

**原因**: `.single()` を使っているが複数行が返される

```typescript
// ❌ 問題のあるコード
.select('*')
.eq('user_id', userId)
.single()  // user_idで複数のレコードがある場合エラー

// ✅ 修正方法1: LIMIT 1を使う
.select('*')
.eq('user_id', userId)
.order('created_at', { ascending: false })
.limit(1)
.single()

// ✅ 修正方法2: UNIQUEキーを使う
.select('*')
.eq('id', uniqueId)  // idはPRIMARY KEY
.single()
```

---

### エラー4: "null is not an object"

**原因**: JOINしたテーブルのデータがNULL（外部キーがNULL）

```typescript
// ✅ Null安全なアクセス
const companyName = profile.companies?.name || 'Not Set'
const industry = profile.companies?.industry ?? 'Unknown'
```

---

## 📝 チェックリスト

実装時に以下を確認してください：

- [ ] `await createClient()` を使用している
- [ ] 外部キー名を明示的に指定している（`companies:company_id`）
- [ ] 逆方向のリレーションで `!` を使用している（`consulting_messages!session_id`）
- [ ] Null安全なアクセス（`?.` または `??`）を使用している
- [ ] エラーハンドリングを実装している
- [ ] APIキー認証を実装している
- [ ] TypeScriptのエラーがない（`npm run build`）

---

## 🔗 関連ドキュメント

- [実装ガイド](./dify-supabase-integration.md)
- [セットアップチェックリスト](./DIFY_SETUP_CHECKLIST.md)
- [ファクトチェック報告書](./FACT_CHECK_REPORT.md)
- [統合サマリー](./DIFY_INTEGRATION_SUMMARY.md)

---

**作成日**: 2026-01-05  
**バージョン**: 2.0（修正版）  
**ステータス**: ✅ 修正完了・テスト準備完了
