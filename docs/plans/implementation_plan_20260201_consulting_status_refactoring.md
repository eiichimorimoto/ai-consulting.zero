# 📝 Implementation Plan: 相談履歴・ステータス管理の改善

**作成日**: 2026-02-01  
**担当**: AI Consulting Zero 開発チーム

---

## プロジェクト構造

```
app/
├── consulting/
│   ├── start/
│   │   └── page.tsx (修正)
│   └── components/
│       ├── ConsultingHeader.tsx (修正)
│       └── SimpleSidebar.tsx (修正)
└── api/
    └── consulting/
        └── sessions/
            └── [id]/
                └── route.ts (修正)
```

---

## タスクリスト

### Task 1: ConsultingHeader の UI 変更
- **目的**: 終了ボタンを「課題継続」「課題完了」の2つに分割
- **依存**: なし
- **成果物**: 
  - `app/consulting/components/ConsultingHeader.tsx` 修正 (保護レベル3)
- **見積もり**: 15分
- **優先度**: 高
- **変更通知必須**: いいえ

**実装内容**:
```tsx
// 1. アイコンのインポート追加
import { Pause, CheckCircle } from 'lucide-react'

// 2. Props の型変更
interface ConsultingHeaderProps {
  onEndSession?: (status: 'active' | 'completed') => void  // 引数追加
}

// 3. ボタンを2つに分割
<div className="flex items-center gap-2">
  {/* 課題継続ボタン */}
  <Button 
    variant="outline" 
    size="sm"
    onClick={() => onEndSession?.('active')}
    className="group shrink-0 gap-2"
  >
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 transition-all group-hover:bg-blue-500">
      <Pause className="h-4 w-4 text-blue-600 transition-all group-hover:text-white" />
    </div>
    <span className="hidden text-muted-foreground transition-colors group-hover:text-blue-600 sm:inline">
      課題継続
    </span>
  </Button>
  
  {/* 課題完了ボタン */}
  <Button 
    variant="default" 
    size="sm"
    onClick={() => onEndSession?.('completed')}
    className="group shrink-0 gap-2"
  >
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 transition-all group-hover:bg-green-500">
      <CheckCircle className="h-4 w-4 text-green-600 transition-all group-hover:text-white" />
    </div>
    <span className="hidden sm:inline">
      課題完了
    </span>
  </Button>
</div>
```

---

### Task 2: SimpleSidebar にフィルター追加
- **目的**: ステータスでセッションをフィルタリング
- **依存**: なし
- **成果物**:
  - `app/consulting/components/SimpleSidebar.tsx` 修正 (保護レベル3)
- **見積もり**: 20分
- **優先度**: 高
- **変更通知必須**: いいえ

**実装内容**:
```tsx
// 1. 必要なインポート追加
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// 2. state 追加
const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('active')

// 3. フィルタリングロジック
const filteredSessions = sessions.filter(session => {
  if (statusFilter === 'all') return true
  return session.status === statusFilter
})

// 各ステータスの件数を計算
const activeCount = sessions.filter(s => s.status === 'active').length
const completedCount = sessions.filter(s => s.status === 'completed').length

// 4. UI追加（セッション一覧の上）
<div className="px-3 py-2 border-b">
  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
    <SelectTrigger className="w-full">
      <SelectValue placeholder="フィルター" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="active">
        相談中 ({activeCount})
      </SelectItem>
      <SelectItem value="completed">
        完了 ({completedCount})
      </SelectItem>
      <SelectItem value="all">
        すべて ({sessions.length})
      </SelectItem>
    </SelectContent>
  </Select>
</div>

// 5. map を filteredSessions に変更
{filteredSessions.map((session) => (
  // ...
))}
```

---

### Task 3: page.tsx の handleEndSession 修正
- **目的**: ステータスを引数で受け取るように変更
- **依存**: Task 1, Task 2
- **成果物**:
  - `app/consulting/start/page.tsx` 修正 (保護レベル2)
- **見積もり**: 15分
- **優先度**: 最高
- **変更通知必須**: はい（レベル2ファイル）

**実装内容**:
```tsx
// handleEndSession の引数追加
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
    
    // 状態クリア
    setCurrentSession(null)
    setMessages([])
    setConversationId(null)
    sessionStorage.removeItem('dify_conversation_id')
    setAttachmentFiles([])
    setContextData(prev => ({ ...prev, attachments: [] }))
    
    // セッション一覧を再取得
    await fetchSessions()
    
    // トースト通知
    toast({
      title: status === 'active' ? '相談を一時中断しました' : '相談を完了しました',
      description: status === 'active' 
        ? '左メニューから再開できます。' 
        : 'お疲れ様でした。また次回もご利用ください。',
    })
  } catch (error) {
    console.error('Failed to update session:', error)
    toast({
      variant: 'destructive',
      title: 'ステータス更新に失敗しました',
      description: 'もう一度お試しいただくか、ページをリロードしてください。',
    })
  }
}
```

