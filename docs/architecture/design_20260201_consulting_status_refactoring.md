# 🎨 Design: 相談履歴・ステータス管理の改善

**作成日**: 2026-02-01  
**担当**: AI Consulting Zero 開発チーム

---

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                    ConsultingHeader                         │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ 課題継続     │  │ 課題完了     │                       │
│  │ (Pause Icon) │  │ (Check Icon) │                       │
│  └──────┬───────┘  └──────┬───────┘                       │
│         │                  │                                 │
│         │ status='active'  │ status='completed'            │
└─────────┼──────────────────┼─────────────────────────────────┘
          │                  │
          ▼                  ▼
  ┌───────────────────────────────────┐
  │  PATCH /api/consulting/sessions/  │
  │  [id]                              │
  │  { status: 'active' | 'completed' }│
  └───────────────┬───────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  Supabase DB        │
        │  consulting_sessions│
        │  ├─ id              │
        │  ├─ status          │
        │  └─ updated_at      │
        └─────────┬───────────┘
                  │
                  ▼
          ┌───────────────────┐
          │  SimpleSidebar    │
          │  ┌──────────────┐ │
          │  │ Filter       │ │
          │  │ ├ 相談中    │ │ ← status='active'
          │  │ ├ 完了      │ │ ← status='completed'
          │  │ └ すべて    │ │ ← all
          │  └──────────────┘ │
          │                   │
          │  ┌──────────────┐ │
          │  │ Session List │ │
          │  │ (Filtered)   │ │
          │  └──────────────┘ │
          └───────────────────┘
```

---

## モジュール構成

### 1. ConsultingHeader.tsx
- **責務**: セッション終了時のステータス選択UI
- **依存**: `app/consulting/start/page.tsx` の `handleEndSession`
- **保護レベル**: レベル3（変更可能）

**主な変更点**:
```tsx
interface ConsultingHeaderProps {
  // 変更: onEndSession の型
  onEndSession?: (status: 'active' | 'completed') => void
}

// 2つのボタンを追加
<Button onClick={() => onEndSession?.('active')}>課題継続</Button>
<Button onClick={() => onEndSession?.('completed')}>課題完了</Button>
```

---

### 2. SimpleSidebar.tsx
- **責務**: 相談履歴の表示とフィルタリング
- **依存**: `app/consulting/start/page.tsx` の `sessions` state
- **保護レベル**: レベル3（変更可能）

**主な変更点**:
```tsx
// ステータスフィルター state
const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('active')

// フィルタリングロジック
const filteredSessions = sessions.filter(session => {
  if (statusFilter === 'all') return true
  return session.status === statusFilter
})

// UI: ドロップダウンまたはタブ
<Select value={statusFilter} onValueChange={setStatusFilter}>
  <SelectItem value="active">相談中 ({activeCount})</SelectItem>
  <SelectItem value="completed">完了 ({completedCount})</SelectItem>
  <SelectItem value="all">すべて ({allCount})</SelectItem>
