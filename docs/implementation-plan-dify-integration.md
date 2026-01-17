# Dify統合実装計画書

> **作成日**: 2026-01-17  
> **バージョン**: 1.0  
> **ステータス**: スキーマ更新完了 → 実装フェーズ準備中

---

## 🎉 スキーマ更新完了

Supabaseのスキーマ更新が完了しました。以下のテーブルが準備されています：

- ✅ `consulting_sessions` - 相談セッション管理
- ✅ `consulting_messages` - メッセージ履歴
- ✅ `reports` - 提案書データ
- ✅ `shared_proposals` - 共有リンク管理

---

## 📊 スキーマ更新完了の確認

以下のSQLで、正しく更新されたか確認してください。

```sql
-- ================================================
-- 1. consulting_sessions の新フィールド確認
-- ================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'consulting_sessions' 
  AND column_name IN ('category', 'max_rounds', 'current_round', 'completed_at')
ORDER BY ordinal_position;

-- ================================================
-- 2. consulting_messages の新フィールド確認
-- ================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'consulting_messages' 
  AND column_name IN ('message_order', 'tokens_used', 'processing_time_ms')
ORDER BY ordinal_position;

-- ================================================
-- 3. reports の新フィールド確認
-- ================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reports' 
  AND column_name IN ('content_markdown', 'framework_used', 'version', 'parent_report_id')
ORDER BY ordinal_position;

-- ================================================
-- 4. shared_proposals テーブルの確認
-- ================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'shared_proposals'
ORDER BY ordinal_position;

-- ================================================
-- 5. インデックスの確認
-- ================================================
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('consulting_sessions', 'consulting_messages', 'reports', 'shared_proposals')
ORDER BY tablename, indexname;

-- ================================================
-- 6. RLSポリシーの確認
-- ================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('consulting_sessions', 'consulting_messages', 'reports', 'shared_proposals')
ORDER BY tablename, policyname;
```

---

## 🎯 実装フェーズ

スキーマが整ったので、これから以下の順番で実装を進めます。

---

## **Phase 1: TypeScript型定義の生成（推奨）**

### **目的**
- Supabaseの実際のスキーマに基づいた型定義を自動生成
- TypeScriptでの開発時に型安全性を確保

### **手順**

#### **オプションA: Supabase CLI（推奨）**

```bash
# 1. Supabase CLIのインストール（未インストールの場合）
npm install -g supabase

# 2. プロジェクトにリンク
supabase link --project-ref YOUR_PROJECT_REF

# 3. 型定義を生成
supabase gen types typescript --linked > types/database.types.ts
```

#### **オプションB: オンラインツール**

