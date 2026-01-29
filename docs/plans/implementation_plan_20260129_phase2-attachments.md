# 📝 Implementation Plan: Phase 2.1 - 添付ファイル対応

**作成日**: 2026-01-29  
**バージョン**: 1.0  
**ステータス**: 計画中

---

## プロジェクト構造

```
ai-consulting-zero/
├── app/
│   ├── api/
│   │   ├── consulting/
│   │   │   └── sessions/
│   │   │       └── route.ts 🔧 修正対象
│   │   └── dify/
│   │       └── context/
│   │           └── route.ts 🔧 修正対象
│   └── consulting/
│       ├── start/
│       │   └── page.tsx 🔧 修正対象
│       └── components/
│           └── InitialIssueModal.tsx 🔧 修正対象
│
├── lib/
│   ├── storage/
│   │   └── upload.ts 📝 新規作成
│   └── file-processing/
│       └── text-extractor.ts 📝 新規作成
│
├── docs/
│   ├── architecture/
│   │   ├── brainstorm_20260129_phase2-attachments.md ✅
│   │   └── design_20260129_phase2-attachments.md ✅
│   └── plans/
│       └── implementation_plan_20260129_phase2-attachments.md ✅
│
└── supabase/
    └── storage/
        └── buckets.sql 📝 新規作成
```

---

## タスクリスト

### Task 1: Supabase Storage設定
**目的**: 添付ファイル保存用バケットを作成

**成果物**:
- `supabase/storage/buckets.sql`（新規作成）
- Supabase Storage バケット: `consulting-attachments`

**依存**: なし  
**見積もり**: 15分  
**優先度**: 最高  
**保護レベル**: 3（新規作成）

**実装内容**:
```sql
-- consulting-attachments バケット作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('consulting-attachments', 'consulting-attachments', false);

-- RLSポリシー: ユーザーは自分のファイルのみアップロード可能
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'consulting-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLSポリシー: ユーザーは自分のファイルのみ閲覧可能
CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'consulting-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLSポリシー: ユーザーは自分のファイルのみ削除可能
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'consulting-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

**手動実行**: Supabaseダッシュボードで実行

---

### Task 2: ファイルアップロードライブラリ実装
**目的**: Supabase Storageへのアップロード処理

**成果物**:
- `lib/storage/upload.ts`（新規作成）

**依存**: Task 1  
**見積もり**: 30分  
**優先度**: 最高  
**保護レベル**: 3（新規作成）

**実装内容**:
```typescript
import { createClient } from '@/lib/supabase/server'

export interface UploadResult {
  path: string
  url: string
  size: number
}

export class FileUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileUploadError'
  }
}

/**
 * ファイル名をサニタイズ
 */
function sanitizeFileName(filename: string): string {
  const ext = filename.split('.').pop() || ''
  const base = filename.replace(/\.[^/.]+$/, '')
  const safe = base
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 100)
  return `${safe}_${Date.now()}.${ext}`
}

/**
 * Supabase Storageにファイルをアップロード
 * 
 * @param file - アップロードするファイル
 * @param userId - ユーザーID
 * @param sessionId - セッションID
 * @returns アップロード結果
 */
export async function uploadFile(
  file: File,
  userId: string,
  sessionId: string
): Promise<UploadResult> {
  try {
    const supabase = await createClient()
    
    // ファイル名をサニタイズ
    const safeName = sanitizeFileName(file.name)
    
    // ストレージパス: {userId}/{sessionId}/{filename}
    const filePath = `${userId}/${sessionId}/${safeName}`
    
    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // アップロード
    const { data, error } = await supabase.storage
      .from('consulting-attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })
    
    if (error) {
      throw new FileUploadError(`Upload failed: ${error.message}`)
    }
    
    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('consulting-attachments')
      .getPublicUrl(data.path)
    
    return {
      path: data.path,
      url: urlData.publicUrl,
      size: file.size,
    }
  } catch (error) {
    if (error instanceof FileUploadError) {
      throw error
    }
    throw new FileUploadError(`Unexpected error: ${error}`)
  }
}
```

---

### Task 3: テキスト抽出ライブラリ実装
**目的**: テキストファイルからの内容抽出

**成果物**:
- `lib/file-processing/text-extractor.ts`（新規作成）

**依存**: なし  
**見積もり**: 20分  
**優先度**: 高  
**保護レベル**: 3（新規作成）

**実装内容**:
```typescript
export interface ExtractionResult {
  content: string
  encoding: string
  preview: string
}

export class TextExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TextExtractionError'
  }
}

