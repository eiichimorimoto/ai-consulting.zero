# 📝 Implementation Plan: Start画面の状態永続化

> 作成日: 2026-02-05
> Phase: Plan（実装計画）
> 前フェーズ: Design完了、ファクトチェック完了

---

## プロジェクト構造

### 既存ファイル
```
app/
├── consulting/
│   └── start/
│       └── page.tsx                    # Start画面（保護レベル3）
├── api/
│   └── consulting/
│       └── sessions/
│           ├── route.ts                # セッション一覧API（保護レベル2）
│           └── [id]/
│               └── messages/
│                   └── route.ts        # メッセージAPI（保護レベル2）
hooks/
├── useConsultingSession.ts             # セッション管理（保護レベル3）
└── useMessageHandlers.ts               # メッセージ処理（保護レベル3）
types/
├── database.types.ts                   # Supabase型定義（保護レベル3）
└── consulting.ts                       # アプリ型定義（保護レベル3）
supabase/
└── schema.sql                          # DBスキーマ（保護レベル2）
```

### 新規作成ファイル
```
supabase/
└── migrations/
    └── 20260205_add_conversation_id.sql  # マイグレーション
lib/
└── utils/
    └── session-storage.ts               # sessionStorage操作
```

---

## タスクリスト

### Task 1: Supabaseマイグレーション作成
- **目的**: `consulting_sessions`テーブルに`conversation_id`カラム追加
- **依存**: なし
- **成果物**: `supabase/migrations/20260205_add_conversation_id.sql`
- **見積もり**: 15分
- **優先度**: 最高
- **変更通知必須**: はい（DB変更）
- **ファクトチェック**: SQLシンタックス、インデックス設計

**実装内容**:
```sql
-- conversation_id カラム追加
ALTER TABLE consulting_sessions 
ADD COLUMN conversation_id TEXT NULL;

-- インデックス追加（検索高速化）
CREATE INDEX idx_consulting_sessions_conversation_id 
ON consulting_sessions(conversation_id);

-- コメント追加（ドキュメント）
COMMENT ON COLUMN consulting_sessions.conversation_id 
IS 'Dify Chat APIの会話履歴ID。会話の文脈を維持するために使用。';
```

---

### Task 2: マイグレーション実行
- **目的**: Supabaseに変更を適用
- **依存**: Task 1
- **成果物**: DB更新完了
- **見積もり**: 5分
- **優先度**: 最高
- **変更通知必須**: はい（本番DB変更）
- **ファクトチェック**: 実行前にバックアップ確認、ロールバック手順確認

**実行コマンド**:
```bash
# Supabase CLIで実行（ローカル開発環境）
supabase db reset

# または、Supabase Studioで実行
# SQL Editorで上記SQLを実行
```

**確認コマンド**:
```sql
-- カラムが追加されたか確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'consulting_sessions' 
AND column_name = 'conversation_id';
```

---

### Task 3: 型定義更新（database.types.ts）
- **目的**: Supabaseの型定義に`conversation_id`を追加
- **依存**: Task 2
- **成果物**: `types/database.types.ts`更新
- **見積もり**: 10分
- **優先度**: 高
- **変更通知必須**: いいえ（自動ツール）
- **ファクトチェック**: 型の一貫性、nullableの確認

**実装内容**:
```typescript
// types/database.types.ts
consulting_sessions: {
  Row: {
    id: string
    user_id: string
    // ... 既存フィールド ...
    conversation_id: string | null  // ← 追加
  }
  Insert: {
    // ...
    conversation_id?: string | null  // ← 追加
  }
  Update: {
    // ...
    conversation_id?: string | null  // ← 追加
  }
}
```

**生成方法**:
```bash
# Supabase CLIで型生成
npx supabase gen types typescript --local > types/database.types.ts
```

---

### Task 4: 型定義更新（consulting.ts）
- **目的**: `SessionData`型に`conversationId`を追加
- **依存**: Task 3
- **成果物**: `types/consulting.ts`更新
- **見積もり**: 5分
- **優先度**: 高
- **変更通知必須**: いいえ
- **ファクトチェック**: 既存コードとの互換性

