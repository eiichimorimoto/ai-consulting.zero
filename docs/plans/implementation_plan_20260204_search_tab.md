# 📝 Implementation Plan: SearchTab本格実装

**日付**: 2026-02-04  
**機能名**: Start画面右パネル「検索」タブの本格実装

---

## プロジェクト構造

```
app/
├── api/
│   └── consulting/
│       └── search/
│           ├── route.ts          # 新規: Web検索API
│           └── summarize/
│               └── route.ts      # 新規: AI要約API
│
components/
└── consulting/
    └── SearchTab.tsx              # 変更: 本格実装

lib/
└── brave-search.ts                # 参照のみ: 既存実装

docs/
├── architecture/
│   ├── brainstorm_20260204_search_tab_real_implementation.md  # 完了
│   └── design_20260204_search_tab.md                          # 完了
└── plans/
    └── implementation_plan_20260204_search_tab.md             # このファイル
```

---

## タスクリスト

### Task 1: Difyワークフロー作成（検索要約）
**目的**: 検索結果を箇条書き形式で要約するワークフローを作成

**依存**: なし

**成果物**:
- Difyワークフロー: `search-summarizer`
- 入力変数: query, result1-3 (title, desc, url)
- 出力変数: summary (箇条書き)

**手順**:
1. Dify管理画面にログイン
2. 新規ワークフロー作成
3. 入力変数定義（10個: query + 3結果×3項目）
4. LLMノード追加（プロンプト設定）
5. 出力変数定義
6. テスト実行（サンプルデータ）
7. APIキー取得

**見積もり**: 15分

**優先度**: 最高

**変更通知必須**: いいえ（外部システム）

**注意**: 
- プロンプトはDesignドキュメント参照
- 出力形式は箇条書き（• で始まる）
- 参考URLは別途処理（APIで結合）

---

### Task 2: 検索API実装
**目的**: Brave Search APIを使ったWeb検索エンドポイント作成

**依存**: なし

**成果物**:
- `app/api/consulting/search/route.ts` (新規作成、保護レベル3)

**実装内容**:
```typescript
// POST /api/consulting/search
// Body: { query: string }
// Response: { success: boolean, results: SearchResult[], error?: string }

import { NextRequest, NextResponse } from 'next/server'
import { braveWebSearch } from '@/lib/brave-search'

export async function POST(request: NextRequest) {
  try {
    // 1. 入力検証
    const body = await request.json()
    const { query } = body
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid query' },
        { status: 400 }
      )
    }
    
    if (query.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Query too long' },
        { status: 400 }
      )
    }
    
    // 2. Brave Search実行（3件取得）
    const results = await braveWebSearch(query, 3)
    
    // 3. 結果返却
    return NextResponse.json({
      success: true,
      results: results.map(r => ({
        url: r.url,
        title: r.title || 'タイトルなし',
        description: r.description || '説明なし'
      }))
    })
    
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**見積もり**: 10分

**優先度**: 最高

**変更通知必須**: いいえ（新規作成）

---

### Task 3: 要約API実装
**目的**: Difyワークフローを使った検索結果要約エンドポイント作成

**依存**: Task 1（Difyワークフロー）

**成果物**:
- `app/api/consulting/search/summarize/route.ts` (新規作成、保護レベル3)

**実装内容**:
```typescript
// POST /api/consulting/search/summarize
// Body: { query: string, results: SearchResult[] }
// Response: { success: boolean, summary: string, sources: string[], error?: string }

import { NextRequest, NextResponse } from 'next/server'

interface SearchResult {
  url: string
  title: string
  description: string
}

