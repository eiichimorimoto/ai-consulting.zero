# 📝 Implementation Plan: ContextPanel ドラッグ&ドロップ機能

**作成日時**: 2026-01-31
**前提ドキュメント**: 
- brainstorm_20260131_context-panel-drag-drop.md
- design_20260131_context-panel-drag-drop.md

---

## プロジェクト構造

```
app/consulting/
├── start/
│   └── page.tsx ← Task 2で変更
└── components/
    └── ContextPanel.tsx ← Task 1で変更（メイン）
```

---

## タスクリスト

### Task 1: ContextPanel.tsx - ドラッグ&ドロップ機能実装

**目的**: 添付ファイルエリアにドラッグ&ドロップ機能を追加

**依存**: なし

**成果物**: 
- `app/consulting/components/ContextPanel.tsx`（保護レベル3）

**見積もり**: 30分

**優先度**: 最高

**変更通知必須**: いいえ（レベル3）

**詳細実装内容**:

#### 1.1. Props追加（9-29行目付近）
```typescript
interface ContextPanelProps {
  // ... 既存Props
  onFileUpload?: (files: FileList) => void  // 追加
}
```

#### 1.2. Component内部 - State/Ref追加（41行目付近）
```typescript
export function ContextPanel({ ... }: ContextPanelProps) {
  // State追加
  const [isDragging, setIsDragging] = useState(false)
  const [errorMessages, setErrorMessages] = useState<Array<{
    id: string
    type: 'error' | 'warning' | 'info'
    message: string
  }>>([])
  
  // Ref追加
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // ... 既存コード
}
```

#### 1.3. ファイル検証関数追加
```typescript
const validateFiles = useCallback((files: File[]): { valid: File[], errors: string[] } => {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = [
    'text/plain', 'text/csv', 'application/csv', 'text/markdown',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]
  const allowedExtensions = ['.txt', '.csv', '.md', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
  
  const validFiles: File[] = []
  const errors: string[] = []
  
  files.forEach(file => {
    // サイズチェック
    if (file.size > maxSize) {
      errors.push(`${file.name}: ファイルサイズが大きすぎます（最大10MB）`)
      return
    }
    
    // タイプチェック
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const hasValidMimeType = allowedTypes.includes(file.type)
    const hasValidExtension = allowedExtensions.includes(ext)
    
    if (!hasValidMimeType && !hasValidExtension) {
      errors.push(`${file.name}: 対応していない形式です`)
      return
    }
    
    validFiles.push(file)
  })
  
  return { valid: validFiles, errors }
}, [])
```

#### 1.4. イベントハンドラ追加
```typescript
const handleDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
}, [])

const handleDragEnter = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  setIsDragging(true)
}, [])

const handleDragLeave = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  // 子要素のイベントを無視
  if (e.currentTarget.contains(e.relatedTarget as Node)) return
  setIsDragging(false)
}, [])

const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  setIsDragging(false)
  
  const files = Array.from(e.dataTransfer.files)
  if (files.length === 0) return
  
  const { valid, errors } = validateFiles(files)
  
  // エラーメッセージ表示
  if (errors.length > 0) {
    const newErrors = errors.map((msg, i) => ({
      id: `error-${Date.now()}-${i}`,
      type: 'error' as const,
      message: msg
    }))
    setErrorMessages(prev => [...prev, ...newErrors])
  }
  
  // 有効なファイルがあればアップロード
  if (valid.length > 0 && onFileUpload) {
    const dataTransfer = new DataTransfer()
    valid.forEach(file => dataTransfer.items.add(file))
    onFileUpload(dataTransfer.files)
  }
}, [validateFiles, onFileUpload])

const handleClick = useCallback(() => {
  fileInputRef.current?.click()
}, [])

const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files || e.target.files.length === 0) return
  
  const files = Array.from(e.target.files)
  const { valid, errors } = validateFiles(files)
  
  // エラーメッセージ表示
  if (errors.length > 0) {
    const newErrors = errors.map((msg, i) => ({
      id: `error-${Date.now()}-${i}`,
      type: 'error' as const,
      message: msg
    }))
    setErrorMessages(prev => [...prev, ...newErrors])
  }
  
  // 有効なファイルがあればアップロード
  if (valid.length > 0 && onFileUpload) {
    onFileUpload(e.target.files)
  }
  
  // リセット
  e.target.value = ''
}, [validateFiles, onFileUpload])
```

#### 1.5. エラーメッセージ自動削除
```typescript
useEffect(() => {
  if (errorMessages.length === 0) return
  
  const timers = errorMessages.map(err => 
    setTimeout(() => {
      setErrorMessages(prev => prev.filter(e => e.id !== err.id))
    }, 5000)
  )
  
  return () => {
    timers.forEach(timer => clearTimeout(timer))
  }
}, [errorMessages])
```

