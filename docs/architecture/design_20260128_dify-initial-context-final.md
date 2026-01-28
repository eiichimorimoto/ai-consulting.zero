# 🎨 Design: Dify初期情報送信機能（Phase 1 完全版）

**作成日**: 2026-01-28  
**バージョン**: 2.0（完全版）  
**対応範囲**: Phase 1 実装完了後の最終設計書

---

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│                         ユーザー（ブラウザ）                        │
│                                                                 │
│  [新規相談開始]                                                   │
│   ・相談内容入力: "Webサイトのアクセスが伸びない"                    │
│   ・カテゴリ選択: "マーケティング"                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /api/consulting/dify
                              │ { query: "...", conversationId?: "xxx" }
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               Next.js API: /api/consulting/dify                 │
│                                                                 │
│  [処理]                                                          │
│  1. Supabase認証チェック（user.id 取得）                          │
│  2. 環境変数バリデーション                                         │
│     - DIFY_WORKFLOW_API_KEY                                    │
│     - DIFY_API_BASE_URL                                        │
│     - DIFY_WORKFLOW_ID                                         │
│  3. Dify Workflow API 呼び出し                                   │
│     POST {DIFY_API_BASE_URL}/workflows/run                     │
│     Headers:                                                    │
│       Authorization: Bearer {DIFY_WORKFLOW_API_KEY}            │
│     Body:                                                       │
│       {                                                         │
│         inputs: {                                               │
│           user_id: "xxx",  ← Supabase user.id                 │
│           query: "..."     ← ユーザー入力                        │
│         },                                                      │
│         response_mode: "blocking",                             │
│         user: "xxx"                                             │
│       }                                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Request
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Dify Workflow                             │
│                                                                 │
│  [ノード構成]                                                     │
│  1. ユーザー入力ノード                                            │
│     変数: user_id, query                                        │
│                                                                 │
│  2. HTTPリクエストノード                                          │
│     URL: https://your-domain/api/dify/context                  │
│     Method: POST                                                │
│     Headers:                                                    │
│       x-api-key: {DIFY_API_KEY}                                │
│     Body:                                                       │
│       {                                                         │
│         "userId": "{{user_id}}",                               │
│         "isNewCase": true,                                     │
│         "initialIssue": {                                      │
│           "content": "{{query}}",                              │
│           "category": "unknown",                               │
│           "categoryLabel": "未分類"                             │
│         }                                                       │
│       }                                                         │
│                                                                 │
│  3. LLMノード                                                    │
│     入力: HTTPリクエスト.body（コンテキスト情報）                   │
│     プロンプト:                                                  │
│       "以下のコンテキスト情報を基に、ユーザーの相談に回答してください" │
│       - 会社情報: {{context.company}}                           │
│       - 外部情報: {{context.externalInformation}}              │
│       - 初回評価: {{context.initialEvaluation}}                │
│       - 初回課題: {{context.initialIssue}}                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /api/dify/context
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Next.js API: /api/dify/context                     │
│                                                                 │
│  [処理]                                                          │
│  1. x-api-key 認証                                              │
│  2. userId バリデーション                                        │
│  3. Supabase データ取得（並列）                                   │
│     ├─ getBaseContext()                                        │
│     │   ├─ profiles（プロフィール）                             │
│     │   ├─ companies（会社情報）                                │
│     │   ├─ company_web_resources（Web情報）                     │
│     │   └─ business_cards（名刺情報）                           │
│     │                                                            │
│     ├─ getExternalInformation()（並列1）                        │
│     │   ├─ dashboard_data (data_type='market')                 │
│     │   │   ├─ currentRate: 為替レート                          │
│     │   │   ├─ commodities: 商品価格（name, price, trend）     │
│     │   │   └─ industry: 業種                                  │
│     │   └─ dashboard_data (data_type='local_info')             │
│     │       ├─ laborCosts: 人件費                               │
│     │       ├─ events: イベント情報                             │
│     │       ├─ infrastructure: インフラ情報                      │
│     │       └─ weather: 天気情報                                │
│     │                                                            │
│     ├─ getInitialEvaluationData()（並列2）                      │
│     │   ├─ digital_scores（最新1件）                            │
│     │   │   ├─ overall_score: パフォーマンススコア               │
│     │   │   ├─ seo_score: SEOスコア                            │
│     │   │   └─ accessibility_score: アクセシビリティスコア       │
│     │   ├─ diagnostic_reports（最新3件）                        │
│     │   │   ├─ report_title: レポートタイトル                   │
│     │   │   ├─ report_summary: サマリー                         │
│     │   │   └─ priority/urgency/impact/overall_score           │
│     │   └─ dashboard_data (data_type='swot_analysis')          │
│     │       └─ SWOT分析キャッシュ                               │
│     │                                                            │
│     └─ getConversationHistory()（継続案件のみ）                  │
│         ├─ consulting_sessions（最新アクティブセッション）        │
│         ├─ consulting_messages（直近10件）                       │
│         └─ reports（過去3件）                                    │
│                                                                 │
│  4. レスポンス構築                                                │
│     {                                                           │
│       success: true,                                            │
│       data: {                                                   │
│         profile: {...},                                         │
│         company: {...},                                         │
│         webResources: [...],                                    │
│         businessCards: [...],                                   │
│         conversationHistory: {...} or null,                    │
│         externalInformation: {...} or null,  ← 新規             │
│         initialEvaluation: {...} or null,    ← 新規             │
│         initialIssue: {...} or null          ← 新規             │
│       }                                                         │
│     }                                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ JSON Response
                              ↓
                        Dify LLM Node
                              │
                              │ 回答生成
                              ↓
                   /api/consulting/dify
                              │
                              │ JSON Response
                              ↓
                      ユーザー（ブラウザ）