</Select>
```

---

### 3. app/consulting/start/page.tsx
- **責務**: 相談セッションの状態管理
- **依存**: SimpleSidebar, ConsultingHeader, API Route
- **保護レベル**: レベル2（慎重に変更）

**主な変更点**:
```tsx
// handleEndSession の引数を追加
const handleEndSession = async (status: 'active' | 'completed') => {
  if (!currentSession) return
  
  try {
    const res = await fetch(`/api/consulting/sessions/${currentSession.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    
    if (!res.ok) {
      throw new Error(`Failed to update session: ${res.statusText}`)
    }
    
    // ローカル状態をクリア
    setCurrentSession(null)
    setMessages([])
    
    // セッション一覧を再取得
    await fetchSessions()
    
    // トースト通知
    toast({
      title: status === 'active' ? '相談を一時中断しました' : '相談を完了しました',
      description: status === 'active' 
        ? '左メニューから再開できます。' 
        : 'お疲れ様でした。'
    })
  } catch (error) {
    console.error('Failed to update session:', error)
    toast({
      variant: 'destructive',
      title: 'ステータス更新に失敗しました'
    })
  }
}
```

---

### 4. app/api/consulting/sessions/[id]/route.ts
- **責務**: セッションのステータス更新API
- **依存**: Supabase
- **保護レベル**: レベル2（慎重に変更）

**主な変更点**:
```tsx
// PATCH エンドポイントの修正
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { status } = await request.json()
    
    // バリデーション
    if (!['active', 'completed', 'archived'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }
    
    // DB更新
    const { data, error } = await supabase
      .from('consulting_sessions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ session: data })
  } catch (error) {
    console.error('Failed to update session:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}
```

---

## 技術選定（プロジェクト制約考慮）

| カテゴリ | 選定技術 | 理由 | 制約 |
|---------|---------|------|------|
| UI Components | Shadcn/ui `Select` | 既存のデザインシステムと統一 | - |
| アイコン | Lucide React | 既存プロジェクトで使用中 | `Pause`, `CheckCircle` |
| 状態管理 | React useState | シンプルなフィルター状態 | - |
| API | Next.js API Routes | 既存の構造に合わせる | - |
| DB | Supabase | 既存スキーマをそのまま活用 | スキーマ変更不要 |

---

## データフロー

### フロー1: 課題継続ボタンクリック

```
1. User: 「課題継続」ボタンクリック
   ↓
2. ConsultingHeader: onEndSession('active') 呼び出し
   ↓
3. page.tsx: handleEndSession('active') 実行
   ↓
4. API: PATCH /api/consulting/sessions/[id]
   Body: { status: 'active' }
   ↓
5. Supabase: UPDATE consulting_sessions SET status='active'
   ↓
6. Response: { session: {...} }
   ↓
7. page.tsx: 
   - setCurrentSession(null)
   - setMessages([])
   - fetchSessions()
   ↓
8. SimpleSidebar: セッション一覧を再描画（フィルター適用）
   ↓
9. Toast: "相談を一時中断しました"
```

### フロー2: 課題完了ボタンクリック

```
1. User: 「課題完了」ボタンクリック
   ↓
2. ConsultingHeader: onEndSession('completed') 呼び出し
   ↓
3. page.tsx: handleEndSession('completed') 実行
   ↓
4. API: PATCH /api/consulting/sessions/[id]
   Body: { status: 'completed' }
   ↓
5. Supabase: UPDATE consulting_sessions SET status='completed'
   ↓
6. Response: { session: {...} }
   ↓
7. page.tsx: 
   - setCurrentSession(null)
   - setMessages([])
   - fetchSessions()
   ↓
8. SimpleSidebar: セッション一覧を再描画
   - デフォルトフィルター（active）では非表示
   ↓
9. Toast: "相談を完了しました"
```

### フロー3: ステータスフィルター変更

```
1. User: ドロップダウンで「完了」を選択
   ↓
2. SimpleSidebar: setStatusFilter('completed')
   ↓
3. filteredSessions の再計算
   ↓
4. セッション一覧を再描画（status='completed'のみ表示）
```

---

## セキュリティ考慮点

### 1. 認証チェック
- API Routeでユーザー認証を確認
- 自分のセッションのみ更新可能

```tsx
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// セッションの所有者確認
const { data: session } = await supabase
  .from('consulting_sessions')
  .select('user_id')
  .eq('id', params.id)
  .single()

if (session.user_id !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 2. バリデーション
- status の値を厳密にチェック
- SQL インジェクション対策（Supabase Client 使用）

---

## ファイル変更計画

### 新規作成
なし

### 変更対象
1. **app/consulting/components/ConsultingHeader.tsx** - 保護レベル3
   - 終了ボタンを2つに分割
   - アイコン変更（Pause, CheckCircle）

2. **app/consulting/components/SimpleSidebar.tsx** - 保護レベル3
   - ステータスフィルター追加
   - フィルタリングロジック追加

3. **app/consulting/start/page.tsx** - 保護レベル2
   - handleEndSession の引数追加
   - トースト文言変更

4. **app/api/consulting/sessions/[id]/route.ts** - 保護レベル2
   - PATCH エンドポイントの修正
   - バリデーション追加
   - セキュリティチェック追加

### 参照のみ
- `supabase/schema.sql` - 既存スキーマ確認
- `app/consulting/types/consulting.ts` - 型定義確認

---

## 次のステップ

Phase 3: PLAN
- 実装タスクの分解
- 実装順序の決定
- 見積もり時間の算出
