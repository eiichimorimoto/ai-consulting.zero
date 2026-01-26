# Dify初期情報送信仕様書

> バージョン: 1.0 | 作成日: 2026-01-26
> 対象: 新規相談開始時のDify初期情報設定

---

## 📋 概要

新規相談開始時（InitialIssueModalの送信ボタン押下時）に、以下の情報をDifyの初期情報として送信します。

### 送信する情報一覧

1. **会社情報** (Company Information)
2. **個人情報** (Profile Information)
3. **外部情報** (External Information)
4. **初回評価情報** (Initial Evaluation Data)
5. **添付ファイル** (Attachments - All)
6. **新規課題内容** (Initial Issue Content)

---

## 🔍 現在の実装状況

### ✅ 既に実装済み

#### 1. `/api/dify/context` で取得している情報

**基本情報（getBaseContext関数）**:
- ✅ **個人情報**: `profiles` テーブルから取得
  - name, position, department, email, phone
- ✅ **会社情報**: `companies` テーブルから取得
  - name, industry, employee_count, annual_revenue
  - business_description, current_challenges
  - growth_stage, it_maturity_level
- ✅ **Web情報**: `company_web_resources` テーブルから取得
  - title, description, url, relevance_score（上位5件）
- ✅ **名刺情報**: `business_cards` テーブルから取得
  - person_name, company_name, position, email, phone（最新10件）

### ❌ 未実装・追加が必要

#### 1. 外部情報（External Information）
- ❌ ダッシュボードの外部情報
  - マーケットデータ（`/api/dashboard/market`）
  - 地域情報（`/api/dashboard/local-info`）
  - 業界動向（`/api/dashboard/industry-trends`）
  - 世界ニュース（`/api/dashboard/world-news`）
  - 業界予測（`/api/dashboard/industry-forecast`）

#### 2. 初回評価情報（Initial Evaluation Data）
- ❌ デジタル診断スコア（`digital_scores` テーブル）
- ❌ SWOT分析結果（`/api/dashboard/swot-analysis`）
- ❌ 診断レポート（`diagnostic_reports` テーブル）
- ❌ ウェブサイト分析結果（`diagnosis_previews` テーブル）

#### 3. 添付ファイル（Attachments）
- ❌ ファイルアップロード処理
- ❌ ファイルのDifyへの送信
- ❌ ファイルの保存・管理

#### 4. 新規課題内容（Initial Issue）
- ✅ メッセージとして送信済み
- ⚠️ コンテキストとして明示的に含める必要あり

---

## 🎯 実装方針

### Phase 1: コンテキスト拡張（`/api/dify/context`）

#### 1.1 外部情報の追加

**追加する情報**:
```typescript
interface ExternalInformation {
  marketData?: {
    currentRate: number
    commodities: Array<{
      name: string
      currentPrice: number
      unit: string
      trend: 'up' | 'down' | 'stable'
    }>
    industry: string
  }
  localInfo?: {
    laborCosts: {
      current: number
      monthly: number
      yearly: number
      comparison: {
        industryMonthly: number
        industryYearly: number
      }
    }
    events: Array<{
      title: string
      url: string
      description: string
      date: string
    }>
    infrastructure: Array<{
      title: string
      url: string
      description: string
      status: string
    }>
    weather: {
      location: string
      current: {
        temp: number
        desc: string
      }
      week: Array<{
        day: string
        temp: number
      }>
    }
  }
  industryTrends?: {
    trends: Array<{
      category: string
      title: string
      summary: string
      impact: string
    }>
  }
  worldNews?: {
    news: Array<{
      title: string
      url: string
      description: string
      publishedAt: string
    }>
  }
  industryForecast?: {
    shortTerm: {
      period: string
      outlook: 'positive' | 'neutral' | 'negative'
      prediction: string
      keyFactors: Array<{
        factor: string
        impact: 'positive' | 'negative' | 'neutral'
        description: string
      }>
    }
    midTerm: {
      period: string
      outlook: 'positive' | 'neutral' | 'negative'
      prediction: string
    }
  }
}
```

**実装方法**:
- セッションストレージから取得（`dashboard_data_v9_*`）
- または、各APIエンドポイントから取得（キャッシュ優先）

#### 1.2 初回評価情報の追加

**追加する情報**:
```typescript
interface InitialEvaluationData {
  digitalScore?: {
    overall_score: number
    mobile_score: number
    desktop_score: number
    seo_score: number
    accessibility_score: number
    created_at: string
  }
  swotAnalysis?: {
    strengths: Array<{ item: string; description: string }>
    weaknesses: Array<{ item: string; description: string }>
    opportunities: Array<{ item: string; description: string }>
    threats: Array<{ item: string; description: string }>
  }
  diagnosticReports?: Array<{
    id: string
    report_title: string
    report_summary: string
    priority_score: number
    urgency_score: number
    impact_score: number
    overall_score: number
    created_at: string
  }>
  websiteAnalysis?: {
    overallScore: number
    topIssues: Array<{
      category: string
      severity: string
      issue: string
      impact: string
    }>
    metrics: {
      mobileScore: number
      desktopScore: number
      seoScore: number
      accessibilityScore: number
    }
  }
}
```

**実装方法**:
- `digital_scores` テーブルから最新スコアを取得
- `/api/dashboard/swot-analysis` から取得（セッションストレージ優先）
- `diagnostic_reports` テーブルから最新レポートを取得（最大3件）
- `diagnosis_previews` テーブルから最新分析を取得