/**
 * テキストファイルから内容を抽出
 * 
 * @param file - テキストファイル
 * @returns 抽出結果
 */
export async function extractText(
  file: File
): Promise<ExtractionResult> {
  try {
    // ファイルサイズチェック（1MB超える場合は最初の1MBのみ）
    const maxSize = 1 * 1024 * 1024 // 1MB
    const slice = file.size > maxSize ? file.slice(0, maxSize) : file
    
    // テキスト読み取り
    const text = await slice.text()
    
    // プレビュー（最初の500文字）
    const preview = text.substring(0, 500)
    
    return {
      content: text,
      encoding: 'UTF-8', // 今後自動検出も追加可能
      preview,
    }
  } catch (error) {
    throw new TextExtractionError(`Failed to extract text: ${error}`)
  }
}

/**
 * ファイルタイプがサポート対象か確認
 */
export function isSupportedTextFile(file: File): boolean {
  const supportedTypes = [
    'text/plain',
    'text/csv',
    'application/csv',
  ]
  return supportedTypes.includes(file.type)
}
```

---

### Task 4: フロントエンド修正（InitialIssueModal）
**目的**: ファイルサイズ検証を追加

**成果物**:
- `app/consulting/components/InitialIssueModal.tsx`（修正）

**依存**: なし  
**見積もり**: 15分  
**優先度**: 中  
**保護レベル**: 3

**実装内容**:
```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files.length > 0) {
    const files = Array.from(e.target.files)
    
    // ファイルサイズ検証
    const maxSize = 10 * 1024 * 1024 // 10MB
    const oversizedFiles = files.filter(f => f.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      alert(`以下のファイルはサイズが大きすぎます（10MB以下）:\n${oversizedFiles.map(f => f.name).join('\n')}`)
      e.target.value = ''
      return
    }
    
    // ファイルタイプ検証
    const allowedTypes = ['text/plain', 'text/csv', 'application/csv']
    const invalidFiles = files.filter(f => !allowedTypes.includes(f.type))
    
    if (invalidFiles.length > 0) {
      alert(`以下のファイルは対応していない形式です:\n${invalidFiles.map(f => f.name).join('\n')}`)
      e.target.value = ''
      return
    }
    
    if (onFileUpload) {
      onFileUpload(e.target.files)
      e.target.value = ''
    }
  }
}
```

---

### Task 5: フロントエンド修正（start/page.tsx）
**目的**: FormDataで添付ファイルを送信

**成果物**:
- `app/consulting/start/page.tsx`（修正）

**依存**: Task 4  
**見積もり**: 25分  
**優先度**: 最高  
**保護レベル**: 3

**実装内容**:
```typescript
// 1. Fileオブジェクトを保持するためのstate追加
const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])

// 2. handleFileUpload修正
const handleFileUpload = useCallback(async (files: FileList) => {
  const fileArray = Array.from(files)
  
  // Fileオブジェクトを保存
  setAttachmentFiles(prev => [...prev, ...fileArray])
  
  const newAttachments = fileArray.map((file, index) => ({
    id: `file-${Date.now()}-${index}`,
    name: file.name,
    type: file.type,
    url: URL.createObjectURL(file),
  }))
  
  setContextData(prev => ({
    ...prev,
    attachments: [...prev.attachments, ...newAttachments],
  }))
}, [])