**実装内容**:
```typescript
// types/consulting.ts
export type SessionData = {
  id: string;
  name: string;
  progress: number;
  currentStepId: number;
  messages: Message[];
  kpis: KPI[];
  steps: ConsultingStep[];
  lastUpdated: Date;
  createdAt: Date;
  isPinned: boolean;
  isOpen: boolean;
  status: SessionStatus;
  completedAt?: Date;
  conversationId?: string;  // ← 追加
};

export type ApiSession = {
  id: string;
  title: string;
  status: string | null;
  current_round: number | null;
  max_rounds: number | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  conversation_id: string | null;  // ← 追加
};
```

---

### Task 5: sessionStorageユーティリティ作成
- **目的**: sessionStorage操作を安全に行う関数
- **依存**: なし
- **成果物**: `lib/utils/session-storage.ts`（新規作成）
- **見積もり**: 20分
- **優先度**: 中
- **変更通知必須**: いいえ
- **ファクトチェック**: エラーハンドリング、型安全性

**実装内容**:
```typescript
// lib/utils/session-storage.ts

/**
 * Start画面の状態を保存する型
 */
type ConsultingState = {
  userChoice: 'new' | 'existing' | null;
  activeSessionId: string;
  openSessionIds: string[];
  lastActivity: number;
};

const STATE_KEY = 'consulting_state';
const CONVERSATION_PREFIX = 'conversation_';

/**
 * sessionStorageに状態を保存
 */
export function saveConsultingState(state: ConsultingState): void {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save consulting state:', error);
  }
}

/**
 * sessionStorageから状態を復元
 */
export function loadConsultingState(): ConsultingState | null {
  try {
    const saved = sessionStorage.getItem(STATE_KEY);
    if (!saved) return null;
    
    const state = JSON.parse(saved) as ConsultingState;
    
    // 24時間以上古い状態は破棄
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (Date.now() - state.lastActivity > ONE_DAY) {
      clearConsultingState();
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Failed to load consulting state:', error);
    return null;
  }
}

/**
 * sessionStorageの状態をクリア
 */
export function clearConsultingState(): void {
  try {
    sessionStorage.removeItem(STATE_KEY);
    // conversation_idもクリア
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(CONVERSATION_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear consulting state:', error);
  }
}

/**
 * セッションのconversation_idを保存
 */
export function saveConversationId(sessionId: string, conversationId: string): void {
  try {
    sessionStorage.setItem(`${CONVERSATION_PREFIX}${sessionId}`, conversationId);
  } catch (error) {
    console.error('Failed to save conversation_id:', error);
  }
}

/**
 * セッションのconversation_idを取得
 */
export function loadConversationId(sessionId: string): string | null {
  try {
    return sessionStorage.getItem(`${CONVERSATION_PREFIX}${sessionId}`);
  } catch (error) {
    console.error('Failed to load conversation_id:', error);
    return null;
  }
}
```

---

### Task 6: APIルート修正（conversation_id保存）
- **目的**: Difyから返ってきたconversation_idをSupabaseに保存
- **依存**: Task 2, 3, 4
- **成果物**: `app/api/consulting/sessions/[id]/messages/route.ts`更新
- **見積もり**: 30分
- **優先度**: 最高
- **変更通知必須**: はい（レベル2ファイル）
- **ファクトチェック**: SQL injection対策、エラーハンドリング

**変更箇所**: 行258-273（セッション更新部分）

**変更前**:
```typescript
const { error: updateError } = await supabase
  .from('consulting_sessions')
  .update({ 
    current_round: newRound,
    updated_at: new Date().toISOString()
  })
  .eq('id', sessionId)
```

**変更後**:
```typescript
const updateData: any = {
  current_round: newRound,
  updated_at: new Date().toISOString()
};

// Difyから返ってきたconversation_idがあれば保存
if (newConversationId) {
  updateData.conversation_id = newConversationId;
}

const { error: updateError } = await supabase
  .from('consulting_sessions')
  .update(updateData)
  .eq('id', sessionId)
```

---

### Task 7: APIルート修正（GET時にconversation_id返却）
- **目的**: セッション取得APIでconversation_idを含める
- **依存**: Task 6
- **成果物**: `app/api/consulting/sessions/route.ts`確認（既に返却されているか確認）
- **見積もり**: 15分
- **優先度**: 高
- **変更通知必須**: 確認後、必要に応じて
- **ファクトチェック**: レスポンス形式、既存コードとの互換性

