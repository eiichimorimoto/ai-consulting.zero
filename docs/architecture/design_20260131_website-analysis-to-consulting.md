# 🎨 Design: Webサイト分析結果を相談画面に添付

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│ /dashboard/website-analysis (Webサイト分析ページ)             │
│                                                               │
│  [診断結果表示]                                                │
│                                                               │
│  ┌──────────────────────────────────────────────┐            │
│  │ 「改善について相談する」ボタン                    │            │
│  │   onClick={handleConsultAboutReport}        │            │
│  └──────────────────────────────────────────────┘            │
│         │                                                     │
│         │ 1. sessionStorage.setItem()                        │
│         │    key: 'website_analysis_result'                  │
│         │    value: JSON.stringify(result)                   │
│         │                                                     │
│         │ 2. router.push('/consulting/start')                │
│         ▼                                                     │
└─────────────────────────────────────────────────────────────┘
         │
         │ ページ遷移
         ▼
┌─────────────────────────────────────────────────────────────┐
│ /consulting/start (相談画面)                                  │
│                                                               │
│  useEffect(() => {                                           │
│    // 3. sessionStorageから読み込み                           │
│    const data = sessionStorage.getItem(                      │
│      'website_analysis_result'                               │
│    )                                                          │
│                                                               │
│    if (data) {                                               │
│      // 4. マークダウンファイル生成                           │
│      const mdContent = generateMarkdown(data)                │
│      const blob = new Blob([mdContent], {                    │
│        type: 'text/markdown'                                 │
│      })                                                       │
│      const file = new File([blob], filename, {               │
│        type: 'text/markdown'                                 │
│      })                                                       │
│                                                               │
│      // 5. 添付ファイルに追加                                 │
│      setAttachmentFiles([file])                              │
│      setContextData(prev => ({                               │
│        ...prev,                                              │
│        attachments: [{                                       │
│          id: uniqueId(),                                     │
│          name: filename,                                     │
│          type: 'text/markdown'                               │
│        }]                                                    │
│      }))                                                     │
│                                                               │
│      // 6. sessionStorageクリア                              │
│      sessionStorage.removeItem('website_analysis_result')    │
│    }                                                          │
│  }, [])                                                      │
│                                                               │
│  ┌─────────────────┐  ┌──────────────────────┐             │
│  │  ChatView       │  │  ContextPanel         │             │
│  │                 │  │                       │             │
│  │                 │  │  [添付ファイル表示]   │             │
│  │                 │  │  ✓ website-analysis-  │             │
│  │                 │  │    report.md          │             │
│  └─────────────────┘  └──────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## モジュール構成

### 1. website-analysis/page.tsx
**責務**: 診断結果をsessionStorageに保存し、相談画面へ遷移
**依存**: Next.js Router
**保護レベル**: 3（変更可能）

```typescript
// 新規追加関数
const handleConsultAboutReport = () => {
  if (!result) return
  
  try {
    // sessionStorageに保存
    sessionStorage.setItem('website_analysis_result', JSON.stringify({
      url: result.url,
      overallScore: result.overallScore,
      topIssues: result.topIssues,
      metrics: result.metrics,
      analyzedAt: new Date().toISOString()
    }))
    
    // 相談画面へ遷移
    router.push('/consulting/start')
  } catch (error) {
    console.error('Failed to save analysis result:', error)
    // フォールバック: 通常の遷移
    router.push('/consulting/start')
  }
}

// 既存のボタンを変更
<button
  onClick={handleConsultAboutReport}  // 変更
  className="..."
>
  改善について相談する
</button>
```

### 2. consulting/start/page.tsx
**責務**: sessionStorageから診断結果を読み込み、マークダウンファイルとして添付
**依存**: React hooks, Blob API, File API
**保護レベル**: 2（慎重に扱う）