// 3. handleInitialIssueSubmit修正
const handleInitialIssueSubmit = async (issue: string) => {
  if (!pendingCategory) return

  try {
    setIsLoading(true)
    
    // FormData作成
    const formData = new FormData()
    formData.append('category', pendingCategory)
    formData.append('initial_message', issue)
    
    // 添付ファイルを追加
    attachmentFiles.forEach((file, index) => {
      formData.append(`file_${index}`, file)
    })
    
    // セッション作成
    const sessionRes = await fetch('/api/consulting/sessions', {
      method: 'POST',
      body: formData, // JSONではなくFormData
    })
    
    if (!sessionRes.ok) {
      throw new Error('Failed to create session')
    }

    const sessionData = await sessionRes.json()
    const newSession = sessionData.session

    // ... 以降は既存処理 ...
    
    // 成功したら添付ファイルをクリア
    setAttachmentFiles([])
    setContextData(prev => ({ ...prev, attachments: [] }))
    
  } catch (error) {
    console.error('Failed to submit:', error)
    alert('送信に失敗しました')
  } finally {
    setIsLoading(false)
  }
}
```

---

### Task 6: セッションAPI修正
**目的**: FormData受信、ファイル処理、DB保存

**成果物**:
- `app/api/consulting/sessions/route.ts`（修正）

**依存**: Task 2, Task 3  
**見積もり**: 45分  
**優先度**: 最高  
**保護レベル**: 3

**実装内容**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadFile } from '@/lib/storage/upload'
import { extractText, isSupportedTextFile } from '@/lib/file-processing/text-extractor'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // FormData取得
    const formData = await request.formData()
    const category = formData.get('category') as string
    const initialMessage = formData.get('initial_message') as string
    
    // ファイル取得
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value)
      }
    }
    
    // セッション作成
    const { data: session, error: sessionError } = await supabase
      .from('consulting_sessions')
      .insert({
        user_id: user.id,
        category,
        status: 'active',
      })
      .select()
      .single()
    
    if (sessionError || !session) {
      throw new Error('Failed to create session')
    }
    
    // ファイル処理
    const attachments = await Promise.all(
      files.map(async (file) => {
        // サイズ検証
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 10MB`)
        }
        
        // タイプ検証
        if (!isSupportedTextFile(file)) {
          throw new Error(`File ${file.name} is not supported`)
        }
        
        // Storageにアップロード
        const uploadResult = await uploadFile(file, user.id, session.id)
        
        // テキスト抽出
        const extraction = await extractText(file)
        
        return {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: uploadResult.url,
          path: uploadResult.path,
          content: extraction.content,
          preview: extraction.preview,
        }
      })
    )
    
    // 初期メッセージ作成
    const { error: messageError } = await supabase
      .from('consulting_messages')
      .insert({
        session_id: session.id,
        role: 'user',
        content: initialMessage,
        attachments: attachments.length > 0 ? attachments : null,
      })
    
    if (messageError) {
      throw new Error('Failed to create message')
    }
    
    return NextResponse.json({
      success: true,
      session,
      attachments,
    })
    
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### Task 7: `/api/dify/context` 拡張
**目的**: getAttachments関数追加、レスポンスに含める

**成果物**:
- `app/api/dify/context/route.ts`（修正）

**依存**: Task 6  
**見積もり**: 30分  
**優先度**: 最高  
**保護レベル**: 2

**実装内容**:
```typescript
// 型定義追加
interface AttachmentContext {
  id: string
  name: string
  type: string
  size: number
  content: string
  preview: string
  url?: string
}

interface DifyContextResponse {
  success: boolean
  data?: {
    profile: ProfileContext
    company: CompanyContext | null
    webResources: WebResourceContext[]
    businessCards: BusinessCardContext[]
    conversationHistory: ConversationHistoryContext | null
    externalInformation?: ExternalInformation | null
    initialEvaluation?: InitialEvaluationData | null
    initialIssue?: InitialIssue | null
    attachments?: AttachmentContext[] | null // 追加
  }
  error?: string
}

// getAttachments関数追加
async function getAttachments(
  supabase: SupabaseClient,
  sessionId: string
): Promise<AttachmentContext[] | null> {
  try {
    const { data: message, error } = await supabase
      .from('consulting_messages')
      .select('attachments')
      .eq('session_id', sessionId)
      .eq('role', 'user')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    
    if (error) {
      console.error('Error fetching attachments:', error)
      return null
    }
    
    if (!message || !message.attachments) {
      return null
    }
    
    return message.attachments as AttachmentContext[]
  } catch (error) {
    console.error('Error in getAttachments:', error)
    return null
  }
}

// POSTハンドラー修正
export async function POST(request: NextRequest) {
  // ... 既存の認証・バリデーション処理 ...
  
  const body = await request.json()
  const { userId, sessionId, conversationId, isNewCase, initialIssue } = body
  
  // ... 既存のbaseContext取得処理 ...
  
  // 並列処理に getAttachments 追加
  const [baseContext, externalInfo, initialEval, attachments] = await Promise.all([
    getBaseContext(supabase, userId),
    getExternalInformation(supabase, companyId),
    getInitialEvaluationData(supabase, userId, companyId),
    sessionId ? getAttachments(supabase, sessionId) : Promise.resolve(null),
  ])
  
  // ... 既存のconversationHistory処理 ...
  
  return NextResponse.json({
    success: true,
    data: {
      ...baseContext,
      externalInformation: externalInfo,
      initialEvaluation: initialEval,
      attachments: attachments, // 追加
      conversationHistory,
      initialIssue: initialIssueData,
    },
  })
}
```