**確認内容**:
```typescript
// app/api/consulting/sessions/route.ts
// GETレスポンスにconversation_idが含まれているか確認

// 期待される形式
{
  sessions: [
    {
      id: "...",
      title: "...",
      conversation_id: "dify-conv-abc",  // ← これが含まれているか？
      // ...
    }
  ]
}
```

---

### Task 8: useConsultingSession修正（sessionStorage保存）
- **目的**: 状態変更時にsessionStorageに保存
- **依存**: Task 5
- **成果物**: `hooks/useConsultingSession.ts`更新
- **見積もり**: 45分
- **優先度**: 高
- **変更通知必須**: いいえ
- **ファクトチェック**: ✅ 無限ループ防止策追加、パフォーマンス確認

**実装内容**:
```typescript
// hooks/useConsultingSession.ts

import { useRef } from 'react';
import { 
  saveConsultingState, 
  loadConsultingState, 
  saveConversationId 
} from '@/lib/utils/session-storage';

export function useConsultingSession(options: UseConsultingSessionOptions) {
  // ... 既存のstate定義 ...

  // 前回の状態を保持（無限ループ防止）
  const prevStateRef = useRef<ConsultingState | null>(null);

  // 初回読み込み時に復元
  useEffect(() => {
    const saved = loadConsultingState();
    if (saved) {
      setUserChoice(saved.userChoice);
      setActiveSessionId(saved.activeSessionId);
      // openSessionIdsの復元は、allSessionsが読み込まれた後に処理
    }
  }, []); // ← 空配列（初回のみ）

  // 状態変更時に保存（無限ループ防止）
  useEffect(() => {
    if (userChoice === null) return; // 初期状態は保存しない
    
    const currentState: ConsultingState = {
      userChoice,
      activeSessionId,
      openSessionIds: openSessions.map(s => s.id),
      lastActivity: Date.now(),
    };
    
    // 前回と比較（変更があった場合のみ保存）
    if (
      prevStateRef.current?.userChoice !== currentState.userChoice ||
      prevStateRef.current?.activeSessionId !== currentState.activeSessionId ||
      JSON.stringify(prevStateRef.current?.openSessionIds) !== JSON.stringify(currentState.openSessionIds)
    ) {
      saveConsultingState(currentState);
      prevStateRef.current = currentState;
    }
  }, [userChoice, activeSessionId, openSessions]);

  // conversation_idをsessionStorageにキャッシュ（無限ループ防止）
  useEffect(() => {
    allSessions.forEach(session => {
      if (session.conversationId) {
        // 前回と同じならスキップ
        const cached = loadConversationId(session.id);
        if (cached !== session.conversationId) {
          saveConversationId(session.id, session.conversationId);
        }
      }
    });
  }, [allSessions.map(s => `${s.id}:${s.conversationId}`).join(',')]); // ← 文字列化して安定化

  // ... 既存のハンドラー ...
}
```

**無限ループ防止策**:
1. ✅ `useRef`で前回の状態を保持
2. ✅ 変更がある場合のみ保存
3. ✅ 依存配列を文字列化して安定化

---

### Task 9: useMessageHandlers修正（API呼び出し実装）
- **目的**: モック実装を本物のAPI呼び出しに置き換え
- **依存**: Task 6, 7, 8
- **成果物**: `hooks/useMessageHandlers.ts`更新
- **見積もり**: 60分
- **優先度**: 最高
- **変更通知必須**: いいえ
- **ファクトチェック**: エラーハンドリング、楽観的UI更新、ロールバック

**変更箇所**: 行57-100（handleSendMessage全体）

**変更前**:
```typescript
const handleSendMessage = async () => {
  // ... 入力チェック ...
  
  // ローカルstateにのみ追加
  setAllSessions(allSessions.map(s =>
    s.id === activeSessionId
      ? { ...s, messages: [...(s.messages ?? []), newMessage], lastUpdated: new Date() }
      : s
  ));
  
  // ダミーAI応答
  setTimeout(() => {
    const aiResponse: Message = { /* ... */ };
    setAllSessions(/* ... */);
  }, 1000);
};
```