```

---

## モジュール構成

### 1. /api/consulting/dify/route.ts（新規）
**責務**: Dify Workflow API 呼び出しプロキシ

**依存**:
- `lib/supabase/server`: Supabase認証
- `next/server`: NextRequest, NextResponse
- 環境変数: DIFY_WORKFLOW_API_KEY, DIFY_API_BASE_URL, DIFY_WORKFLOW_ID

**保護レベル**: 3（新規作成）

**主要関数**:
- `POST()`: 
  - Supabase認証チェック
  - リクエストボディバリデーション（query必須）
  - Dify Workflow API 呼び出し
  - エラーハンドリング
- `GET()`: 
  - ヘルスチェック
  - 環境変数設定確認

**セキュリティ考慮点**:
- ✅ Supabase認証必須（未認証は401）
- ✅ user.id を明示的に注入（Difyの sys.user_id は使わない）
- ✅ DIFY_WORKFLOW_API_KEY はサーバー環境変数のみ
- ✅ エラーメッセージに機密情報を含まない

---

### 2. /api/dify/context/route.ts（拡張）
**責務**: Difyワークフローにコンテキスト情報を提供

**依存**:
- `lib/supabase/server`: Supabase クライアント
- `next/server`: NextRequest, NextResponse
- 環境変数: DIFY_API_KEY

**保護レベル**: 3（拡張部分）

**主要関数**:
- `POST()`: 
  - x-api-key 認証
  - userId, isNewCase, initialIssue バリデーション
  - コンテキスト情報取得（並列）
  - レスポンス構築
- `GET()`: 
  - ヘルスチェック
  - APIバージョン情報

**新規ヘルパー関数**:
- `getExternalInformation()`: 
  - dashboard_data (market, local_info) から外部情報取得
  - 為替、商品価格、人件費、イベント、天気など
  - データがない場合は null 返却
- `getInitialEvaluationData()`: 
  - digital_scores, diagnostic_reports, dashboard_data (swot_analysis) から初回評価取得
  - デジタルスコア、診断レポート、SWOT分析
  - データがない場合は null 返却

**セキュリティ考慮点**:
- ✅ x-api-key 認証必須（不一致は401）
- ✅ DIFY_API_KEY はサーバー環境変数のみ
- ✅ ユーザーIDバリデーション
- ✅ SQLインジェクション対策（Supabase ORM使用）

---

## 技術選定（プロジェクト制約考慮）

| カテゴリ | 選定技術 | 理由 | 制約 |
|---------|---------|------|------|
| 認証 | Supabase Auth | 既存システム | middleware.ts変更慎重 |
| キャッシュ | Next.js Cache | 標準機能 | Turbopack最適化 |
| Dify連携 | Workflow API | ユーザー入力の柔軟性 | Chatflow ではなく Workflow |
| データ取得 | Promise.all | 並列処理で高速化 | エラーハンドリング必須 |
| 型安全性 | TypeScript Interface | 型推論とバリデーション | any は最小限 |
| エラーログ | console.error | デバッグ容易性 | 本番環境では適切なロギングサービス検討 |

---

## データフロー

### 1. クライアント → Next.js API (/api/consulting/dify)
```typescript
// Request
POST /api/consulting/dify
{
  query: "Webサイトのアクセスが伸びない",
  conversationId?: "xxx"  // 継続案件の場合
}