#### 1.3 添付ファイルの追加

**追加する情報**:
```typescript
interface AttachmentData {
  attachments: Array<{
    id: string
    name: string
    type: string
    size: number
    content?: string // Base64エンコードまたはテキスト抽出
    url?: string // 保存先URL
  }>
}
```

**実装方法**:
- ファイルをSupabase Storageに保存
- テキストファイル（.txt, .csv）は内容を抽出
- PDFファイルはOCRでテキスト抽出（既存のOCR機能を活用）
- 画像ファイルは説明文を生成（Claude Vision API使用）

#### 1.4 新規課題内容の明示

**追加する情報**:
```typescript
interface InitialIssueContext {
  initialIssue: {
    content: string
    category: string
    categoryLabel: string
    createdAt: string
  }
}
```

**実装方法**:
- リクエストボディから `initialIssue` を受け取る
- コンテキストに明示的に含める

---

## 🔧 実装手順

### Step 1: `/api/dify/context` の拡張

**ファイル**: `app/api/dify/context/route.ts`

**変更内容**:
1. `getBaseContext` 関数を拡張
2. 外部情報取得関数を追加
3. 初回評価情報取得関数を追加
4. 型定義を更新

**追加関数**:
```typescript
async function getExternalInformation(
  supabase: any, 
  userId: string
): Promise<ExternalInformation | null>

async function getInitialEvaluationData(
  supabase: any, 
  userId: string
): Promise<InitialEvaluationData | null>
```

### Step 2: 添付ファイル処理の実装

**ファイル**: `app/api/consulting/sessions/[id]/messages/route.ts`

**変更内容**:
1. リクエストボディに `attachments` を追加
2. ファイルアップロード処理を追加
3. ファイル内容の抽出処理を追加
4. Difyコンテキストに添付ファイル情報を追加

**追加処理**:
- Supabase Storageへの保存
- テキスト抽出（PDF, 画像）
- ファイルメタデータの保存

### Step 3: 新規相談開始時の処理拡張

**ファイル**: `app/consulting/start/page.tsx`

**変更内容**:
1. `handleInitialIssueSubmit` 関数を拡張
2. 添付ファイルをリクエストに含める
3. セッション作成時に添付ファイル情報を保存

### Step 4: Difyワークフロー設定

**Dify側の設定**:
1. ワークフローの入力変数を拡張
2. コンテキスト変数の構造を定義
3. プロンプトテンプレートを更新

---

## 📊 データフロー図

```
[InitialIssueModal]
    ↓ (送信ボタンクリック)
[handleInitialIssueSubmit]
    ↓
1. セッション作成 (/api/consulting/sessions)
    - category, initial_message を保存
    ↓
2. 添付ファイル処理
    - ファイルをSupabase Storageに保存
    - ファイル内容を抽出（テキスト/OCR）
    ↓
3. Dify Context取得 (/api/dify/context)
    - 基本情報（既存）
    - 外部情報（追加）
    - 初回評価情報（追加）
    - 添付ファイル情報（追加）
    ↓
4. Dify Chat呼び出し (/api/dify/chat)
    - メッセージ + 拡張コンテキスト
    ↓
5. AI応答取得・保存
```

---

## 🔐 セキュリティ考慮事項

1. **個人情報の取り扱い**
   - 機密情報はDifyに送信しない
   - 必要最小限の情報のみ送信

2. **ファイルアップロード**
   - ファイルサイズ制限（例: 10MB）
   - ファイルタイプ制限（.pdf, .doc, .docx, .xls, .xlsx, .csv, .txt）
   - ウイルススキャン（将来実装）

3. **APIキー管理**
   - Dify APIキーは環境変数で管理
   - クライアント側に露出しない

---

## 📝 実装チェックリスト

### Phase 1: コンテキスト拡張
- [ ] `/api/dify/context` に外部情報取得を追加
- [ ] `/api/dify/context` に初回評価情報取得を追加
- [ ] 型定義を更新
- [ ] エラーハンドリングを追加

### Phase 2: 添付ファイル処理
- [ ] ファイルアップロードAPIを作成
- [ ] Supabase Storageへの保存処理
- [ ] テキスト抽出処理（PDF, 画像）
- [ ] ファイルメタデータの保存

### Phase 3: 新規相談開始処理
- [ ] `handleInitialIssueSubmit` を拡張
- [ ] 添付ファイルをリクエストに含める
- [ ] セッション作成時に添付ファイル情報を保存

### Phase 4: Difyワークフロー設定
- [ ] Difyワークフローの入力変数を定義
- [ ] プロンプトテンプレートを更新
- [ ] テスト・検証

---

## 🎯 期待される効果

1. **より精度の高いAI応答**
   - 豊富なコンテキスト情報により、より適切なアドバイスが可能

2. **パーソナライズされた提案**
   - 会社情報、外部情報、評価情報を統合して、個別最適化された提案

3. **効率的な相談開始**
   - 初回から詳細な情報を提供することで、ヒアリング時間を短縮

---

## 📚 参考資料

- Dify公式ドキュメント: https://docs.dify.ai/
- 既存実装: `/app/api/dify/context/route.ts`
- 既存実装: `/app/api/dify/chat/route.ts`