**変更後**:
```typescript
import { loadConversationId, saveConversationId } from '@/lib/utils/session-storage';

const handleSendMessage = async () => {
  if (!currentSession) return;
  if (!inputValue.trim() && attachedFiles.length === 0) return;

  let messageContent = inputValue;

  // 添付ファイルがあればファイル名を追記
  if (attachedFiles.length > 0) {
    const fileNames = attachedFiles.map(f => f.name).join(", ");
    messageContent += `\n\n添付ファイル: ${fileNames}`;
  }

  const msgLen = currentSession?.messages?.length ?? 0;
  const tempUserMessage: Message = {
    id: msgLen + 1,
    type: "user",
    content: messageContent,
    timestamp: new Date(),
  };

  // 楽観的UI更新（即座に表示）
  setAllSessions(allSessions.map(s =>
    s.id === activeSessionId
      ? { ...s, messages: [...(s.messages ?? []), tempUserMessage], lastUpdated: new Date() }
      : s
  ));
  
  const originalInput = inputValue;
  setInputValue("");
  clearFiles();
  resetTranscript();

  try {
    // sessionStorageからconversation_id取得（高速）
    let conversationId = loadConversationId(currentSession.id);
    
    // なければReact Stateから
    if (!conversationId && currentSession.conversationId) {
      conversationId = currentSession.conversationId;
    }

    // API呼び出し
    const res = await fetch(`/api/consulting/sessions/${currentSession.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: messageContent,
        conversationId  // Difyに渡す
      }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }

    const data = await res.json();
    
    // conversation_idをsessionStorageにキャッシュ
    if (data.conversation_id) {
      saveConversationId(currentSession.id, data.conversation_id);
    }
    
    // React State更新（サーバーの応答で上書き）
    setAllSessions(allSessions.map(s =>
      s.id === activeSessionId
        ? { 
            ...s, 
            messages: data.messages || s.messages,
            conversationId: data.conversation_id,
            lastUpdated: new Date()
          }
        : s
    ));

  } catch (error) {
    console.error('Failed to send message:', error);
    
    // エラー時は楽観的更新をロールバック
    setAllSessions(allSessions.map(s =>
      s.id === activeSessionId
        ? { ...s, messages: s.messages.filter(m => m.id !== tempUserMessage.id) }
        : s
    ));
    
    // 入力内容を復元
    setInputValue(originalInput);
    
    // エラー通知
    toast.error('メッセージ送信に失敗しました', {
      description: 'もう一度お試しください。'
    });
  }
};
```

---

### Task 10: mapApiSessionsToSessionData修正
- **目的**: APIレスポンスからconversationIdをマッピング
- **依存**: Task 4
- **成果物**: `app/consulting/start/page.tsx`更新
- **見積もり**: 15分
- **優先度**: 高
- **変更通知必須**: いいえ
- **ファクトチェック**: マッピングロジック、null処理

**変更箇所**: 行58-108（mapApiSessionsToSessionData関数）

**変更内容**:
```typescript
return {
  id: api.id,
  name: api.title || "相談",
  progress,
  currentStepId: Math.min(currentRound + 1, maxRounds),
  lastUpdated,
  createdAt,
  isPinned: false,
  isOpen: index < MAX_OPEN_TABS,
  status,
  messages: [],
  kpis: [ /* ... */ ],
  steps,
  completedAt,
  conversationId: api.conversation_id || undefined,  // ← 追加
};
```

---

### Task 11: ログアウト時のクリーンアップ
- **目的**: ログアウト時にsessionStorageをクリア
- **依存**: Task 5
- **成果物**: `components/LogoutButton.tsx`更新
- **見積もり**: 10分
- **優先度**: 中
- **変更通知必須**: いいえ
- **ファクトチェック**: クリーンアップの完全性

**実装内容**:
```typescript
import { clearConsultingState } from '@/lib/utils/session-storage';

const handleLogout = async () => {
  try {
    // 1. sessionStorageクリア
    clearConsultingState();
    
    // 2. Supabaseログアウト
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    // 3. リダイレクト
    window.location.href = '/';
  } catch (error) {
    // エラー処理
  }
};
```

---

### Task 12: 動作確認・テスト
- **目的**: 全体の動作を確認
- **依存**: Task 1-11すべて
- **成果物**: テスト結果レポート
- **見積もり**: 60分
- **優先度**: 最高
- **変更通知必須**: いいえ
- **ファクトチェック**: すべてのフローをテスト

**テストシナリオ**:
```
シナリオ1: 新規セッション開始
1. Start画面を開く（初回）
2. 「新規」をクリック
3. メッセージ送信
4. Dify応答を確認
5. conversation_idがSupabaseに保存されているか確認

