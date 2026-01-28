# 📝 Implementation Plan: Dify初期情報送信機能（Phase 1 完全版）

**作成日**: 2026-01-28  
**バージョン**: 2.0（完全版）  
**ステータス**: ✅ Phase 1 完了

---

## プロジェクト構造

```
ai-consulting-zero/
├── app/
│   └── api/
│       ├── dify/
│       │   └── context/
│       │       ├── route.ts ✅ 拡張完了（Phase 1）
│       │       └── route.test.ts 📝 作成予定（Phase 1.5）
│       └── consulting/
│           └── dify/
│               ├── route.ts ✅ 新規作成完了（Phase 1）
│               └── route.test.ts 📝 作成予定（Phase 1.5）
│
├── lib/
│   └── supabase/
│       └── server.ts （参照のみ）
│
├── docs/
│   ├── architecture/
│   │   ├── brainstorm_20260128_dify-initial-context-final.md ✅
│   │   └── design_20260128_dify-initial-context-final.md ✅
│   ├── plans/
│   │   └── implementation_plan_20260128_dify-initial-context-final.md ✅
│   └── dify-initial-context-specification.md （仕様書）
│
├── .env.local ✅ 環境変数設定完了
└── README.md （更新予定）
```

---

## タスクリスト（Phase 1: 完了）

### ✅ Task 1: 型定義の追加（完了）
**目的**: `/api/dify/context` に新規インターフェースを追加

**成果物**:
- `app/api/dify/context/route.ts` (8-154行目)
  - `ExternalInformation`: 外部情報（市場・地域）
  - `InitialEvaluationData`: 初回評価情報
  - `InitialIssue`: 初回課題内容
  - `DifyContextResponse`: レスポンス型に上記3つを追加

**依存**: なし  
**見積もり時間**: 20分  
**実際の時間**: 15分  
**優先度**: 最高  
**保護レベル**: 3（新規作成部分）

**実装内容**:
```typescript
interface ExternalInformation {
  marketData?: {
    currentRate: number | null
    commodities: Array<{
      name: string
      currentPrice: number
      unit: string
      trend: 'up' | 'down' | 'stable'
    }>
    industry: string | null
  }
  localInfo?: {
    laborCosts: { ... }
    events: Array<{ ... }>
    infrastructure: Array<{ ... }>
    weather: { ... }
  }
}

interface InitialEvaluationData {
  digitalScore?: { ... }
  swotAnalysis?: unknown | null
  diagnosticReports?: Array<{ ... }>
  websiteAnalysis?: { ... } | null
}

interface InitialIssue {
  content: string
  category: string
  categoryLabel: string
  createdAt: string
}
```

---

### ✅ Task 2: 外部情報取得ヘルパー関数（完了）
**目的**: `dashboard_data` から市場・地域情報を取得

**成果物**:
- `app/api/dify/context/route.ts` (362-530行目)
  - `getExternalInformation()` 関数

**依存**: Task 1  
**見積もり時間**: 45分  
**実際の時間**: 50分  
**優先度**: 最高  
**保護レベル**: 3

**実装内容**:
- 会社IDの取得
- `dashboard_data` から `market` データ取得
- `dashboard_data` から `local_info` データ取得
- JSONBデータの型安全なパース
- エラーハンドリング（null返却）

**技術的課題**:
- JSONB型の動的データ構造
- 型アサーションの適切な使用
- nullチェックの徹底

**解決策**:
- `typeof` チェックで型ガード
- `Array.isArray()` で配列検証
- データがない場合は `null` 返却（エラーにしない）

---

### ✅ Task 3: 初回評価情報取得ヘルパー関数（完了）
**目的**: デジタルスコア、診断レポート、SWOT分析を取得

**成果物**:
- `app/api/dify/context/route.ts` (606-727行目)
  - `getInitialEvaluationData()` 関数

**依存**: Task 1  
**見積もり時間**: 40分  
**実際の時間**: 45分  
**優先度**: 最高  
**保護レベル**: 3

**実装内容**:
- 会社IDの取得
- `digital_scores` から最新1件取得
- `diagnostic_reports` から最新3件取得
- `dashboard_data` から `swot_analysis` 取得
- `diagnosis_previews` は当面未使用（websiteAnalysis: null）