```typescript
// 診断結果をマークダウンに変換する関数（新規追加）
const generateAnalysisMarkdown = (data: any): string => {
  const { url, overallScore, topIssues, metrics, analyzedAt } = data
  
  let markdown = `# Webサイト分析レポート\n\n`
  markdown += `**分析日時**: ${new Date(analyzedAt).toLocaleString('ja-JP')}\n\n`
  markdown += `**分析URL**: ${url}\n\n`
  markdown += `---\n\n`
  
  // 総合スコア
  markdown += `## 📊 総合スコア\n\n`
  markdown += `**${overallScore}** / 100\n\n`
  
  // メトリクス
  if (metrics) {
    markdown += `## 📈 詳細メトリクス\n\n`
    markdown += `- **モバイルスコア**: ${metrics.mobileScore}\n`
    markdown += `- **デスクトップスコア**: ${metrics.desktopScore}\n`
    markdown += `- **SEOスコア**: ${metrics.seoScore}\n`
    markdown += `- **アクセシビリティスコア**: ${metrics.accessibilityScore}\n\n`
    
    markdown += `### Core Web Vitals\n\n`
    markdown += `- **FCP (初回描画)**: ${(metrics.fcp / 1000).toFixed(2)}秒\n`
    markdown += `- **LCP (最大描画)**: ${(metrics.lcp / 1000).toFixed(2)}秒\n`
    markdown += `- **CLS (レイアウトシフト)**: ${metrics.cls}\n`
    markdown += `- **TTFB (応答時間)**: ${(metrics.ttfb / 1000).toFixed(2)}秒\n`
    markdown += `- **TBT (ブロック時間)**: ${metrics.tbt}ms\n\n`
    
    markdown += `### セキュリティ\n\n`
    markdown += `- **SSL対応**: ${metrics.hasSSL ? '✅ 対応済み' : '❌ 未対応'}\n`
    markdown += `- **モバイル対応**: ${metrics.isMobileFriendly ? '✅ 良好' : '❌ 要改善'}\n\n`
  }
  
  // 課題
  if (topIssues && topIssues.length > 0) {
    markdown += `## ⚠️ 検出された課題\n\n`
    topIssues.forEach((issue: any, index: number) => {
      markdown += `### ${index + 1}. ${issue.issue}\n\n`
      markdown += `- **カテゴリ**: ${issue.category}\n`
      markdown += `- **優先度**: ${issue.severity}\n`
      markdown += `- **影響**: ${issue.impact}\n\n`
    })
  }
  
  markdown += `---\n\n`
  markdown += `このレポートはAI Consulting Zeroで生成されました。\n`
  
  return markdown
}

// useEffect内で読み込み（既存のuseEffectに追加）
useEffect(() => {
  // 既存のコード...
  
  // Webサイト分析結果の読み込み
  const loadWebsiteAnalysisResult = () => {
    try {
      const stored = sessionStorage.getItem('website_analysis_result')
      if (stored) {
        const data = JSON.parse(stored)
        
        // マークダウン生成
        const mdContent = generateAnalysisMarkdown(data)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
        const filename = `website-analysis-report-${timestamp}.md`
        
        // Blobからファイル作成
        const blob = new Blob([mdContent], { type: 'text/markdown' })
        const file = new File([blob], filename, { 
          type: 'text/markdown',
          lastModified: Date.now()
        })
        
        // 添付ファイルに追加
        setAttachmentFiles([file])
        setContextData(prev => ({
          ...prev,
          attachments: [{
            id: `analysis-${Date.now()}`,
            name: filename,
            type: 'text/markdown'
          }]
        }))
        
        // sessionStorageクリア
        sessionStorage.removeItem('website_analysis_result')
        
        console.log('Website analysis report attached:', filename)
      }
    } catch (error) {
      console.error('Failed to load website analysis result:', error)
    }
  }
  
  loadWebsiteAnalysisResult()
}, [])
```

### 3. consulting/components/ContextPanel.tsx
**責務**: 添付ファイルの表示（変更なし）
**依存**: なし
**保護レベル**: 3（参照のみ）

```typescript
// 既存のコードをそのまま使用
// attachments配列をマップして表示
{attachments.map((file) => (
  <div key={file.id} className="...">
    <FileText className="..." />
    <span>{file.name}</span>
    <Button onClick={() => onRemoveAttachment?.(file.id)}>
      <X />
    </Button>
  </div>
))}
```

## 技術選定（プロジェクト制約考慮）

| カテゴリ | 選定技術 | 理由 | 制約 |
|---------|---------|------|------|
| データ受け渡し | sessionStorage | 一時的、軽量、追加依存なし | 5-10MB制限 |
| ファイル生成 | Blob + File API | ブラウザネイティブ | モダンブラウザのみ |
| マークダウン | 手動生成 | ライブラリ不要、軽量 | なし |
| 命名規則 | ISO 8601タイムスタンプ | 一意性、ソート可能 | なし |

## データフロー詳細

### 1. クリック → 保存
```typescript
User clicks "改善について相談する"
  ↓
