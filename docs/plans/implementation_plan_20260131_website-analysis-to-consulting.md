# 📝 Implementation Plan: Webサイト分析結果を相談画面に添付

## プロジェクト構造

```
app/
├── dashboard/
│   └── website-analysis/
│       └── page.tsx  ← 変更（handleConsultAboutReport追加）
├── consulting/
│   ├── start/
│   │   └── page.tsx  ← 変更（sessionStorage読み込み追加）
│   └── components/
│       └── ContextPanel.tsx  ← 変更なし（参照のみ）
docs/
├── architecture/
│   ├── brainstorm_20260131_website-analysis-to-consulting.md  ← 作成済み
│   └── design_20260131_website-analysis-to-consulting.md  ← 作成済み
└── plans/
    └── implementation_plan_20260131_website-analysis-to-consulting.md  ← このファイル
```

## タスクリスト

### Task 1: website-analysis/page.tsx - sessionStorage保存ロジック追加
- **目的**: 診断結果をsessionStorageに保存し、相談画面へ遷移
- **依存**: なし
- **成果物**:
  - `app/dashboard/website-analysis/page.tsx` 修正（保護レベル3）
  - `handleConsultAboutReport`関数追加（約20行）
  - ボタンの`onClick`変更（1行）
- **見積もり**: 15分
- **優先度**: 高
- **変更通知必須**: いいえ（レベル3ファイル）

**実装内容**:
```typescript
// 1. 関数追加（569行目の前に追加）
const handleConsultAboutReport = () => {
  if (!result) return
  
  try {
    sessionStorage.setItem('website_analysis_result', JSON.stringify({
      url: result.url,
      overallScore: result.overallScore,
      topIssues: result.topIssues,
      metrics: result.metrics,
      analyzedAt: new Date().toISOString()
    }))
    
    router.push('/consulting/start')
  } catch (error) {
    console.error('Failed to save analysis result:', error)
    router.push('/consulting/start')
  }
}

// 2. ボタン変更（569行目）
// 変更前: onClick={() => router.push('/contact')}
// 変更後: onClick={handleConsultAboutReport}
```

---

### Task 2: consulting/start/page.tsx - マークダウン生成関数追加
- **目的**: 診断結果をマークダウン形式に変換する関数を作成
- **依存**: Task 1
- **成果物**:
  - `app/consulting/start/page.tsx` 修正（保護レベル2）
  - `generateAnalysisMarkdown`関数追加（約60行）
- **見積もり**: 20分
- **優先度**: 最高
- **変更通知必須**: はい（レベル2ファイル）

**実装内容**:
```typescript
// page.tsx内のConsultingPage関数の前に追加
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
```

---

### Task 3: consulting/start/page.tsx - sessionStorage読み込みロジック追加
- **目的**: sessionStorageから診断結果を読み込み、ファイル化して添付
- **依存**: Task 2
- **成果物**:
  - `app/consulting/start/page.tsx` 修正（保護レベル2）
  - 既存useEffect内に読み込みロジック追加（約35行）
- **見積もり**: 25分
- **優先度**: 最高
- **変更通知必須**: はい（レベル2ファイル）
- **注意**: 既存のuseEffectを壊さないよう慎重に

**実装内容**:
```typescript
// 既存のuseEffect内に追加（107行目付近のfetchCompany()の後）
useEffect(() => {
  // 既存のコード...
  fetchCompany()
  
  // ★ 以下を追加
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
}, [router])
```

---

### Task 4: 動作確認とテスト
- **目的**: 実装が正しく動作することを確認
- **依存**: Task 1, 2, 3
- **成果物**: テスト結果の確認
- **見積もり**: 15分
- **優先度**: 最高
- **変更通知必須**: なし

**テスト手順**:
1. `/dashboard/website-analysis`でWebサイト分析を実行
2. 分析完了後、「改善について相談する」ボタンをクリック
3. `/consulting/start`へ遷移することを確認
4. 右側のContextPanelに`website-analysis-report-*.md`が添付されていることを確認
5. 添付ファイルの削除ボタン（X）が機能することを確認
6. ブラウザコンソールにエラーがないことを確認

**期待される結果**:
- ✅ ボタンクリックで相談画面に遷移
- ✅ マークダウンファイルが自動添付
- ✅ ファイル名: `website-analysis-report-YYYYMMDD-HHMMSS.md`
- ✅ ContextPanelに表示
- ✅ 削除ボタン機能
- ✅ コンソールエラーなし

---

## 実装順序

```
Task 1（レベル3） 
  → 動作確認
  → Gitコミット
  ↓
Task 2（レベル2）
  → 変更通知 
  → 承認待ち 
  → 実装
  → 動作確認
  ↓
Task 3（レベル2）
  → 変更通知 
  → 承認待ち 
  → 実装
  → 動作確認
  → Gitコミット
  ↓
Task 4（テスト）
  → 全体動作確認
  → Gitコミット
```

## 総見積もり時間

合計: 約1時間15分
- Task 1: 15分
- Task 2: 20分
- Task 3: 25分
- Task 4: 15分

## リスク管理

| リスク | 対策 |
|--------|------|
| useEffectへの追加で既存ロジック破壊 | 最小限の変更、独立した関数で実装 |
| sessionStorageが空 | try-catchでエラーハンドリング |
| JSON.parse失敗 | try-catchでエラーハンドリング |
| ファイル生成失敗 | try-catchでエラーハンドリング |
| 添付ファイル重複 | sessionStorage読み込み後すぐにクリア |

## ファイル保護レベルの確認

- ✅ Task 1: website-analysis/page.tsx（レベル3）- 変更通知不要
- ⚠️ Task 2-3: consulting/start/page.tsx（レベル2）- **変更通知必須**

## 変更通知テンプレート（Task 2-3用）

```markdown
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: 
  - Task 2: 14行目付近（関数定義追加）
  - Task 3: 107行目付近（useEffect内追加）
理由: Webサイト分析結果を添付ファイルとして自動追加
影響: 
  - 既存のuseEffectに読み込みロジックを追加
  - 独立した関数で実装するため、既存ロジックへの影響は最小限
  - エラーハンドリング実装済み
保護レベル: 2（慎重）

実装内容:
1. generateAnalysisMarkdown関数を追加（60行）
2. useEffect内にloadWebsiteAnalysisResult関数を追加（35行）

この変更を実行してよろしいですか？
```

## 完了条件

- [x] Brainstormドキュメント作成
- [x] Designドキュメント作成
- [x] Planドキュメント作成
- [ ] Task 1実装
- [ ] Task 2-3実装（変更通知→承認→実装）
- [ ] Task 4テスト
- [ ] Gitコミット