// Response
{
  success: true,
  data: {
    // Dify Workflow API のレスポンス
    workflow_run_id: "xxx",
    task_id: "xxx",
    data: {
      outputs: {
        text: "回答内容..."
      }
    }
  }
}
```

### 2. Next.js API → Dify Workflow API
```typescript
// Request
POST https://your-domain/v1/workflows/run
Authorization: Bearer {DIFY_WORKFLOW_API_KEY}
{
  inputs: {
    user_id: "d1234567-89ab-cdef-0123-456789abcdef",  // Supabase user.id
    query: "Webサイトのアクセスが伸びない"
  },
  response_mode: "blocking",
  user: "d1234567-89ab-cdef-0123-456789abcdef"
}
```

### 3. Dify Workflow → Next.js API (/api/dify/context)
```typescript
// Request
POST https://your-domain/api/dify/context
x-api-key: {DIFY_API_KEY}
{
  userId: "d1234567-89ab-cdef-0123-456789abcdef",
  isNewCase: true,
  initialIssue: {
    content: "Webサイトのアクセスが伸びない",
    category: "unknown",
    categoryLabel: "未分類"
  }
}

// Response
{
  success: true,
  data: {
    profile: {
      name: "山田太郎",
      position: "代表取締役",
      department: null,
      email: "yamada@example.com",
      phone: "090-1234-5678"
    },
    company: {
      name: "株式会社サンプル",
      industry: "小売業",
      employee_count: "10-50",
      annual_revenue: "1億円未満",
      business_description: "地域密着型の小売店",
      current_challenges: ["集客", "DX推進"],
      growth_stage: "成長期",
      it_maturity_level: "初級"
    },
    webResources: [
      {
        title: "会社ホームページ",
        description: "公式サイト",
        url: "https://example.com",
        relevance_score: 0.9
      }
    ],
    businessCards: [],
    conversationHistory: null,  // 新規案件
    externalInformation: {
      marketData: {
        currentRate: 150.5,
        commodities: [
          {
            name: "原油",
            currentPrice: 80.5,
            unit: "USD/barrel",
            trend: "up"
          }
        ],
        industry: "小売業"
      },
      localInfo: {
        laborCosts: {
          current: 1200,
          monthly: 250000,
          yearly: 3000000,
          comparison: {
            industryMonthly: 280000,
            industryYearly: 3360000
          }
        },
        events: [
          {
            title: "地域イベント",
            url: "https://...",
            description: "...",
            date: "2026-02-15"
          }
        ],
        infrastructure: [],
        weather: {
          location: "東京",
          current: {
            temp: 10,
            desc: "晴れ"
          },
          week: [...]
        }
      }
    },
    initialEvaluation: {
      digitalScore: {
        overall_score: 65,
        mobile_score: null,
        desktop_score: null,
        seo_score: 70,
        accessibility_score: 60,
        created_at: "2026-01-20T12:00:00Z"
      },
      swotAnalysis: {
        strengths: ["地域密着"],
        weaknesses: ["Web集客力不足"],
        opportunities: ["EC拡大"],
        threats: ["大手競合"]
      },
      diagnosticReports: [
        {
          id: "xxx",
          report_title: "Web診断レポート",
          report_summary: "...",
          priority_score: 8,
          urgency_score: 7,
          impact_score: 9,
          overall_score: 8,
          created_at: "2026-01-15T10:00:00Z"
        }
      ],
      websiteAnalysis: null
    },
    initialIssue: {
      content: "Webサイトのアクセスが伸びない",
      category: "unknown",
      categoryLabel: "未分類",
      createdAt: "2026-01-28T14:30:00Z"
    }
  }
}
```

---

## セキュリティ考慮点

### 1. 認証フロー
```
[ユーザー] 
  → Supabase Auth（JWT）
  → Next.js API (/api/consulting/dify)
  → user.id 取得・検証
  → Dify Workflow API（Bearer Token）
  → Dify Workflow
  → Next.js API (/api/dify/context)（x-api-key）
  → Supabase データ取得