1. [Supabase Schema to TypeScript Generator](https://supabase.com/docs/guides/api/rest/generating-types)を使用
2. プロジェクトのAPI設定からJWT Secretを取得
3. 型定義をコピー

---

## **Phase 2: API Route実装**

### **必要なAPIエンドポイント**

#### **1. 相談セッション管理**

```typescript
// app/api/consulting/sessions/route.ts
// GET: 相談セッション一覧取得
// POST: 新規相談セッション作成

// app/api/consulting/sessions/[id]/route.ts
// GET: 特定セッション取得
// PATCH: セッション更新（status, current_roundなど）
// DELETE: セッション削除
```

**実装詳細:**

```typescript
// GET /api/consulting/sessions
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('consulting_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: data })
}

// POST /api/consulting/sessions
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, category, initial_message } = body

  // セッション作成
  const { data: session, error: sessionError } = await supabase
    .from('consulting_sessions')
    .insert({
      user_id: user.id,
      company_id: user.user_metadata?.company_id,
      title: title || '新規相談',
      category: category || 'general',
      status: 'active',
      max_rounds: 5,
      current_round: 0
    })
    .select()
    .single()

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  // 初期メッセージ保存
  if (initial_message) {
    await supabase
      .from('consulting_messages')
      .insert({
        session_id: session.id,
        role: 'user',
        content: initial_message,
        message_order: 1
      })
  }

  return NextResponse.json({ session })
}
```

#### **2. メッセージ送受信**

```typescript
// app/api/consulting/sessions/[id]/messages/route.ts
// GET: セッションのメッセージ履歴取得
// POST: ユーザーメッセージ送信 + Dify呼び出し
```

**実装詳細:**

```typescript
// GET /api/consulting/sessions/[id]/messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // セッション所有確認
  const { data: session } = await supabase
    .from('consulting_sessions')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // メッセージ取得
  const { data: messages, error } = await supabase
    .from('consulting_messages')
    .select('*')
    .eq('session_id', params.id)
    .order('message_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages })
}

// POST /api/consulting/sessions/[id]/messages
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message } = await request.json()

  // 1. ユーザーメッセージ保存
  const { data: userMessage, error: userError } = await supabase
    .from('consulting_messages')
    .insert({
      session_id: params.id,
      role: 'user',
      content: message,
      message_order: await getNextMessageOrder(supabase, params.id)
    })
    .select()
    .single()

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  // 2. Difyにメッセージ送信
  const difyResponse = await fetch('/api/dify/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: params.id,
      message,
      userId: user.id
    })
  })

  const difyData = await difyResponse.json()

  // 3. AIレスポンス保存
  const { data: aiMessage, error: aiError } = await supabase
    .from('consulting_messages')
    .insert({
      session_id: params.id,
      role: 'assistant',
      content: difyData.response,
      message_order: await getNextMessageOrder(supabase, params.id),
      tokens_used: difyData.tokens_used,
      processing_time_ms: difyData.processing_time
    })
    .select()
    .single()

  if (aiError) {
    return NextResponse.json({ error: aiError.message }, { status: 500 })
  }

  // 4. セッションのcurrent_roundを更新
  await supabase
    .from('consulting_sessions')
    .update({ 
      current_round: await getCurrentRound(supabase, params.id),
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)

  return NextResponse.json({ 
    userMessage, 
    aiMessage 
  })
}
```

#### **3. Dify連携**

```typescript
// app/api/dify/chat/route.ts
// POST: Difyにメッセージ送信（ストリーミング対応）

// app/api/dify/context/route.ts
// POST: Difyに初期コンテキスト送信
```

**実装詳細:**

```typescript
// POST /api/dify/chat
export async function POST(request: NextRequest) {
  const { sessionId, message, userId } = await request.json()

  // 1. コンテキスト準備
  const context = await prepareDifyContext(sessionId, userId)

  // 2. Dify APIに送信
  const difyApiKey = process.env.DIFY_API_KEY
  const difyApiUrl = process.env.DIFY_WORKFLOW_URL

  const startTime = Date.now()

  const response = await fetch(difyApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${difyApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: {
        user_message: message,
        context: JSON.stringify(context)
      },
      user: userId,
      response_mode: 'blocking' // または 'streaming'
    })
  })

  const data = await response.json()
  const processingTime = Date.now() - startTime

  return NextResponse.json({
    response: data.data.outputs.response,
    tokens_used: data.metadata?.usage?.total_tokens || 0,
    processing_time: processingTime
  })
}
```

#### **4. 提案書生成**

```typescript
// app/api/reports/generate/route.ts
// POST: 提案書生成（非同期処理）

// app/api/reports/[id]/route.ts
// GET: 提案書取得
// PATCH: 提案書更新

// app/api/reports/[id]/pdf/route.ts
// POST: PDF生成

// app/api/reports/[id]/share/route.ts
// POST: 共有リンク生成
// GET: 共有リンク情報取得
```

---

## **Phase 3: フロントエンド実装**

### **必要なページ・コンポーネント**

#### **1. 相談開始ページ**

```
/consulting/start
├── 新規相談フォーム
│   ├── 課題入力（テキスト・音声）
│   ├── カテゴリ選択（オプション）
│   └── 送信ボタン
└── 既存相談一覧
    ├── 相談カード（タイトル、カテゴリ、ステータス）
    └── 続きから開始ボタン
```

**実装例:**

```tsx
// app/consulting/start/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConsultingStartPage() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('general')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/consulting/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: message.slice(0, 50) + '...',
          category,
          initial_message: message
        })
      })

      const data = await response.json()

      if (data.session) {
        router.push(`/consulting/sessions/${data.session.id}`)
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI経営相談を始める</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            相談したい課題を入力してください
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 border rounded-lg"
            rows={5}
            placeholder="例: 売上が伸び悩んでいます。新規顧客の獲得方法について相談したいです。"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            カテゴリ（オプション）
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 border rounded-lg"
          >
            <option value="general">一般相談</option>
            <option value="sales">営業・販売</option>
            <option value="marketing">マーケティング</option>
            <option value="finance">財務・経理</option>
            <option value="hr">人事・組織</option>
            <option value="it">IT・デジタル</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? '相談を開始中...' : '相談を始める'}
        </button>
      </form>
    </div>
  )
}
```

#### **2. チャット画面**

```
/consulting/sessions/[id]
├── ヘッダー
│   ├── セッションタイトル
│   ├── 往復回数インジケーター（3/5回）
│   └── 終了ボタン
├── メッセージ履歴
│   ├── 過去ログ（折りたたみ表示）
│   └── 現在の会話
├── 入力エリア
│   ├── テキスト入力
│   ├── 音声入力ボタン
│   └── 送信ボタン
└── サイドバー（オプション）
    ├── 会社情報
    └── 既存分析結果
```

**実装例:**

```tsx
// app/consulting/sessions/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Session {
  id: string
  title: string
  current_round: number
  max_rounds: number
  status: string
}

export default function ConsultingSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchSession()
    fetchMessages()
  }, [sessionId])

  const fetchSession = async () => {
    const response = await fetch(`/api/consulting/sessions/${sessionId}`)
    const data = await response.json()
    setSession(data.session)
  }

  const fetchMessages = async () => {
    const response = await fetch(`/api/consulting/sessions/${sessionId}/messages`)
    const data = await response.json()
    setMessages(data.messages)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/consulting/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage })
      })

      const data = await response.json()

      setMessages([...messages, data.userMessage, data.aiMessage])
      setInputMessage('')
      
      // セッション情報を更新
      fetchSession()

      // 往復回数上限に達したら提案書生成
      if (session && session.current_round >= session.max_rounds) {
        router.push(`/consulting/sessions/${sessionId}/complete`)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen">
      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white border-b p-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">{session?.title}</h1>
            <p className="text-sm text-gray-600">
              往復: {session?.current_round}/{session?.max_rounds}回
            </p>
          </div>
          <button
            onClick={() => router.push('/consulting/start')}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            終了
          </button>
        </div>

        {/* メッセージ履歴 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs mt-2 opacity-70">
                  {new Date(msg.created_at).toLocaleTimeString('ja-JP')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 入力エリア */}
        <form onSubmit={handleSendMessage} className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="メッセージを入力..."
              className="flex-1 p-3 border rounded-lg"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? '送信中...' : '送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

#### **3. 提案書表示ページ**

```
/reports/[id]
├── 提案書プレビュー（Markdown表示）
├── アクションボタン
│   ├── PDFダウンロード
│   ├── 印刷
│   ├── 共有リンク生成
│   └── 再生成オプション
└── 次のアクション
    ├── 新しい相談を始める
    ├── 追加で相談する
    └── ダッシュボードに戻る
```

---

## **Phase 4: Dify連携ロジック**

### **実装すべき機能**

#### **1. コンテキスト準備**

```typescript
// utils/dify/prepareContext.ts
export async function prepareDifyContext(
  sessionId: string,
  userId: string
): Promise<DifyContext> {
  const supabase = await createClient()

  // 1. セッション情報取得
  const { data: session } = await supabase
    .from('consulting_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  // 2. ユーザー・会社情報取得
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      companies (*)
    `)
    .eq('user_id', userId)
    .single()

  // 3. 初期診断結果取得
  const { data: diagnoses } = await supabase
    .from('diagnosis_previews')
    .select('*')
    .eq('email', profile.email)
    .order('created_at', { ascending: false })
    .limit(1)

  // 4. 既存セッションの場合、会話履歴取得
  const { data: messages } = await supabase
    .from('consulting_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('message_order', { ascending: true })

  // 5. コンテキストJSONを構築
  return {
    session: {
      id: session.id,
      category: session.category,
      current_round: session.current_round,
      max_rounds: session.max_rounds
    },
    user: {
      name: profile.name,
      company: profile.companies.name,
      industry: profile.companies.industry
    },
    previous_diagnosis: diagnoses?.[0] || null,
    conversation_history: messages.map(m => ({
      role: m.role,
      content: m.content
    }))
  }
}
```

#### **2. ストリーミングレスポンス処理**

```typescript
// utils/dify/streamResponse.ts
export async function streamDifyResponse(
  message: string,
  context: DifyContext,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string) => void
): Promise<void> {
  const difyApiKey = process.env.DIFY_API_KEY
  const difyApiUrl = process.env.DIFY_WORKFLOW_URL

  const response = await fetch(difyApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${difyApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: {
        user_message: message,
        context: JSON.stringify(context)
      },
      response_mode: 'streaming'
    })
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullResponse = ''

  while (true) {
    const { done, value } = await reader!.read()
    if (done) break

    const chunk = decoder.decode(value)
    fullResponse += chunk
    onChunk(chunk)
  }

  onComplete(fullResponse)
}
```

#### **3. セッション管理**

```typescript
// utils/consulting/sessionManager.ts
export class ConsultingSessionManager {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // 自動保存（5秒ごと）
  async autoSave(sessionId: string, draft: Draft): Promise<void> {
    await this.supabase
      .from('consulting_sessions')
      .update({
        analysis_summary: draft.summary,
        key_insights: draft.insights,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
  }
  
  // セッション再開
  async resume(sessionId: string): Promise<Session> {
    const { data, error } = await this.supabase
      .from('consulting_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) throw error
    return data
  }
  
  // セッション完了
  async complete(sessionId: string): Promise<void> {
    await this.supabase
      .from('consulting_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)
  }
  
  // 往復回数チェック
  checkRoundLimit(session: Session): {
    canContinue: boolean
    remainingRounds: number
    needsExtension: boolean
  } {
    const remaining = session.max_rounds - session.current_round
    return {
      canContinue: remaining > 0,
      remainingRounds: remaining,
      needsExtension: remaining === 0
    }
  }
}
```

---

## **Phase 5: PDF生成**

### **実装方法**

#### **オプションA: Puppeteer（サーバーサイド）**

```typescript
// utils/pdf/generator.ts
import puppeteer from 'puppeteer'
import { marked } from 'marked'

export async function generatePDF(
  markdownContent: string,
  reportId: string
): Promise<string> {
  // 1. MarkdownをHTMLに変換
  const htmlContent = marked(markdownContent)

  // 2. カスタムCSSを適用
  const styledHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Noto Sans JP', sans-serif;
            line-height: 1.8;
            padding: 40px;
          }
          h1 { color: #1e3a8a; border-bottom: 3px solid #1e3a8a; }
          h2 { color: #2563eb; margin-top: 30px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f3f4f6; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `

  // 3. Puppeteerで起動
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setContent(styledHtml)

  // 4. PDF生成
  const pdfBuffer = await page.pdf({
    format: 'A4',
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
  })

  await browser.close()

  // 5. Supabase Storageにアップロード
  const supabase = await createClient()
  const fileName = `reports/${reportId}.pdf`
  
  const { data, error } = await supabase.storage
    .from('reports')
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    })

  if (error) throw error

  // 6. URLを返却
  const { data: { publicUrl } } = supabase.storage
    .from('reports')
    .getPublicUrl(fileName)

  return publicUrl
}
```

#### **オプションB: jsPDF（クライアントサイド）**

```typescript
// utils/pdf/clientGenerator.ts
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function generateClientPDF(
  elementId: string
): Promise<Blob> {
  // 1. DOM要素をキャプチャ
  const element = document.getElementById(elementId)
  if (!element) throw new Error('Element not found')

  const canvas = await html2canvas(element)
  const imgData = canvas.toDataURL('image/png')

  // 2. PDFに変換
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const imgWidth = 210 // A4幅
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

  // 3. Blobを返却
  return pdf.output('blob')
}
```

---

## **実装の優先順位**

### **フェーズ1（最優先）: 基本フロー**

1. **型定義生成**（5分）
2. **API Route: セッション作成・取得**（30分）
3. **フロントエンド: 相談開始ページ**（1時間）
4. **API Route: メッセージ送受信**（1時間）
5. **フロントエンド: チャット画面**（2時間）
6. **Dify連携: 基本的な送受信**（1時間）

**合計: 約6時間**

### **フェーズ2: 提案書生成**

1. **API Route: 提案書生成**（1時間）
2. **Markdown生成ロジック**（1時間）
3. **PDF生成実装**（2時間）
4. **フロントエンド: 提案書表示**（1時間）

**合計: 約5時間**

### **フェーズ3: 高度な機能**

1. **セッション中断・再開**（1時間）
2. **往復回数管理・延長**（1時間）
3. **提案書再生成**（1時間）
4. **共有リンク機能**（1時間）

**合計: 約4時間**

---

## **次に進むステップ**

### **オプション1: 型定義生成から開始**
→ TypeScriptの型安全性を確保してから実装

### **オプション2: APIルートから実装**
→ バックエンドロジックを先に固める

### **オプション3: フロントエンドから実装**
→ UI/UXを先に作り、モックデータで動作確認

### **オプション4: Dify連携から実装**
→ AIとの連携部分を先に検証

---

## **推奨開発フロー**

まずは**型定義生成 → APIルート実装 → フロントエンド実装**の順番が効率的です。

### **Day 1: 基盤構築**
1. 型定義生成
2. API Route: セッション管理
3. API Route: メッセージ管理

### **Day 2: フロントエンド構築**
1. 相談開始ページ
2. チャット画面

### **Day 3: Dify連携**
1. コンテキスト準備
2. メッセージ送受信
3. ストリーミング対応

### **Day 4-5: 提案書生成**
1. 提案書生成API
2. PDF生成
3. 提案書表示ページ

---

## **技術スタック**

- **フロントエンド**: Next.js 16, React, TypeScript
- **バックエンド**: Next.js API Routes, Supabase
- **AI**: Dify (Anthropic Claude)
- **PDF生成**: Puppeteer または jsPDF
- **ストレージ**: Supabase Storage

---

## **完了条件**

- [ ] 型定義生成完了
- [ ] API Routes実装完了
- [ ] フロントエンド実装完了
- [ ] Dify連携実装完了
- [ ] PDF生成実装完了
- [ ] テスト完了
- [ ] ドキュメント整備完了
- [ ] 本番デプロイ完了

---

**最終更新**: 2026-01-17  
**次回更新**: 実装開始時
