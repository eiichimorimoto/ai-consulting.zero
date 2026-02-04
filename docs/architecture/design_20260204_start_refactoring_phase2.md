# 🎨 Design: Start画面リファクタリング Phase 2（カスタムhook化）

**作成日**: 2026-02-04  
**対象**: Phase 2 - カスタムhookによる状態管理とロジックの分離  
**前提**: Phase 1完了（データ・定数外部化済み）

---

## Phase 1の成果（前提条件）

- page.tsx: 1,666行 → 1,294行（372行削減）
- サーバー起動: 145.5秒 → 0.645秒（99.6%改善）
- Start画面コンパイル: 174秒 → 0.432秒（99.7%改善）

---

## Phase 2の目標

### 削減目標
- **総行数**: 1,294行 → 800行（-494行、38%削減）
- **コンパイル時間**: 0.432秒 → 0.3秒（予測）
- **保守性**: hook化により大幅向上

### 実施内容
1. セッション管理ロジックをhook化
2. メッセージ処理ロジックをhook化
3. ファイル添付ロジックをhook化

---

## アーキテクチャ設計

### 現在の構造（Phase 1完了後）
```
app/consulting/start/page.tsx (1,294行)
├─ インポート (60行)
├─ ヘルパー関数 (150行)
│  ├─ mapApiSessionsToSessionData
│  └─ createInitialSessionForNewUser
└─ ConsultingStartPage (1,084行)
   ├─ useState宣言 (32行)
   ├─ useEffect (50行)
   ├─ ハンドラー関数 (400行)
   │  ├─ セッション管理 (250行)
   │  ├─ メッセージ処理 (100行)
   │  └─ ファイル添付 (50行)
   └─ JSX (602行)
```

### Phase 2完了後の構造
```
hooks/
├─ useConsultingSession.ts (新規: 250行)
│  ├─ セッション状態管理
│  ├─ セッション操作ハンドラー
│  └─ API連携
├─ useMessageHandlers.ts (新規: 120行)
│  ├─ メッセージ送信
│  ├─ クイック返信
│  └─ サブカテゴリ処理
└─ useFileAttachment.ts (新規: 60行)
   ├─ ファイル添付状態
   └─ ファイル操作

app/consulting/start/page.tsx (変更: 800行)
├─ インポート (70行)
├─ ヘルパー関数 (150行)
└─ ConsultingStartPage (580行)
   ├─ カスタムhook呼び出し (30行)
   ├─ 統合ロジック (50行)
   └─ JSX (500行)
```

---

## モジュール設計

### Module 1: hooks/useConsultingSession.ts

**責務**: セッション管理の状態とロジック

**エクスポート内容**:
```typescript
export function useConsultingSession(initialChoice: UserChoice | null = null) {
  // 状態
  const [userChoice, setUserChoice] = useState<UserChoice>(initialChoice);
  const [allSessions, setAllSessions] = useState<SessionData[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [sessionsLoaded, setSessionsLoaded] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExistingLoading, setIsExistingLoading] = useState(false);
  const [stepToNavigate, setStepToNavigate] = useState<number | null>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [endSessionStatus, setEndSessionStatus] = useState<SessionStatus>("paused");

  // 算出値
  const currentSession = useMemo(...);
  const displaySessions = useMemo(...);
  const openSessions = useMemo(...);

  // ハンドラー
  const handleChoiceNew = () => {...};
  const handleChoiceExisting = async () => {...};
  const handleSessionChange = (sessionId: string) => {...};
  const handleSessionClose = (sessionId: string) => {...};
  const handleRenameSession = (sessionId: string, newName: string) => {...};
  const handleNewSession = () => {...};
  const handleOpenSession = (sessionId: string) => {...};
  const handleTogglePin = (sessionId: string) => {...};
  const handleDeleteSession = (sessionId: string) => {...};
  const handleStepClick = (stepId: number) => {...};
  const confirmStepNavigation = () => {...};
  const handleEndSession = () => {...};
  const confirmEndSession = async () => {...};

  return {
    // 状態
    userChoice,
    allSessions,
    activeSessionId,
    currentSession,
    displaySessions,
    openSessions,
    isHistoryOpen,
    setIsHistoryOpen,
    isExistingLoading,
    stepToNavigate,
    setStepToNavigate,
    isEndingSession,
    setIsEndingSession,
    endSessionStatus,
    setEndSessionStatus,
    
    // ハンドラー
    handleChoiceNew,
    handleChoiceExisting,
    handleSessionChange,
    handleSessionClose,
    handleRenameSession,
    handleNewSession,
    handleOpenSession,
    handleTogglePin,
    handleDeleteSession,
    handleStepClick,
    confirmStepNavigation,
    handleEndSession,
    confirmEndSession,
  };
}
```

