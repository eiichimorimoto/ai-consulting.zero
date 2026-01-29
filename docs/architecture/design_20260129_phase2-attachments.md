# 🎨 Design: Phase 2.1 - 添付ファイル対応（基本実装）

**作成日**: 2026-01-29  
**対象**: テキストファイル（.txt, .csv）のアップロード・処理・Dify送信

---

## アーキテクチャ図

```
[クライアント]
    ↓
┌─────────────────────────────────────────────────┐
│ InitialIssueModal                               │
│  - ファイル選択（サイズ・タイプ検証）           │
│  - FormData作成                                 │
└─────────────────────────────────────────────────┘
    ↓ POST /api/consulting/sessions
    │ { category, initial_message, attachments }
    ↓
┌─────────────────────────────────────────────────┐
│ /api/consulting/sessions (route.ts)            │
│  1. ファイルサイズ・タイプ検証                  │
│  2. Supabase Storageにアップロード              │
│  3. テキスト抽出（lib/file-processing）         │
│  4. セッション作成                              │
│  5. メタデータをconsulting_messagesに保存       │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ Supabase                                        │
│  - Storage: consulting-attachments バケット     │
│  - DB: consulting_messages.attachments (JSONB)  │
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ /api/dify/context (route.ts)                   │
│  - getAttachments() 関数追加                    │
│  - attachments配列を返却（テキスト抽出結果含む）│
└─────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────┐
│ Dify Workflow                                   │
│  - コンテキストに添付ファイル情報を含める       │
└─────────────────────────────────────────────────┘
```

---

## モジュール構成

### 1. ファイルアップロードライブラリ
**パス**: `lib/storage/upload.ts`

**責務**:
- Supabase Storageへのファイルアップロード
- ファイル名のサニタイズ
- エラーハンドリング

**依存**:
- `@supabase/supabase-js`
- `lib/supabase/server.ts`

**インターフェース**:
```typescript
export interface UploadResult {
  path: string
  url: string
  size: number
}

export async function uploadFile(
  file: File,
  userId: string,
  sessionId: string
): Promise<UploadResult>
```

---

### 2. テキスト抽出ライブラリ
**パス**: `lib/file-processing/text-extractor.ts`

**責務**:
- テキストファイル（.txt, .csv）からの内容読み取り
- 文字エンコーディング検出
- 大容量ファイルの要約（将来実装）

**依存**:
- なし（Node.js標準API）

**インターフェース**:
```typescript
export interface ExtractionResult {
  content: string
  encoding: string
  preview: string // 最初の500文字
}

export async function extractText(
  file: File
): Promise<ExtractionResult>
```

---

### 3. フロントエンド修正
**パス**: `app/consulting/start/page.tsx`

**変更内容**:
1. `handleInitialIssueSubmit`で`FormData`作成
2. 添付ファイルを`FormData`に追加
3. エラーハンドリング強化

**修正箇所**:
```typescript
// 修正前
body: JSON.stringify({
  category: pendingCategory,
  initial_message: issue,
})

// 修正後
const formData = new FormData()
formData.append('category', pendingCategory)
formData.append('initial_message', issue)
contextData.attachments.forEach((attachment, index) => {
  // ファイルオブジェクトを取得（保存しておく必要あり）
  formData.append(`file_${index}`, attachment.file)
})
```

---

### 4. セッションAPI修正
**パス**: `app/api/consulting/sessions/route.ts`

**変更内容**:
1. `request.formData()`でファイル受信
2. ファイルサイズ・タイプ検証
3. Supabase Storageにアップロード
4. テキスト抽出
5. `consulting_messages.attachments`に保存

**処理フロー**:
```typescript
export async function POST(request: NextRequest) {
  // 1. FormData取得
  const formData = await request.formData()
  
  // 2. ファイル検証
  const files = formData.getAll('file_*') as File[]
  validateFiles(files) // サイズ・タイプチェック
  
  // 3. セッション作成（既存処理）
  const session = await createSession(...)
  
  // 4. ファイル処理
  const attachments = await Promise.all(
    files.map(async (file) => {
      // Storageアップロード
      const uploadResult = await uploadFile(file, userId, session.id)
      
      // テキスト抽出
      const extraction = await extractText(file)
      
      return {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: uploadResult.url,
        content: extraction.content,
        preview: extraction.preview,
      }
    })
  )
  
  // 5. 初期メッセージ作成（attachments含む）
  await supabase
    .from('consulting_messages')
    .insert({
      session_id: session.id,
      role: 'user',
      content: initial_message,
      attachments: attachments, // JSONB
    })
  
  return NextResponse.json({ session, attachments })
}
```