シナリオ2: ページ遷移と復帰
1. Start画面で会話中
2. ダッシュボードに移動
3. Start画面に戻る
4. 会話が継続しているか確認
5. 次のメッセージでDifyの文脈が繋がっているか確認

シナリオ3: ログアウトと再ログイン
1. Start画面で会話中
2. ログアウト
3. 再ログイン
4. Start画面を開く
5. Supabaseから会話が復元されるか確認

シナリオ4: エラーハンドリング
1. ネットワークを切断
2. メッセージ送信
3. エラー通知を確認
4. 入力内容が復元されるか確認
```

---

## 実装順序（段階的・慎重）

### Stage 1: データベース基盤（Task 1-4）
```
Task 1: マイグレーションSQL作成
  ↓ 【レビュー＋ファクトチェック】
Task 2: マイグレーション実行
  ↓ 【動作確認】
Task 3: database.types.ts更新
  ↓ 【型チェック】
Task 4: consulting.ts更新
  ↓ 【コンパイル確認】
```

**マイルストーン1**: データベース準備完了

---

### Stage 2: ユーティリティ作成（Task 5）
```
Task 5: session-storage.ts作成
  ↓ 【単体テスト】
  ↓ 【エラーハンドリング確認】
```

**マイルストーン2**: sessionStorage操作可能

---

### Stage 3: バックエンド修正（Task 6-7）
```
Task 6: APIルート修正（conversation_id保存）
  ↓ 【変更通知】
  ↓ 【承認待ち】
  ↓ 【実装】
  ↓ 【Postmanでテスト】
Task 7: GET API確認
  ↓ 【必要に応じて修正】
```

**マイルストーン3**: バックエンド完成

---

### Stage 4: フロントエンド修正（Task 8-11）
```
Task 8: useConsultingSession修正
  ↓ 【動作確認】
Task 9: useMessageHandlers修正
  ↓ 【動作確認】
Task 10: mapApiSessionsToSessionData修正
  ↓ 【動作確認】
Task 11: ログアウト時のクリーンアップ
  ↓ 【動作確認】
```

**マイルストーン4**: フロントエンド完成

---

### Stage 5: 総合テスト（Task 12）
```
シナリオ1: 新規セッション
  ↓ ✅ or ❌
シナリオ2: ページ遷移
  ↓ ✅ or ❌
シナリオ3: ログアウト・再ログイン
  ↓ ✅ or ❌
シナリオ4: エラーハンドリング
  ↓ ✅ or ❌
```

**マイルストーン5**: 全機能完成

---

## リスク管理

### 各Stageでの確認事項

#### Stage 1（データベース）
- ⚠️ マイグレーション失敗のリスク
  - 対策: ローカル環境で先にテスト
  - ロールバックSQL準備: `ALTER TABLE consulting_sessions DROP COLUMN conversation_id;`

#### Stage 2（ユーティリティ）
- ⚠️ sessionStorage容量オーバー
  - 対策: 最小限のデータのみ保存
  - モニタリング: 保存サイズをログ出力

#### Stage 3（バックエンド）
- ⚠️ 既存のセッションへの影響
  - 対策: conversation_idはnullable（既存セッションは影響なし）
  - 確認: 既存APIの動作確認

#### Stage 4（フロントエンド）
- ⚠️ useEffectの無限ループ
  - 対策: 依存配列を慎重に設定
  - 確認: React DevToolsでレンダリング回数確認

#### Stage 5（テスト）
- ⚠️ Edge caseの見落とし
  - 対策: 複数のシナリオでテスト
  - 確認: エラーケースも含める

---

## ロールバック計画

### 各Stageでのロールバック

| Stage | ロールバック方法 | 所要時間 |
|-------|----------------|----------|
| Stage 1 | `DROP COLUMN conversation_id` | 5分 |
| Stage 2 | ファイル削除 | 1分 |
| Stage 3 | `git restore` | 1分 |
| Stage 4 | `git restore` | 1分 |
| Stage 5 | 全体ロールバック | 10分 |

---

## 総見積もり時間

### 最小
- Task 1-11: 3時間45分
- Task 12: 1時間
- **合計**: 約4時間45分

### 最大（問題発生時）
- Task 1-11: 6時間
- Task 12: 2時間
- デバッグ: 2時間
- **合計**: 約10時間

### 現実的
- **合計**: 約6-7時間

---

## 次のアクション

✅ Plan完了
→ 次：**Implement（実装）**

**Task 1から段階的に実施します。**