---

### Task 4: API Route の PATCH エンドポイント修正
- **目的**: ステータス更新APIの実装
- **依存**: Task 3
- **成果物**:
  - `app/api/consulting/sessions/[id]/route.ts` 修正 (保護レベル2)
- **見積もり**: 25分
- **優先度**: 最高
- **変更通知必須**: はい（レベル2ファイル）

**実装内容**:
```tsx
// PATCH エンドポイントの修正
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // 1. 認証チェック
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // 2. リクエストボディの取得
    const body = await request.json()
    const { status } = body
    
    // 3. バリデーション
    if (!status || !['active', 'completed', 'archived'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: active, completed, archived' },
        { status: 400 }
      )
    }
    
    // 4. セッションの所有者確認
    const { data: session, error: sessionError } = await supabase
      .from('consulting_sessions')
      .select('user_id')
      .eq('id', params.id)
      .single()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // 5. ステータス更新
    const { data: updatedSession, error: updateError } = await supabase
      .from('consulting_sessions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (updateError) {
      throw updateError
    }
    
    console.log(`✅ Session ${params.id} status updated to: ${status}`)
    
    return NextResponse.json({ 
      session: updatedSession,
      message: `Session status updated to ${status}`
    })
  } catch (error) {
    console.error('Failed to update session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 実装順序

```
1. Task 1（レベル3） → 実装 → 動作確認（画面表示のみ）
2. Task 2（レベル3） → 実装 → 動作確認（フィルター動作）
3. Task 3（レベル2） → 変更通知 → 承認待ち → 実装 → 動作確認
4. Task 4（レベル2） → 変更通知 → 承認待ち → 実装 → 動作確認
5. 統合テスト → 全体の動作確認
```

---

## 総見積もり時間
- Task 1: 15分
- Task 2: 20分
- Task 3: 15分
- Task 4: 25分
- 動作確認・調整: 15分

**合計**: 約1時間30分

---

## テスト計画

### Unit Test（手動）

#### Test 1: 課題継続ボタン
```
1. 新規相談を開始
2. メッセージを送信
3. 「課題継続」ボタンをクリック
4. 期待結果:
   - トースト: "相談を一時中断しました"
   - 左メニューの「相談中」に表示される
   - status='active'
```

#### Test 2: 課題完了ボタン
```
1. 新規相談を開始
2. メッセージを送信
3. 「課題完了」ボタンをクリック
4. 期待結果:
   - トースト: "相談を完了しました"
   - 左メニューの「相談中」から消える
   - フィルターを「完了」に変更すると表示される
   - status='completed'
```

#### Test 3: フィルター動作
```
1. 複数の相談セッションを作成（active, completed混在）
2. フィルターで「相談中」を選択
3. 期待結果: active のみ表示
4. フィルターで「完了」を選択
5. 期待結果: completed のみ表示
6. フィルターで「すべて」を選択
7. 期待結果: 全て表示
```

### Integration Test

#### Test 4: フルフロー
```
1. 新規相談開始 (status='active')
2. メッセージを送信
3. 「課題継続」クリック
4. 左メニューから同じセッションを再開
5. メッセージを送信（続き）
6. 「課題完了」クリック
7. 左メニューから消える確認
8. フィルターで「完了」選択
9. 完了したセッションが表示される確認
```

---

## リスク管理

### リスク1: 既存の completed セッション
- **問題**: 既存の completed セッションがデフォルトで非表示になる
- **対策**: フィルターのデフォルトを `'all'` にする（初回のみ）
- **判断**: ユーザーからのフィードバック次第

### リスク2: UI の混乱
- **問題**: 「課題継続」と「課題完了」の違いがわかりにくい
- **対策**: ツールチップ追加（将来対応）

---

## 完了条件

- [ ] Task 1-4 の実装完了
- [ ] Lintエラーなし
- [ ] 手動テスト全てパス
- [ ] Gitコミット完了
- [ ] ユーザーによる動作確認

---

## 次のステップ

Phase 4: IMPLEMENT
- 各タスクを順番に実装
- 動作確認を行う
- ユーザーにフィードバックを依頼