**依存**:
- types/consulting.ts
- lib/consulting/constants.ts
- lib/consulting/sample-data.ts

**保護レベル**: レベル3

---

### Module 2: hooks/useMessageHandlers.ts

**責務**: メッセージ処理とインタラクション

**エクスポート内容**:
```typescript
export function useMessageHandlers(
  currentSession: SessionData | undefined,
  activeSessionId: string,
  allSessions: SessionData[],
  setAllSessions: (sessions: SessionData[]) => void
) {
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = async (attachedFiles?: File[]) => {
    if (!currentSession) return;
    if (!inputValue.trim() && !attachedFiles?.length) return;

    let messageContent = inputValue;
    if (attachedFiles && attachedFiles.length > 0) {
      const fileNames = attachedFiles.map(f => f.name).join(", ");
      messageContent += `\n\n添付ファイル: ${fileNames}`;
    }

    const msgLen = currentSession.messages?.length ?? 0;
    const newMessage: Message = {
      id: msgLen + 1,
      type: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setAllSessions(allSessions.map(s =>
      s.id === activeSessionId
        ? { ...s, messages: [...(s.messages ?? []), newMessage], lastUpdated: new Date() }
        : s
    ));
    setInputValue("");

    // AI応答シミュレーション
    setTimeout(() => {
      const aiResponse: Message = {
        id: msgLen + 2,
        type: "ai",
        content: "ご入力ありがとうございます。内容を分析しています。詳しい情報があれば、より具体的な提案が可能です。",
        timestamp: new Date(),
      };

      setAllSessions(prevSessions => prevSessions.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...(s.messages ?? []), aiResponse], lastUpdated: new Date() }
          : s
      ));
    }, 1000);
  };

  const handleQuickReply = (reply: string, isCategory: boolean = false) => {
    if (!currentSession) return;
    const msgLen = currentSession.messages?.length ?? 0;
    const newMessage: Message = {
      id: msgLen + 1,
      type: "user",
      content: reply,
      timestamp: new Date(),
    };

    setAllSessions(allSessions.map(s =>
      s.id === activeSessionId
        ? {
          ...s,
          name: s.name === "新規相談" ? reply : s.name,
          messages: [...(s.messages ?? []), newMessage],
          lastUpdated: new Date()
        }
        : s
    ));

    if (isCategory && reply !== "その他") {
      setTimeout(() => {
        const subcategories = SUBCATEGORY_MAP[reply] || [];
        const aiResponse: Message = {
          id: msgLen + 2,
          type: "ai",
          content: `「${reply}」についてですね。さらに詳しくお聞かせください。具体的にはどのような課題でしょうか？`,
          timestamp: new Date(),
          interactive: {
            type: "subcategory-buttons",
            data: subcategories,
            selectedCategory: reply
          }
        };

        setAllSessions(prevSessions => prevSessions.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: [...(s.messages ?? []), aiResponse], lastUpdated: new Date() }
            : s
        ));
      }, 800);
    } else if (reply === "その他") {
      setTimeout(() => {
        const aiResponse: Message = {
          id: msgLen + 2,
          type: "ai",
          content: "承知しました。どのような課題でしょうか？自由に入力してください。",
          timestamp: new Date(),
          interactive: {
            type: "custom-input"
          }
        };

        setAllSessions(prevSessions => prevSessions.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: [...(s.messages ?? []), aiResponse], lastUpdated: new Date() }
            : s
        ));
      }, 800);
    }
  };

  return {
    inputValue,
    setInputValue,
    handleSendMessage,
    handleQuickReply,
  };
}
```

**依存**:
- types/consulting.ts
- lib/consulting/constants.ts (SUBCATEGORY_MAP)

**保護レベル**: レベル3

---

### Module 3: hooks/useFileAttachment.ts

**責務**: ファイル添付の状態管理

**エクスポート内容**:
```typescript
export function useFileAttachment() {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    toast.success(`${files.length}個のファイルを添付しました`);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setAttachedFiles([]);
  };

  return {
    attachedFiles,
    fileInputRef,
    handleFileAttach,
    handleRemoveFile,
    clearFiles,
  };
}
```