**技術的課題**:
- 複数テーブルからのデータ取得
- `report_data` (JSONB) からのフィールド抽出
- スコアのマッピング（performance_score → overall_score）

**解決策**:
- 各テーブルを独立してクエリ
- JSONB データの型安全なパース
- データがない場合は各フィールドを null

---

### ✅ Task 4: POST ハンドラー拡張（完了）
**目的**: 新規ヘルパー関数を統合し、レスポンスに追加

**成果物**:
- `app/api/dify/context/route.ts` (178-269行目)
  - POST ハンドラーの拡張

**依存**: Task 2, Task 3  
**見積もり時間**: 25分  
**実際の時間**: 20分  
**優先度**: 最高  
**保護レベル**: 3

**実装内容**:
```typescript
// 並列データ取得
const [externalInformation, initialEvaluation] = await Promise.all([
  getExternalInformation(supabase, userId),
  getInitialEvaluationData(supabase, userId),
])

// 初回課題内容の構造化
const initialIssue: InitialIssue | null = initialIssueRaw && typeof initialIssueRaw === 'object'
  ? {
      content: String(initialIssueRaw.content ?? ''),
      category: String(initialIssueRaw.category ?? ''),
      categoryLabel: String(initialIssueRaw.categoryLabel ?? ''),
      createdAt: String(initialIssueRaw.createdAt ?? new Date().toISOString()),
    }
  : null

// レスポンスに追加
const response: DifyContextResponse = {
  success: true,
  data: {
    ...baseContext,
    conversationHistory,
    externalInformation: externalInformation ?? null,
    initialEvaluation: initialEvaluation ?? null,
    initialIssue
  }
}
```

---

### ✅ Task 5: Dify Workflow API プロキシ作成（完了）
**目的**: Next.jsアプリからDify Workflow APIを呼び出すサーバー側プロキシ

**成果物**:
- `app/api/consulting/dify/route.ts` (全107行)
  - POST ハンドラー
  - GET ハンドラー（ヘルスチェック）

**依存**: なし  
**見積もり時間**: 35分  
**実際の時間**: 30分  
**優先度**: 最高  
**保護レベル**: 3（新規作成）

**実装内容**:
```typescript
export async function POST(request: NextRequest) {
  // 1. Supabase認証チェック
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return 401

  // 2. リクエストボディ取得
  const { query, conversationId } = await request.json()
  if (!query) return 400

  // 3. 環境変数チェック
  const difyApiKey = process.env.DIFY_WORKFLOW_API_KEY
  const difyBaseUrl = process.env.DIFY_API_BASE_URL
  const workflowId = process.env.DIFY_WORKFLOW_ID
  if (!difyApiKey || !difyBaseUrl || !workflowId) return 500

  // 4. Dify Workflow API 呼び出し
  const difyResponse = await fetch(`${difyBaseUrl}/workflows/run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${difyApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        user_id: user.id,  // ← Supabase user_id
        query: query,
      },
      response_mode: 'blocking',
      user: user.id,
    })
  })

  // 5. エラーハンドリング
  if (!difyResponse.ok) {
    const errorText = await difyResponse.text()
    console.error('Dify API error:', { status: difyResponse.status, error: errorText })
    return NextResponse.json({ error: 'Dify API call failed', details: difyResponse.status }, { status: difyResponse.status })
  }

  // 6. 成功レスポンス
  const result = await difyResponse.json()
  return NextResponse.json({ success: true, data: result })
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Dify Workflow Proxy',
    configured: !!(
      process.env.DIFY_WORKFLOW_API_KEY &&
      process.env.DIFY_API_BASE_URL &&
      process.env.DIFY_WORKFLOW_ID
    )
  })
}
```

**技術的課題**:
- Difyの`sys.user_id`とSupabaseの`user_id`の不一致
- 環境変数の適切な管理
- エラーハンドリング

**解決策**:
- Next.jsアプリが`user.id`を明示的に渡す
- 環境変数のバリデーション
- Dify APIエラーを適切にログ出力

---

### ✅ Task 6: 環境変数設定（完了）
**目的**: `.env.local` にDify関連の環境変数を追加

**成果物**:
- `.env.local` (31-38行目)

**依存**: なし  
**見積もり時間**: 10分  
**実際の時間**: 5分  
**優先度**: 最高  
**保護レベル**: 1（機密情報）

**実装内容**:
```bash
# Dify設定（ローカルテスト用）
DIFY_API_KEY=***REMOVED***
DIFY_WORKFLOW_API_KEY=***REMOVED***
DIFY_API_BASE_URL=http://localhost/v1
DIFY_WORKFLOW_ID=***REMOVED***
```

**注意事項**:
- `DIFY_API_KEY`: `/api/dify/context` の `x-api-key` 認証用
- `DIFY_WORKFLOW_API_KEY`: Dify Workflow API の Bearer Token
- `DIFY_API_BASE_URL`: 環境に応じて変更
  - ローカル: `http://localhost/v1` または `http://localhost:5001/v1`
  - VPS: `https://your-vps-domain/v1`
  - クラウド: `https://api.dify.ai/v1`