---

### Task 8: 統合テスト
**目的**: 全体フローの動作確認

**成果物**:
- 動作確認レポート

**依存**: Task 7  
**見積もり**: 30分  
**優先度**: 高  
**保護レベル**: -

**テスト項目**:
1. ✅ ファイル選択（.txt）→ サイズ検証
2. ✅ ファイル選択（10MB超）→ エラー表示
3. ✅ ファイル選択（非対応形式）→ エラー表示
4. ✅ セッション作成 → Storage保存確認
5. ✅ `/api/dify/context` → attachments返却確認
6. ✅ Dify Workflow → コンテキスト受信確認

---

## 総見積もり時間

| Task | 見積もり時間 | 優先度 |
|------|------------|--------|
| Task 1: Supabase Storage設定 | 15分 | 最高 |
| Task 2: ファイルアップロードライブラリ | 30分 | 最高 |
| Task 3: テキスト抽出ライブラリ | 20分 | 高 |
| Task 4: InitialIssueModal修正 | 15分 | 中 |
| Task 5: start/page.tsx修正 | 25分 | 最高 |
| Task 6: セッションAPI修正 | 45分 | 最高 |
| Task 7: /api/dify/context拡張 | 30分 | 最高 |
| Task 8: 統合テスト | 30分 | 高 |
| **合計** | **約3時間30分** | - |

---

## 実装順序

### ボトムアップアプローチ

```
Phase 1: インフラ・ライブラリ（並行可能）
├─ Task 1: Supabase Storage設定
├─ Task 2: ファイルアップロードライブラリ
└─ Task 3: テキスト抽出ライブラリ

Phase 2: フロントエンド（順次実行）
├─ Task 4: InitialIssueModal修正
└─ Task 5: start/page.tsx修正

Phase 3: バックエンド（順次実行）
├─ Task 6: セッションAPI修正
└─ Task 7: /api/dify/context拡張

Phase 4: テスト
└─ Task 8: 統合テスト
```

---

## リスク管理

| リスク | 影響 | 対策 |
|-------|------|------|
| Supabase Storage設定ミス | 高 | 事前にダッシュボード確認 |
| ファイルサイズ超過 | 中 | クライアント・サーバー両方で検証 |
| 文字エンコーディング | 中 | UTF-8のみ対応（Phase 2.1） |
| FormData処理エラー | 高 | 詳細なエラーログ |

---

## 完了条件

### ✅ 実装完了条件
- [ ] Supabase Storageバケット作成完了
- [ ] `lib/storage/upload.ts` 実装完了
- [ ] `lib/file-processing/text-extractor.ts` 実装完了
- [ ] フロントエンドでFormData送信可能
- [ ] セッションAPIでファイル受信・保存可能
- [ ] `/api/dify/context`で添付ファイル情報取得可能

### ✅ テスト完了条件
- [ ] テキストファイル（.txt）アップロード成功
- [ ] CSVファイルアップロード成功
- [ ] ファイルサイズ超過エラー確認
- [ ] 非対応形式エラー確認
- [ ] Storage保存確認
- [ ] Difyコンテキスト送信確認

---

## 次のステップ（Phase 2.2）

1. PDFファイル対応（OCR）
2. Officeファイル対応（新規ライブラリ）
3. ファイル削除機能
4. エラーハンドリング強化
5. ユニットテスト追加