```

### 2. 環境変数の使い分け
| 変数名 | 用途 | 公開範囲 |
|--------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase接続 | クライアント可 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase認証 | クライアント可 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase管理操作 | サーバーのみ |
| `DIFY_API_KEY` | `/api/dify/context` 認証 | サーバーのみ |
| `DIFY_WORKFLOW_API_KEY` | Dify Workflow API | サーバーのみ |
| `DIFY_API_BASE_URL` | Dify API URL | サーバーのみ |
| `DIFY_WORKFLOW_ID` | ワークフローID | サーバーのみ |

### 3. データ保護
- ✅ ユーザーは自分のデータのみアクセス可能（user_id フィルタ）
- ✅ APIキー認証必須（Difyからの呼び出しのみ許可）
- ✅ エラーメッセージに機密情報を含まない
- ✅ ログに個人情報を出力しない（userId のみ）

---

## ファイル変更計画

### 新規作成
- `app/api/consulting/dify/route.ts`: Dify Workflow API プロキシ（保護レベル3）
- `docs/architecture/brainstorm_20260128_dify-initial-context-final.md`: 要件分析（完全版）
- `docs/architecture/design_20260128_dify-initial-context-final.md`: 設計書（完全版）
- `docs/plans/implementation_plan_20260128_dify-initial-context-final.md`: 実装計画（完全版）
- `app/api/dify/context/route.test.ts`: ユニットテスト（Phase 1.5）
- `app/api/consulting/dify/route.test.ts`: ユニットテスト（Phase 1.5）

### 変更対象
- `app/api/dify/context/route.ts`: 拡張（保護レベル3）
  - 新規インターフェース追加
  - 新規ヘルパー関数追加
  - POST ハンドラー拡張

### 参照のみ
- `.env.local`: 環境変数確認・追加
- `lib/supabase/server.ts`: Supabase クライアント

---

## パフォーマンス最適化

### 1. 並列データ取得
```typescript
// ❌ 悪い例（直列）
const externalInfo = await getExternalInformation(supabase, userId)
const initialEval = await getInitialEvaluationData(supabase, userId)

// ✅ 良い例（並列）
const [externalInfo, initialEval] = await Promise.all([
  getExternalInformation(supabase, userId),
  getInitialEvaluationData(supabase, userId),
])
```

### 2. データ取得制限
- Web情報: 上位5件（relevance_score順）
- 名刺情報: 最新10件
- メッセージ履歴: 直近10件
- レポート: 最新3件
- 診断レポート: 最新3件

### 3. キャッシュ戦略
- `dashboard_data`: 定期更新（外部APIからのキャッシュ）
- `digital_scores`: 定期計測（日次/週次）
- `diagnostic_reports`: 手動作成（必要時のみ）

---

## エラーハンドリング

### 1. 認証エラー
```typescript
// Supabase認証失敗
if (authError || !user) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}

// APIキー不一致
if (apiKey !== expectedApiKey) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  )
}
```

### 2. データ取得エラー
```typescript
// ヘルパー関数内で try-catch
try {
  // データ取得処理
} catch (error) {
  console.error('Error in getExternalInformation:', error)
  return null  // エラー時は null を返す（処理は継続）
}
```

### 3. Dify API エラー
```typescript
if (!difyResponse.ok) {
  const errorText = await difyResponse.text()
  console.error('Dify API error:', {
    status: difyResponse.status,
    error: errorText
  })
  return NextResponse.json(
    { 
      error: 'Dify API call failed',
      details: difyResponse.status  // ステータスコードのみ
    },
    { status: difyResponse.status }
  )
}
```

---

## テスト戦略

### 1. ユニットテスト
- `getExternalInformation()`: dashboard_data の各パターン
- `getInitialEvaluationData()`: 各テーブルのデータ有無
- `POST /api/dify/context`: 認証、バリデーション、レスポンス構造
- `POST /api/consulting/dify`: 認証、Dify API 呼び出し

### 2. 統合テスト
- `/api/consulting/dify` → Dify → `/api/dify/context` の一連のフロー
- 新規案件 vs 継続案件の動作確認
- エラーケースの動作確認

### 3. E2Eテスト（Phase 3）
- フロントエンドからの相談開始
- Difyからの回答表示
- エラーハンドリング

---

## 今後の改善点

### Phase 1.5: テスト追加
- ユニットテストファイル作成
- モックデータ準備
- テストカバレッジ 80% 以上

### Phase 2: 添付ファイル処理
- 添付ファイル情報の取得
- Difyへの添付ファイル送信（Base64 or URL）
- ファイルサイズ制限

### Phase 3: フロントエンド実装
- 相談開始画面UI
- `/api/consulting/dify` 呼び出し
- ストリーミングレスポンス対応（検討）

### Phase 4: パフォーマンス最適化
- レスポンスキャッシュ（Redis検討）
- データ取得の最適化
- CDN活用（静的アセット）

---

## まとめ

Phase 1 の設計により、Difyに対して包括的な初期コンテキストを提供する基盤が完成しました。

**設計のポイント**:
1. ✅ セキュリティ第一（認証・環境変数・データ保護）
2. ✅ 並列処理による高速化
3. ✅ エラーハンドリングの徹底
4. ✅ 型安全性の確保
5. ✅ 拡張性の考慮（Phase 2以降への対応）

**技術的な成果**:
- Next.js 16 の App Router 活用
- Supabase の型安全なクエリ
- Dify Workflow API の効果的な活用
- TypeScript の型推論とバリデーション