- `DIFY_WORKFLOW_ID`: 実際のワークフローIDを設定

---

## 実装順序（完了済み）

### Phase 1: API拡張
1. ✅ Task 1: 型定義の追加（15分）
2. ✅ Task 2: 外部情報取得ヘルパー（50分）
3. ✅ Task 3: 初回評価取得ヘルパー（45分）
4. ✅ Task 4: POST ハンドラー拡張（20分）
5. ✅ Task 5: Dify Workflow APIプロキシ（30分）
6. ✅ Task 6: 環境変数設定（5分）

**合計実装時間**: 約2時間45分（見積もり: 3時間15分）

---

## テスト計画（Phase 1.5: 次のステップ）

### Task 7: ユニットテスト作成（/api/dify/context）
**目的**: `/api/dify/context` の動作を保証

**成果物**:
- `app/api/dify/context/route.test.ts`

**テストケース**:
1. ✅ 認証チェック
   - x-api-key が正しい場合: 200
   - x-api-key が誤っている場合: 401
   - x-api-key がない場合: 401

2. ✅ バリデーション
   - userId がない場合: 400
   - userId が存在しないユーザー: 404

3. ✅ 新規案件
   - 基本情報のみ返却
   - conversationHistory は null

4. ✅ 継続案件
   - 基本情報 + conversationHistory 返却

5. ✅ 外部情報取得
   - market データがある場合
   - local_info データがある場合
   - データがない場合: null

6. ✅ 初回評価取得
   - digitalScore がある場合
   - diagnosticReports がある場合
   - swotAnalysis がある場合
   - データがない場合: null

**見積もり時間**: 2時間

---

### Task 8: ユニットテスト作成（/api/consulting/dify）
**目的**: `/api/consulting/dify` の動作を保証

**成果物**:
- `app/api/consulting/dify/route.test.ts`

**テストケース**:
1. ✅ 認証チェック
   - 認証済みユーザー: 正常処理
   - 未認証ユーザー: 401

2. ✅ バリデーション
   - query がない場合: 400

3. ✅ 環境変数チェック
   - 環境変数がない場合: 500

4. ✅ Dify API 呼び出し
   - 成功時: 200 + data
   - 失敗時: エラーハンドリング

5. ✅ ヘルスチェック
   - GET リクエスト: 設定状態を返却

**見積もり時間**: 1時間30分

---

### Task 9: 統合テスト（Phase 1.5）
**目的**: `/api/consulting/dify` → Dify → `/api/dify/context` の一連のフロー確認

**テスト方法**:
1. 開発サーバー起動
2. ヘルスチェック確認
3. 実際のリクエスト送信
4. Difyワークフロー動作確認
5. レスポンス構造確認

**見積もり時間**: 1時間

---

## 環境変数確認（Vercel デプロイ時）

### 必須設定
Vercelダッシュボードで以下を設定:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://fwruumlkxzfihlmygrww.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Dify
DIFY_API_KEY=***REMOVED***
DIFY_WORKFLOW_API_KEY=***REMOVED***
DIFY_API_BASE_URL=https://ai-consulting-zero.vercel.app/v1  # 本番URL
DIFY_WORKFLOW_ID=***REMOVED***

# その他
NEXT_PUBLIC_APP_URL=https://ai-consulting-zero.vercel.app
```

---

## Dify ワークフロー設定

### 1. ユーザー入力ノード
変数定義:
- `user_id` (String, 必須): Supabase の user.id
- `query` (String, 必須): ユーザーの相談内容

### 2. HTTPリクエストノード
- **URL**: `https://ai-consulting-zero.vercel.app/api/dify/context`
- **Method**: POST
- **Headers**:
  - `x-api-key`: `***REMOVED***`