---

### 5. `/api/dify/context` 拡張
**パス**: `app/api/dify/context/route.ts`

**追加内容**:
1. `getAttachments`関数を追加
2. `DifyContextResponse`インターフェースに`attachments`追加
3. POSTハンドラーで`getAttachments`を呼び出し

**実装**:
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
  // 既存フィールド...
  attachments?: AttachmentContext[] | null // 追加
}

// 関数追加
async function getAttachments(
  supabase: SupabaseClient,
  sessionId: string
): Promise<AttachmentContext[] | null> {
  try {
    // 最初のユーザーメッセージから添付ファイル取得
    const { data: message, error } = await supabase
      .from('consulting_messages')
      .select('attachments')
      .eq('session_id', sessionId)
      .eq('role', 'user')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    
    if (error || !message || !message.attachments) {
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
  // ... 既存処理 ...
  
  const [baseContext, externalInfo, initialEval, attachments] = await Promise.all([
    getBaseContext(supabase, userId),
    getExternalInformation(supabase, companyId),
    getInitialEvaluationData(supabase, userId, companyId),
    sessionId ? getAttachments(supabase, sessionId) : Promise.resolve(null), // 追加
  ])
  
  return NextResponse.json({
    success: true,
    data: {
      ...baseContext,
      externalInformation: externalInfo,
      initialEvaluation: initialEval,
      attachments: attachments, // 追加
      conversationHistory,
      initialIssue,
    },
  })
}
```

---

## 技術選定（プロジェクト制約考慮）

| カテゴリ | 選定技術 | 理由 | 制約 |
|---------|---------|------|------|
| **ファイルストレージ** | Supabase Storage | 既存インフラ、大容量対応 | バケット作成必要 |
| **ファイル検証** | Next.js標準API | 追加ライブラリ不要 | - |
| **テキスト抽出** | Node.js標準API | 軽量、依存なし | .txt, .csvのみ |
| **データ保存** | JSONB (consulting_messages) | 既存スキーマ活用 | 10MB制限 |
| **フォームデータ** | Web FormData API | Next.js 16標準 | - |

---

## データフロー

### 1. ファイルアップロード
```
[クライアント]
  → FormData作成
  → POST /api/consulting/sessions
    → ファイル検証（サイズ・タイプ）
    → Supabase Storage アップロード
      → パス: consulting-attachments/{userId}/{sessionId}/{filename}
    → テキスト抽出
    → consulting_messages.attachments (JSONB) 保存
```

### 2. Difyコンテキスト取得
```
[Dify Workflow]
  → GET /api/dify/context?userId={userId}&sessionId={sessionId}
    → getAttachments(sessionId)
      → consulting_messages テーブルクエリ
      → attachments (JSONB) 取得
    → レスポンス返却
      → attachments配列（テキスト内容含む）
```

---

## セキュリティ考慮点

### 1. ファイル検証（2段階）

**クライアント側** (`InitialIssueModal`):
```typescript
function validateClientSide(file: File): boolean {
  // サイズチェック
  if (file.size > 10 * 1024 * 1024) { // 10MB
    alert('ファイルサイズは10MB以下にしてください')
    return false
  }
  
  // タイプチェック
  const allowedTypes = [
    'text/plain',
    'text/csv',
    'application/csv',
  ]
  if (!allowedTypes.includes(file.type)) {
    alert('対応していないファイル形式です')
    return false
  }
  
  return true
}
```

**サーバー側** (`/api/consulting/sessions`):
```typescript
function validateServerSide(file: File): void {
  // サイズ再検証
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size exceeds 10MB')
  }
  
  // MIMEタイプ検証
  const allowedTypes = ['text/plain', 'text/csv', 'application/csv']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported file type')
  }
  
  // ファイル名検証（特殊文字削除）
  const safeName = sanitizeFileName(file.name)
}
```

### 2. Supabase Storage RLS

**バケット設定**:
- バケット名: `consulting-attachments`
- Public: `false`（認証必須）

**RLSポリシー**:
```sql
-- ユーザーは自分のファイルのみアップロード可能
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'consulting-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ユーザーは自分のファイルのみ閲覧可能
CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'consulting-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 3. ファイル名サニタイズ