export async function POST(request: NextRequest) {
  try {
    // 1. 入力検証
    const body = await request.json()
    const { query, results } = body
    
    if (!query || !Array.isArray(results)) {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      )
    }
    
    // 2. Dify API呼び出し
    const difyApiKey = process.env.DIFY_API_KEY
    const difyWorkflowUrl = process.env.DIFY_SEARCH_SUMMARIZER_URL // 例: https://api.dify.ai/v1/workflows/run
    
    if (!difyApiKey || !difyWorkflowUrl) {
      return NextResponse.json(
        { success: false, error: 'Dify configuration missing' },
        { status: 500 }
      )
    }
    
    // 入力変数の構築
    const inputs: Record<string, string> = {
      query,
      result1_title: results[0]?.title || '',
      result1_desc: results[0]?.description || '',
      result1_url: results[0]?.url || '',
      result2_title: results[1]?.title || '',
      result2_desc: results[1]?.description || '',
      result2_url: results[1]?.url || '',
      result3_title: results[2]?.title || '',
      result3_desc: results[2]?.description || '',
      result3_url: results[2]?.url || '',
    }
    
    const difyResponse = await fetch(difyWorkflowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${difyApiKey}`,
      },
      body: JSON.stringify({
        inputs,
        response_mode: 'blocking',
        user: 'consulting-user'
      })
    })
    
    if (!difyResponse.ok) {
      throw new Error(`Dify API error: ${difyResponse.status}`)
    }
    
    const difyData = await difyResponse.json()
    const summary = difyData.data?.outputs?.summary || ''
    
    // 3. 参考URL抽出
    const sources = results.map(r => r.url).filter(Boolean)
    
    // 4. 結果返却
    return NextResponse.json({
      success: true,
      summary,
      sources
    })
    
  } catch (error) {
    console.error('Summarize API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**見積もり**: 20分

**優先度**: 最高

**変更通知必須**: いいえ（新規作成）

**注意**:
- `DIFY_SEARCH_SUMMARIZER_URL`を.env.localに追加必要
- Difyのレスポンス形式は実際のワークフローに合わせて調整

---

### Task 4: SearchTab.tsx改修（検索機能）
**目的**: ダミー実装を削除し、実際のAPI呼び出しに変更

**依存**: Task 2（検索API）

**成果物**:
- `components/consulting/SearchTab.tsx` 修正 (保護レベル3)

**変更内容**:
1. `handleSearch()`関数を実装
2. 自動リトライロジック追加
3. エラーハンドリング強化
4. ローディング状態管理

**修正箇所** (30-67行目):
```typescript
const handleSearch = async () => {
  if (!query.trim()) return

  setIsSearching(true)
  setError(null)
  setResults([])
  setSummary(null)
  setRetryCount(0)

  try {
    const result = await searchWithRetry(query)
    
    if (result.success && result.results) {
      setResults(result.results)
      
      // 検索履歴に追加
      if (!searchHistory.includes(query)) {
        const newHistory = [query, ...searchHistory].slice(0, 5)
        setSearchHistory(newHistory)
        localStorage.setItem('searchHistory', JSON.stringify(newHistory))
      }
    } else {
      throw new Error(result.error || 'Search failed')
    }
  } catch (error) {
    console.error('Search error:', error)
    setError('検索に失敗しました。もう一度お試しください。')
  } finally {
    setIsSearching(false)
  }
}

// 自動リトライ付き検索
async function searchWithRetry(query: string, maxRetries = 2): Promise<any> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/consulting/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      
      if (response.ok) {
        return await response.json()
      }
      
      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 60000))
        continue
      }
      
      throw new Error(`HTTP ${response.status}`)
      
    } catch (error) {
      lastError = error as Error
      setRetryCount(i + 1)
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
      }
    }
  }
  
  throw lastError
}
```

**見積もり**: 20分

**優先度**: 高

**変更通知必須**: いいえ（レベル3）

---

### Task 5: SearchTab.tsx改修（要約機能）
**目的**: 要約生成ボタンと要約表示機能を追加

**依存**: Task 3（要約API）、Task 4（検索機能）

**成果物**:
- `components/consulting/SearchTab.tsx` 修正 (保護レベル3)

**変更内容**:
1. `handleSummarize()`関数を追加
2. 要約結果の表示UI追加
3. 「チャットに挿入」ボタン実装

**追加コード**:
```typescript
// 状態追加
const [summary, setSummary] = useState<string | null>(null)
const [sources, setSources] = useState<string[]>([])
const [isSummarizing, setIsSummarizing] = useState(false)
const [retryCount, setRetryCount] = useState(0)

// 要約生成
const handleSummarize = async () => {
  if (results.length === 0) return

  setIsSummarizing(true)
  setError(null)

  try {
    const response = await fetch('/api/consulting/search/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, results })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success) {
      setSummary(data.summary)
      setSources(data.sources)
    } else {
      throw new Error(data.error || 'Summarization failed')
    }
  } catch (error) {
    console.error('Summarize error:', error)
    setError('要約生成に失敗しました。もう一度お試しください。')
  } finally {
    setIsSummarizing(false)
  }
}

// チャットに挿入
const handleInsertSummaryToChat = () => {
  if (!summary) return

  const insertText = `検索キーワード「${query}」の要約:\n\n${summary}\n\n参考URL:\n${sources.map((url, i) => `${i + 1}. ${url}`).join('\n')}`

  if (onInsertToChat) {
    onInsertToChat(insertText)
    toast.success('要約をチャットに挿入しました')
  }
}
```

**UI追加**:
```tsx
{/* 要約生成ボタン */}
{results.length > 0 && !summary && (
  <Button
    onClick={handleSummarize}
    disabled={isSummarizing}
    className="w-full bg-blue-600 hover:bg-blue-700"
  >
    {isSummarizing ? '要約生成中...' : '✨ 要約を生成'}
  </Button>
)}