- **Body**:
```json
{
  "userId": "{{user_id}}",
  "isNewCase": true,
  "initialIssue": {
    "content": "{{query}}",
    "category": "unknown",
    "categoryLabel": "未分類"
  }
}
```

### 3. LLMノード
- **入力**: `HTTPリクエスト.body`（コンテキスト情報）
- **プロンプト例**:
```
以下のコンテキスト情報を基に、ユーザーの相談に回答してください。

【会社情報】
{{context.company}}

【外部情報】
{{context.externalInformation}}

【初回評価】
{{context.initialEvaluation}}

【相談内容】
{{context.initialIssue}}

回答:
```

---

## リスク管理

### Risk 1: 環境変数の設定ミス
**影響**: API呼び出し失敗（401, 500エラー）  
**対策**:
- ✅ ヘルスチェックエンドポイント実装済み
- ✅ 環境変数バリデーション実装済み
- 推奨: デプロイ前に必ずヘルスチェック確認

### Risk 2: Dify API のレート制限
**影響**: 429エラー、処理失敗  
**対策**:
- 現状: `response_mode: "blocking"` で同期処理
- 将来: レート制限監視、リトライ処理実装

### Risk 3: データ取得エラー
**影響**: コンテキスト情報が不完全  
**対策**:
- ✅ エラー時は `null` 返却（処理は継続）
- ✅ 各ヘルパー関数で try-catch
- 推奨: エラーログの監視

### Risk 4: パフォーマンス劣化
**影響**: レスポンス時間の増加  
**対策**:
- ✅ Promise.all で並列データ取得
- ✅ データ取得件数の制限
- 将来: キャッシュ実装（Redis検討）

---

## 総見積もり時間

### Phase 1（完了）
- Task 1-6: 約2時間45分（実績）

### Phase 1.5（次のステップ）
- Task 7-9: 約4時間30分（見積もり）

### 合計
- **Phase 1**: 約2時間45分 ✅
- **Phase 1.5**: 約4時間30分 📝

---

## 次のステップ

### Phase 1.5: テスト実装
1. `route.test.ts` ファイル作成
2. モックデータ準備
3. テストカバレッジ 80% 以上達成

### Phase 2: 添付ファイル処理
1. 添付ファイル情報取得
2. Difyへの添付ファイル送信
3. ファイルサイズ制限実装

### Phase 3: フロントエンド実装
1. 相談開始画面UI
2. `/api/consulting/dify` 呼び出し
3. ストリーミングレスポンス対応（検討）

---

## 完了条件（Phase 1）

### ✅ 実装完了条件
- [x] `/api/dify/context` に外部情報取得機能追加
- [x] `/api/dify/context` に初回評価取得機能追加
- [x] `/api/dify/context` に初回課題受け取り機能追加
- [x] `/api/consulting/dify` 新規作成
- [x] 環境変数設定完了
- [x] ドキュメント作成完了

### 📝 テスト完了条件（Phase 1.5）
- [ ] ユニットテスト作成（/api/dify/context）
- [ ] ユニットテスト作成（/api/consulting/dify）
- [ ] 統合テスト実施
- [ ] テストカバレッジ 80% 以上

### 🚀 デプロイ完了条件
- [ ] Vercel 環境変数設定
- [ ] ヘルスチェック確認（本番環境）
- [ ] Dify ワークフロー設定完了
- [ ] 本番環境での動作確認

---

## まとめ

Phase 1 の実装が完了しました。Difyに対して新規相談時に必要な初期コンテキストを送信する基盤が構築されました。

**実装成果**:
- ✅ 外部情報（マーケット・地域）の取得
- ✅ 初回評価情報（デジタルスコア、SWOT、診断）の取得
- ✅ 初回課題内容の明示的な受け渡し
- ✅ Next.js → Dify Workflow API 呼び出しプロキシ
- ✅ user_id の明示的な注入
- ✅ 完全なドキュメント作成

**次の優先タスク**:
1. Phase 1.5: テスト実装（約4.5時間）
2. Vercelデプロイと動作確認（約1時間）
3. Phase 2以降の計画策定