handleConsultAboutReport()
  ↓
sessionStorage.setItem('website_analysis_result', JSON.stringify({
  url: string
  overallScore: number
  topIssues: [...],
  metrics: {...},
  analyzedAt: ISO 8601 string
}))
  ↓
router.push('/consulting/start')
```

### 2. 読み込み → 添付
```typescript
/consulting/start mounts
  ↓
useEffect(() => { ... }, [])
  ↓
sessionStorage.getItem('website_analysis_result')
  ↓
if (exists) {
  data = JSON.parse(stored)
  mdContent = generateAnalysisMarkdown(data)
  blob = new Blob([mdContent], { type: 'text/markdown' })
  file = new File([blob], filename, {...})
  
  setAttachmentFiles([file])
  setContextData({..., attachments: [...]})
  
  sessionStorage.removeItem('website_analysis_result')
}
```

### 3. 表示
```typescript
ContextPanel receives:
  - attachments: [{ id, name, type }]
  
Renders:
  - FileText icon
  - filename
  - X button (remove)
```

## セキュリティ考慮点

- ✅ sessionStorageは同一オリジン制限（XSS対策）
- ✅ 診断結果に機密情報なし（公開URLのメトリクス）
- ✅ JSON.parse時のtry-catch（エラーハンドリング）
- ✅ sessionStorage使用後すぐにクリア（データ残留防止）

## ファイル変更計画

### 新規作成
なし

### 変更対象
1. **app/dashboard/website-analysis/page.tsx**
   - 追加: `handleConsultAboutReport`関数（約20行）
   - 変更: ボタンの`onClick`（1行）
   - 保護レベル: 3（変更可能）

2. **app/consulting/start/page.tsx**
   - 追加: `generateAnalysisMarkdown`関数（約60行）
   - 追加: `loadWebsiteAnalysisResult`関数（約30行）
   - 変更: 既存`useEffect`内に呼び出し追加（1行）
   - 保護レベル: 2（慎重 - 変更前に影響範囲報告必須）

### 参照のみ
- **app/consulting/components/ContextPanel.tsx**: 変更なし

## エラーハンドリング

| エラーケース | 対処 |
|-------------|------|
| sessionStorage無効 | try-catchでキャッチ、通常遷移 |
| JSON.parse失敗 | try-catchでキャッチ、コンソール警告 |
| Blob/File生成失敗 | try-catchでキャッチ、コンソール警告 |
| resultがnull | 早期リターン |

## パフォーマンス

- sessionStorage読み込み: ~1ms
- マークダウン生成: ~5ms
- Blob/File作成: ~1ms
- **合計**: ~10ms（ユーザー体感なし）

## マークダウンサンプル

```markdown
# Webサイト分析レポート

**分析日時**: 2026年1月31日 10:30:45

**分析URL**: https://example.com

---

## 📊 総合スコア

**75** / 100

## 📈 詳細メトリクス

- **モバイルスコア**: 70
- **デスクトップスコア**: 85
- **SEOスコア**: 80
- **アクセシビリティスコア**: 90

### Core Web Vitals

- **FCP (初回描画)**: 1.50秒
- **LCP (最大描画)**: 2.30秒
- **CLS (レイアウトシフト)**: 0.05
- **TTFB (応答時間)**: 0.60秒
- **TBT (ブロック時間)**: 150ms

### セキュリティ

- **SSL対応**: ✅ 対応済み
- **モバイル対応**: ✅ 良好

## ⚠️ 検出された課題

### 1. 画像の最適化が必要

- **カテゴリ**: performance
- **優先度**: high
- **影響**: ページ読み込み速度が低下しています

### 2. メタタグが不足

- **カテゴリ**: seo
- **優先度**: medium
- **影響**: 検索エンジンの理解が不十分です

---

このレポートはAI Consulting Zeroで生成されました。
```