```typescript
function sanitizeFileName(filename: string): string {
  // 拡張子を保持
  const ext = filename.split('.').pop()
  const base = filename.replace(/\.[^/.]+$/, '')
  
  // 安全な文字のみ許可
  const safe = base
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 100)
  
  return `${safe}_${Date.now()}.${ext}`
}
```

---

## エラーハンドリング

### クライアント側
```typescript
try {
  const response = await fetch('/api/consulting/sessions', {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to upload')
  }
} catch (error) {
  console.error('Upload failed:', error)
  alert('ファイルのアップロードに失敗しました')
}
```

### サーバー側
```typescript
export async function POST(request: NextRequest) {
  try {
    // ファイル処理
    const files = await processFiles(formData)
  } catch (error) {
    if (error instanceof FileSizeError) {
      return NextResponse.json(
        { error: 'File size exceeds limit' },
        { status: 400 }
      )
    }
    if (error instanceof FileTypeError) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## ファイル変更計画

### 新規作成
| ファイル | 目的 | 保護レベル |
|---------|------|----------|
| `lib/storage/upload.ts` | Supabase Storageアップロード | 3 |
| `lib/file-processing/text-extractor.ts` | テキスト抽出 | 3 |

### 変更対象
| ファイル | 変更内容 | 保護レベル |
|---------|---------|----------|
| `app/consulting/start/page.tsx` | FormData作成、エラーハンドリング | 3 |
| `app/consulting/components/InitialIssueModal.tsx` | ファイルサイズ検証追加 | 3 |
| `app/api/consulting/sessions/route.ts` | ファイル受信・処理 | 3 |
| `app/api/dify/context/route.ts` | getAttachments追加 | 2 |

### 参照のみ
| ファイル | 参照目的 |
|---------|---------|
| `lib/supabase/server.ts` | Supabase client作成 |
| `supabase/schema.sql` | テーブル構造確認 |

---

## パフォーマンス考慮

### 1. ファイルサイズ制限
- **クライアント**: 選択時にリアルタイム検証
- **サーバー**: Next.js `bodyParser` 制限（15MB）

### 2. 並列処理
```typescript
// ✅ 良い例 - 並列処理
const attachments = await Promise.all(
  files.map(processFile)
)

// ❌ 悪い例 - 直列処理
for (const file of files) {
  await processFile(file)
}
```

### 3. テキスト抽出の最適化
- 大容量ファイル（>1MB）: 最初の100KB のみ抽出
- 文字エンコーディング自動検出（UTF-8, Shift_JIS等）

---

## テスト戦略

### ユニットテスト
1. `lib/storage/upload.ts`: ファイル名サニタイズ
2. `lib/file-processing/text-extractor.ts`: テキスト抽出
3. `/api/consulting/sessions`: ファイル検証ロジック

### 統合テスト
1. クライアント → サーバー: FormData送信
2. Supabase Storage: アップロード・ダウンロード
3. `/api/dify/context`: 添付ファイル情報取得

### E2Eテスト（Phase 2.2）
1. ファイル選択 → アップロード → Dify送信
2. エラーケース（サイズ超過、タイプ不正）

---

## まとめ

Phase 2.1では、テキストファイル（.txt, .csv）の基本的なアップロード・処理・Dify送信機能を実装します。

**主要コンポーネント**:
1. `lib/storage/upload.ts` - Supabase Storage統合
2. `lib/file-processing/text-extractor.ts` - テキスト抽出
3. フロントエンド - FormData作成
4. セッションAPI - ファイル受信・処理
5. `/api/dify/context` - getAttachments関数

**セキュリティ**:
- 2段階検証（クライアント・サーバー）
- RLS（Row Level Security）
- ファイル名サニタイズ

**次のステップ**: **Planフェーズ** - タスク分解と実装順序の決定