{/* 要約結果表示 */}
{summary && (
  <Card className="border-blue-200 bg-blue-50">
    <CardContent className="p-4">
      <h4 className="text-sm font-semibold mb-2">📝 要約結果</h4>
      <p className="text-xs text-muted-foreground mb-3">
        検索キーワード「{query}」
      </p>
      <div className="text-sm whitespace-pre-line mb-4">{summary}</div>
      
      <div className="mb-4">
        <p className="text-xs font-semibold mb-2">参考URL:</p>
        {sources.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline block"
          >
            {i + 1}. {url}
          </a>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={handleInsertSummaryToChat}
          className="flex-1 bg-blue-600"
        >
          💬 チャットに挿入
        </Button>
        <Button
          onClick={handleSummarize}
          variant="outline"
          className="flex-1"
        >
          🔄 要約を再生成
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

**見積もり**: 25分

**優先度**: 高

**変更通知必須**: いいえ（レベル3）

---

### Task 6: 検索結果UI改修（別タブで開く）
**目的**: 検索結果に「別タブで開く」リンクを追加

**依存**: Task 4（検索機能）

**成果物**:
- `components/consulting/SearchTab.tsx` 修正 (保護レベル3)

**変更内容**:
検索結果カードの修正（145-156行目周辺）

**修正前**:
```tsx
<a
  href={result.url}
  target="_blank"
  rel="noopener noreferrer"
  className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 mb-1"
>
  {result.title}
  <ExternalLink className="w-3 h-3 flex-shrink-0" />
</a>
```

**修正後**:
```tsx
<div className="flex items-start justify-between mb-1">
  <h5 className="text-sm font-semibold text-foreground flex-1">
    {result.title}
  </h5>
  <a
    href={result.url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-blue-600 hover:underline flex items-center gap-1 flex-shrink-0 ml-2"
  >
    別タブで開く
    <ExternalLink className="w-3 h-3" />
  </a>
</div>
```

**見積もり**: 5分

**優先度**: 中

**変更通知必須**: いいえ（レベル3）

---

### Task 7: エラーハンドリング強化
**目的**: ユーザーフレンドリーなエラー表示

**依存**: Task 4, Task 5

**成果物**:
- `components/consulting/SearchTab.tsx` 修正 (保護レベル3)

**変更内容**:
エラー表示UIの追加

```tsx
{/* エラー表示 */}
{error && (
  <Card className="border-red-200 bg-red-50">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="text-red-600">❌</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-900 mb-1">
            エラーが発生しました
          </h4>
          <p className="text-xs text-red-700 mb-3">{error}</p>
          {retryCount > 0 && (
            <p className="text-xs text-red-600 mb-3">
              自動で{retryCount}回試行しましたが成功しませんでした。
            </p>
          )}
          <Button
            onClick={handleSearch}
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            🔄 再試行
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

**見積もり**: 10分

**優先度**: 中

**変更通知必須**: いいえ（レベル3）

---

### Task 8: .env.local設定追加
**目的**: Difyワークフローの環境変数を追加

**依存**: Task 1（Difyワークフロー）

**成果物**:
- `.env.local` 修正 (保護レベル1 - **変更通知必須**)

**追加内容**:
```env
# Dify Search Summarizer Workflow
DIFY_SEARCH_SUMMARIZER_URL=https://api.dify.ai/v1/workflows/run/[workflow-id]
```

**見積もり**: 2分

**優先度**: 最高

**変更通知必須**: **はい（レベル1ファイル）**

**注意**:
- workflow-idはTask 1で取得
- 既存のDIFY_API_KEYを使用

---

### Task 9: 動作確認・テスト
**目的**: 全機能の動作確認

**依存**: Task 2-8（全タスク）

**確認項目**:
1. ✅ 検索実行（正常系）
2. ✅ 検索結果表示（3件）
3. ✅ 別タブで開く
4. ✅ 要約生成
5. ✅ 要約結果表示
6. ✅ チャットに挿入
7. ✅ 要約再生成
8. ✅ 検索履歴保存・表示
9. ✅ エラー時の自動リトライ
10. ✅ エラー時の手動リトライ
11. ✅ ローディング表示

**手順**:
```bash
# 開発サーバー起動
npm run dev

# ブラウザで確認
# http://localhost:3000/consulting/start
# 右パネル「検索」タブをクリック
# 各機能をテスト
```

**見積もり**: 15分

**優先度**: 最高

**変更通知必須**: いいえ

---

### Task 10: Gitコミット
**目的**: 実装をコミット

**依存**: Task 9（動作確認）

**コミットメッセージ**:
```bash
feat(consulting): SearchTab本格実装（Web検索+AI要約）

Brave Search API + Dify APIによる実際の検索機能を実装

## 実装内容

### 新規作成
1. app/api/consulting/search/route.ts
   - Brave Search APIで3件取得
   - 入力検証、エラーハンドリング

2. app/api/consulting/search/summarize/route.ts
   - Dify API（検索要約ワークフロー）呼び出し
   - 箇条書き形式で要約生成

3. Difyワークフロー: search-summarizer
   - 検索結果を箇条書きで要約
   - 参考URL付き

### 変更
1. components/consulting/SearchTab.tsx
   - ダミー実装削除
   - 実際のAPI呼び出し実装
   - 自動リトライロジック（2回）
   - 要約生成・表示機能
   - エラーハンドリング強化
   - 別タブで開く機能

2. .env.local
   - DIFY_SEARCH_SUMMARIZER_URL追加

## 機能フロー

```
1. ユーザー入力
   ↓
2. Brave Search (3件取得)
   ↓
3. 検索結果表示（別タブで開く）
   ↓
4. 要約生成ボタン
   ↓
5. Dify AI要約（箇条書き）
   ↓
6. 要約表示（参考URL付き）
   ↓
7. チャットに挿入
```

## UX改善

### 自動リトライ
- 検索失敗時: 自動で2回リトライ
- 失敗後: 手動リトライボタン表示

### エラー表示
- ユーザーフレンドリーなメッセージ
- リトライ回数表示
- 再試行ボタン

### 検索履歴
- localStorage保存（5件）
- クリックで再検索

### 別タブで開く
- 元のソースを確認可能
- noopener noreferrer（セキュリティ）

## 技術詳細

### API構成
- /api/consulting/search: Web検索
- /api/consulting/search/summarize: AI要約

### Dify統合
- 検索要約専用ワークフロー
- 入力: query + 検索結果3件
- 出力: 箇条書き要約

### エラーハンドリング
- 自動リトライ（最大2回）
- タイムアウト対応
- レート制限対応（429）
- ネットワークエラー対応

関連: #search #dify-integration #brave-api #ux-improvement
```

**見積もり**: 5分

**優先度**: 最高

**変更通知必須**: いいえ

---

## 実装順序

```
Phase A: API基盤構築
  ├─ Task 1: Difyワークフロー作成 (15分) ⚠️ 外部作業
  ├─ Task 2: 検索API実装 (10分)
  └─ Task 3: 要約API実装 (20分) [依存: Task 1]

Phase B: UI実装
  ├─ Task 4: SearchTab改修（検索） (20分) [依存: Task 2]
  ├─ Task 5: SearchTab改修（要約） (25分) [依存: Task 3, Task 4]
  ├─ Task 6: 検索結果UI改修 (5分) [依存: Task 4]
  └─ Task 7: エラーハンドリング (10分) [依存: Task 4, Task 5]

Phase C: 設定・確認
  ├─ Task 8: .env.local設定 (2分) ⚠️ レベル1
  ├─ Task 9: 動作確認 (15分) [依存: 全タスク]
  └─ Task 10: Gitコミット (5分) [依存: Task 9]
```

### 推奨実行順序
1. **Task 1** (Difyワークフロー) → **外部作業、先に完了させる**
2. **Task 8** (.env.local) → **変更通知 → 承認待ち**
3. Task 2 → Task 3（API実装）
4. Task 4 → Task 5 → Task 6 → Task 7（UI実装）
5. Task 9（動作確認）
6. Task 10（Gitコミット）

---

## 総見積もり時間

| Phase | 所要時間 |
|-------|---------|
| Phase A: API基盤 | 45分 |
| Phase B: UI実装 | 60分 |
| Phase C: 設定・確認 | 22分 |
| **合計** | **約2時間7分** |

---

## リスク管理

### Task 1: Difyワークフロー作成
**リスク**: Dify APIのレスポンス形式が想定と異なる
**対策**: 
- Task 1完了後、即座にTask 3でテスト
- 必要に応じてプロンプト調整

### Task 3: 要約API実装
**リスク**: Difyのタイムアウト（長文処理）
**対策**:
- タイムアウト設定: 30秒
- エラー時は手動リトライを促す

### Task 8: .env.local変更
**リスク**: レベル1ファイルのため慎重な操作が必要
**対策**:
- 変更通知を必ず表示
- バックアップ作成（Gitで管理）

### Task 9: 動作確認
**リスク**: Brave Search APIの制限
**対策**:
- テストは控えめに（1-2回）
- エラー発生時は自動リトライを確認

---

## 次のステップ

### ✅ Phase 3完了
このImplementation Planドキュメント作成完了

### 🔜 Phase 4: IMPLEMENT
**Task 1から順次実行**

---

**Phase 4: IMPLEMENTに進む準備が整いました！**

実装を開始してよろしいですか？