#### 1.6. UI更新（134-176行目を置き換え）
```tsx
{/* 添付ファイル - 2番目 */}
<Card className="bg-white">
  <CardHeader className="pb-3">
    <CardTitle className="flex items-center gap-2 text-sm font-medium">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
        📎
      </div>
      <span>添付ファイル</span>
      <Badge variant="outline" className="ml-auto">
        {attachments.length}
      </Badge>
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Hidden file input */}
    <input
      ref={fileInputRef}
      type="file"
      className="hidden"
      accept=".txt,.csv,.md,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
      multiple
      onChange={handleFileChange}
    />
    
    {/* エラーメッセージ */}
    {errorMessages.map(err => (
      <div
        key={err.id}
        className="mb-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
      >
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span className="flex-1">{err.message}</span>
      </div>
    ))}
    
    {/* ドロップゾーン */}
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative rounded-lg border-2 border-dashed transition-all cursor-pointer
        ${isDragging 
          ? 'border-primary bg-primary/5' 
          : 'border-muted hover:border-primary/50 hover:bg-muted/30'
        }
        ${attachments.length === 0 ? 'py-8' : 'py-4'}
      `}
    >
      {attachments.length === 0 ? (
        <div className="text-center">
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-xs font-medium text-foreground mb-1">
            ファイルをドロップまたはクリック
          </p>
          <p className="text-[10px] text-muted-foreground">
            .txt, .csv, .md, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx
          </p>
          <p className="text-[10px] text-muted-foreground">
            最大サイズ: 10MB
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((file) => (
            <div 
              key={file.id}
              className="group flex items-center gap-2 rounded-md border bg-white px-2 py-1.5 text-xs hover:bg-muted/50"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-foreground">{file.name}</span>
              {onRemoveAttachment && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveAttachment(file.id)
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            追加でドロップまたはクリック
          </p>
        </div>
      )}
    </div>
  </CardContent>
</Card>
```

#### 1.7. Import追加（7行目付近）
```typescript
import { FileText, Download, Eye, X, Upload, AlertCircle } from 'lucide-react'
```

---

### Task 2: start/page.tsx - Props追加

**目的**: ContextPanelに`onFileUpload`を渡す

**依存**: Task 1

**成果物**: 
- `app/consulting/start/page.tsx`（保護レベル3）

**見積もり**: 5分

**優先度**: 最高

**変更通知必須**: いいえ（レベル3）

**詳細実装内容**:
```typescript
// 459行目付近
<ContextPanel
  digitalScore={contextData.digitalScore}
  issueCount={contextData.issueCount}
  attachments={contextData.attachments}
  proposalStatus={contextData.proposal.status}
  proposalId={contextData.proposal.id}
  industryForecast={industryForecast}
  onFileUpload={handleFileUpload}  // ← 追加
  onViewProposal={() => {
    if (contextData.proposal.id) {
      router.push(`/consulting/reports/${contextData.proposal.id}`)
    }
  }}
  onDownloadProposal={() => {
    // TODO: PDF download
  }}
  onRemoveAttachment={handleRemoveAttachment}
/>
```

---

## 実装順序

1. **Task 1**（レベル3） 
   - ContextPanel.tsxの実装
   - ローカルで動作確認（ファイル選択ダイアログ、検証ロジック）
   
2. **Task 2**（レベル3）
   - start/page.tsxのProps追加
   - 統合テスト（実際のファイルアップロード）

---

## 総見積もり時間

**合計: 約35分**
- Task 1: 30分
- Task 2: 5分

---

## リスク管理

### リスク1: ドラッグイベントのバブリング
- **対策**: `e.stopPropagation()`を各イベントハンドラに追加済み

### リスク2: メモリリーク（タイマー）
- **対策**: `useEffect`の`return`でタイマークリーンアップ

### リスク3: ファイル検証ロジックの不一致
- **対策**: 既存の`InitialIssueModal`と同じロジックを使用

---

## テストケース

### 1. ドラッグ&ドロップ
- [ ] 有効なファイル（.pdf）をドロップ → 添付される
- [ ] 複数ファイルを同時ドロップ → すべて添付される
- [ ] 10MB超過ファイルをドロップ → エラーメッセージ表示
- [ ] 非対応形式（.zip）をドロップ → エラーメッセージ表示
- [ ] ドラッグオーバー時 → 背景色変更

### 2. クリック選択
- [ ] エリアクリック → ファイル選択ダイアログ表示
- [ ] ファイル選択 → 添付される
- [ ] キャンセル → 変化なし

### 3. エラーメッセージ
- [ ] エラーメッセージ表示 → 5秒後に自動消去
- [ ] 複数エラー → すべて表示される
- [ ] エラー後も正常なファイルは添付される

### 4. UI
- [ ] 添付ファイル0件時 → 「ドロップまたはクリック」表示
- [ ] 添付ファイルあり時 → ファイルリスト表示
- [ ] 削除ボタン → ファイル削除される

---

## 動作確認手順

1. **開発サーバー起動**
   ```bash
   npm run dev
   ```

2. **ページアクセス**
   ```
   http://localhost:3000/consulting/start
   ```

3. **テストケース実行**
   - 上記「テストケース」の各項目を実行

---

## 次のステップ

**Implement（実装）フェーズ**へ進む
- Task 1からTask 2の順で実装
- 各タスク完了後に動作確認