**依存**:
- React (useRef, useState)
- sonner (toast)

**保護レベル**: レベル3

---

## データフロー

### Phase 1完了後のフロー（現在）
```
ConsultingStartPage
├─ useState × 10回（バラバラ）
├─ ハンドラー関数 × 20個（1,000行超）
└─ JSX（600行）
```

### Phase 2完了後のフロー
```
ConsultingStartPage
├─ useConsultingSession() → セッション管理
│  └─ 状態 + ハンドラー × 13個
├─ useMessageHandlers() → メッセージ処理
│  └─ 状態 + ハンドラー × 2個
├─ useFileAttachment() → ファイル添付
│  └─ 状態 + ハンドラー × 2個
└─ JSX（シンプル化）
```

---

## 技術選定

| カテゴリ | 選定技術 | 理由 |
|---------|---------|------|
| hook配置 | hooks/ ディレクトリ | Next.js標準、共有しやすい |
| 命名規則 | use[Feature] | React標準規約 |
| 依存管理 | 親コンポーネントから注入 | テスタビリティ向上 |
| 型安全性 | 完全な型定義 | TypeScriptの恩恵 |

---

## セキュリティ考慮点

### hook分離の安全性

1. **状態の整合性**
   - useConsultingSession内で状態を一元管理
   - setAllSessions経由での更新のみ許可
   - 直接的な状態変更を防止

2. **副作用の制御**
   - useEffect内のAPI呼び出しを制限
   - cleanup関数で確実にリソース解放

3. **型安全性の維持**
   - hook戻り値の型を明示的に定義
   - 全てのハンドラーに適切な型注釈

---

## リスク管理

### Phase 2のリスク評価

| リスク | 発生確率 | 影響度 | 対策 |
|-------|---------|--------|------|
| 状態の不整合 | 中 | 高 | hook内で状態を一元管理、テスト追加 |
| 依存関係の循環 | 低 | 中 | 依存グラフを事前設計 |
| パフォーマンス劣化 | 低 | 中 | useMemo/useCallbackで最適化 |
| 既存機能の破壊 | 低 | 最高 | 段階的確認、各hook単位でテスト |

---

## ファイル変更計画

### 新規作成（3ファイル）

#### 1. hooks/useConsultingSession.ts
- **目的**: セッション管理の全ロジック
- **行数**: 250行（予測）
- **抽出元**: page.tsx の500-1000行あたり
- **リスク**: 中（複雑なロジック）

#### 2. hooks/useMessageHandlers.ts
- **目的**: メッセージ処理
- **行数**: 120行（予測）
- **抽出元**: page.tsx の handleSendMessage, handleQuickReply
- **リスク**: 低（シンプルなロジック）

#### 3. hooks/useFileAttachment.ts
- **目的**: ファイル添付管理
- **行数**: 60行（予測）
- **抽出元**: page.tsx の handleFileAttach, handleRemoveFile
- **リスク**: 低（独立したロジック）

### 変更対象（1ファイル）

#### app/consulting/start/page.tsx
- **変更内容**:
  - useState宣言削除（hook化）
  - ハンドラー関数削除（hook化）
  - hook呼び出し追加
- **削減**: 1,294行 → 800行（-494行）
- **リスク**: 中（メインファイルの大幅変更）

---

## パフォーマンス目標

### Phase 2の目標値

| 指標 | Phase 1完了 | Phase 2目標 | 達成基準 |
|------|------------|------------|---------|
| 総行数 | 1,294行 | 800行 | -494行削減 |
| page.tsx | 1,294行 | 800行 | -38%削減 |
| コンパイル時間 | 0.432秒 | 0.3秒 | -30%削減 |
| 保守性 | 中 | 高 | hook化完了 |

---

## 次のステップ

### Design完了後（Plan フェーズへ）

1. **タスク分解**
   - 各hook作成のタスク化
   - page.tsx変更のタスク化
   - 依存関係の明確化

2. **実装順序の決定**
   - useFileAttachment（最もシンプル）
   - useMessageHandlers（中程度）
   - useConsultingSession（最も複雑）
   - page.tsx統合

3. **テスト戦略**
   - 各hook単位でテスト
   - 統合後の動作確認

---

**次のアクション**: Planフェーズへ移行し、実装タスクを詳細化する
