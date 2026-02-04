# 📝 Implementation Plan: Start画面リファクタリング Phase 2（hook化）

**作成日**: 2026-02-04  
**対象**: Phase 2 - カスタムhookによる状態管理とロジックの分離  
**前提**: Phase 1完了、Design完了

---

## Phase 1の成果（前提条件）

- page.tsx: 1,666行 → 1,294行（372行削減）
- サーバー起動: 0.645秒
- Start画面コンパイル: 0.432秒

---

## Phase 2の目標

- **総行数**: 1,294行 → 800行（-494行、38%削減）
- **コンパイル時間**: 0.432秒 → 0.3秒（予測）
- **保守性**: hook化により大幅向上

---

## タスクリスト

### Task 1: hooks ディレクトリ確認

**目的**: hookファイルの配置先を確認

**実施内容**:
```bash
ls -la hooks/
```

**依存**: なし

**成果物**: なし（確認のみ）

**見積もり**: 1分

**優先度**: 最高

**変更通知必須**: いいえ

**リスク**: なし

---

### Task 2: useFileAttachment hook作成（最もシンプル）

**目的**: ファイル添付ロジックをhook化

**実施内容**:
1. hooks/useFileAttachment.ts を新規作成
2. page.tsx から以下を抽出:
   - `const [attachedFiles, setAttachedFiles] = useState<File[]>([]);`
   - `const fileInputRef = useRef<HTMLInputElement>(null);`
   - `handleFileAttach` 関数
   - `handleRemoveFile` 関数

**抽出元の行番号**:
- attachedFiles: 約505行
- fileInputRef: 約508行
- handleFileAttach: 約864-868行
- handleRemoveFile: 約870-872行

**依存**: Task 1

**成果物**: 
- `hooks/useFileAttachment.ts` (新規作成、保護レベル3)

**見積もり**: 10分

**優先度**: 高

**変更通知必須**: いいえ（新規作成）

**検証**:
```typescript
// テスト用コード（後で削除）
const { attachedFiles, handleFileAttach } = useFileAttachment();
console.log(attachedFiles.length); // 0
```

**リスク**: 低（独立したロジック、依存少ない）

---

### Task 3: useMessageHandlers hook作成（中程度の複雑さ）

**目的**: メッセージ処理ロジックをhook化

**実施内容**:
1. hooks/useMessageHandlers.ts を新規作成
2. page.tsx から以下を抽出:
   - `const [inputValue, setInputValue] = useState("");`
   - `handleSendMessage` 関数（819-862行）
   - `handleQuickReply` 関数（881-953行）

**抽出元の行番号**:
- inputValue: 約504行
- handleSendMessage: 819-862行（44行）
- handleQuickReply: 881-953行（73行）

**依存**: Task 1

**成果物**: 
- `hooks/useMessageHandlers.ts` (新規作成、保護レベル3)

**見積もり**: 20分

**優先度**: 高

**変更通知必須**: いいえ（新規作成）

**ファクトチェック項目**:
- [ ] handleSendMessage内のattachedFiles参照を確認
- [ ] SUBCATEGORY_MAPのインポート確認
- [ ] setAllSessions の依存注入確認

**検証**:
```typescript
// テスト用コード
const { handleSendMessage } = useMessageHandlers(currentSession, activeSessionId, allSessions, setAllSessions);
// 型エラーがないことを確認
```

**リスク**: 中（外部状態への依存）

---

### Task 4: useConsultingSession hook作成（最も複雑）

**目的**: セッション管理の全ロジックをhook化

**実施内容**:
1. hooks/useConsultingSession.ts を新規作成
2. page.tsx から以下を抽出:
   - 全てのセッション関連 useState（10個）
   - useMemo（currentSession, displaySessions, openSessions）
   - 全てのセッション操作ハンドラー（13個）

**抽出対象の詳細**:

**useState（10個）**:
- userChoice
- allSessions
- activeSessionId
- sessionsLoaded
- isHistoryOpen
- isExistingLoading
- stepToNavigate
- isEndingSession
- endSessionStatus

**useMemo（3個）**:
- currentSession（566-569行）
- displaySessions（598-611行）
- openSessions（613-616行）

**ハンドラー（13個）**:
- handleChoiceNew（533-538行）
- handleChoiceExisting（540-563行）
- handleSessionChange（618-631行）
- handleSessionClose（633-668行）
- handleRenameSession（670-679行）
- handleNewSession（681-763行）
- handleOpenSession（765-785行）
- handleTogglePin（787-791行）
- handleDeleteSession（793-817行）
- handleStepClick（955-967行）
- confirmStepNavigation（969-980行）
- handleEndSession（996-998行）
- confirmEndSession（1000-1077行）

**依存**: Task 1

**成果物**: 
- `hooks/useConsultingSession.ts` (新規作成、保護レベル3)

**見積もり**: 40分

**優先度**: 最高

**変更通知必須**: いいえ（新規作成）

**ファクトチェック項目**:
- [ ] すべてのuseStateを網羅しているか
- [ ] ハンドラー間の依存関係を確認
- [ ] API呼び出し（handleChoiceExisting）の処理確認
- [ ] createInitialSessionForNewUser の呼び出し確認

**検証**:
```typescript
// テスト用コード
const session = useConsultingSession();
console.log(session.allSessions.length);
console.log(typeof session.handleNewSession); // "function"
```

**リスク**: 高（複雑なロジック、多数の状態管理）

---

### Task 5: page.tsx へのhookインポート追加

**目的**: 作成したhookをインポート

**実施内容**:
1. page.tsx の冒頭にインポート文を追加
   ```typescript
   import { useConsultingSession } from "@/hooks/useConsultingSession";
   import { useMessageHandlers } from "@/hooks/useMessageHandlers";
   import { useFileAttachment } from "@/hooks/useFileAttachment";
   ```

**依存**: Task 2, 3, 4（全hook作成済み）

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 2分

**優先度**: 最高

**変更通知必須**: はい

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: 冒頭（hookインポート追加）
理由: カスタムhookのインポート
影響: インポート追加のみ、既存コード未削除

この変更を実行してよろしいですか？
```

**リスク**: 低（インポートのみ）

---

### Task 6: page.tsx のhook呼び出し追加

**目的**: hook を呼び出して状態とハンドラーを取得

**実施内容**:
1. ConsultingStartPage 関数の冒頭に追加:
   ```typescript
   export default function ConsultingStartPage() {
     // セッション管理
     const session = useConsultingSession();
     
     // メッセージ処理
     const message = useMessageHandlers(
       session.currentSession,
       session.activeSessionId,
       session.allSessions,
       (sessions) => { /* setAllSessions の代わり */ }
     );
     
     // ファイル添付
     const file = useFileAttachment();
     
     // 既存のコード...
   }
   ```

**依存**: Task 5

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 10分

**優先度**: 最高

**変更通知必須**: はい

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: ConsultingStartPage 関数冒頭
理由: カスタムhook呼び出し追加
影響: hook呼び出し追加、既存のuseStateは後で削除

この変更を実行してよろしいですか？
```

**ファクトチェック項目**:
- [ ] useMessageHandlers の依存注入が正しいか
- [ ] session.currentSession が存在するか確認

**リスク**: 中（状態管理の移行開始）

---

### Task 7: page.tsx の useState削除（段階的）

**目的**: hook化した状態を削除

**実施内容**:
1. 以下のuseStateを削除:
   - userChoice（hook: session.userChoice）
   - allSessions（hook: session.allSessions）
   - activeSessionId（hook: session.activeSessionId）
   - inputValue（hook: message.inputValue）
   - attachedFiles（hook: file.attachedFiles）
   - その他のセッション関連useState

**依存**: Task 6

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 5分

**優先度**: 高

**変更通知必須**: はい

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: useState宣言（約500-530行）
理由: カスタムhookに移行済みのため削除
影響: 状態はhookから取得、機能は変わらず

この変更を実行してよろしいですか？
```

**ファクトチェック項目**:
- [ ] すべての削除対象useStateを確認
- [ ] hook経由で同じ状態が取得できることを確認

**リスク**: 中（状態管理の移行）

---

### Task 8: page.tsx のハンドラー関数削除

**目的**: hook化したハンドラーを削除

**実施内容**:
1. 以下のハンドラー関数を削除:
   - handleChoiceNew → session.handleChoiceNew
   - handleChoiceExisting → session.handleChoiceExisting
   - handleSessionChange → session.handleSessionChange
   - handleSendMessage → message.handleSendMessage
   - handleFileAttach → file.handleFileAttach
   - その他全てのhook化済みハンドラー

**依存**: Task 7

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 10分

**優先度**: 高

**変更通知必須**: はい

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: ハンドラー関数（約533-1077行）
理由: カスタムhookに移行済みのため削除
影響: ハンドラーはhookから取得、機能は変わらず

この変更を実行してよろしいですか？
```

**ファクトチェック項目**:
- [ ] すべての削除対象ハンドラーを確認
- [ ] JSX内の参照がhook経由に変更されているか確認

**リスク**: 中（大量のコード削除）

---

### Task 9: page.tsx のJSX内参照更新

**目的**: ハンドラー参照をhook経由に変更

**実施内容**:
1. JSX内の全てのハンドラー参照を更新:
   - `handleChoiceNew` → `session.handleChoiceNew`
   - `handleSendMessage` → `message.handleSendMessage`
   - `inputValue` → `message.inputValue`
   - `setInputValue` → `message.setInputValue`
   - `attachedFiles` → `file.attachedFiles`
   - その他全て

**変更例**:
```typescript
// 変更前
<button onClick={handleChoiceNew}>新規</button>
<Input value={inputValue} onChange={e => setInputValue(e.target.value)} />

// 変更後
<button onClick={session.handleChoiceNew}>新規</button>
<Input value={message.inputValue} onChange={e => message.setInputValue(e.target.value)} />
```

**依存**: Task 8

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 20分

**優先度**: 最高

**変更通知必須**: はい

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: JSX内のハンドラー参照（全体）
理由: hook経由の参照に変更
影響: 参照方法のみ変更、機能は変わらず

この変更を実行してよろしいですか？
```

**ファクトチェック項目**:
- [ ] 全てのハンドラー参照を網羅
- [ ] session. / message. / file. のプレフィックス確認
- [ ] 見落としがないか複数回チェック

**リスク**: 高（大量の変更、見落としリスク）

---

### Task 10: 開発サーバー再起動・動作確認

**目的**: すべての変更後、開発サーバーでの動作確認

**実施内容**:
1. 開発サーバーを停止
2. キャッシュクリア
3. 開発サーバー再起動
4. コンパイル時間測定
5. ブラウザで動作確認

**依存**: Task 5-9（すべての変更完了）

**成果物**: なし（確認のみ）

**見積もり**: 15分

**優先度**: 最高

**変更通知必須**: いいえ

**実施コマンド**:
```bash
pkill -f "next"
sleep 5
rm -rf .next
npm run dev
```

**ブラウザ確認項目**:
1. [ ] Start画面アクセス: `http://localhost:3000/consulting/start`
2. [ ] 新規ボタンクリック → カテゴリボタン表示
3. [ ] カテゴリ選択 → サブカテゴリ表示
4. [ ] メッセージ送信 → 正常動作
5. [ ] ファイル添付 → 正常動作
6. [ ] セッション切り替え → 正常動作
7. [ ] 既存ボタン → 履歴表示

**リスク**: 中（統合テスト）

---

### Task 11: TypeScript全体チェック

**目的**: プロジェクト全体の型チェック

**実施内容**:
```bash
npx tsc --noEmit
```

**依存**: Task 10（動作確認完了）

**成果物**: なし（確認のみ）

**見積もり**: 3分

**優先度**: 最高

**変更通知必須**: いいえ

**期待結果**: エラー0件

**リスク**: 低（最終確認）

---

### Task 12: Git コミット

**目的**: Phase 2の変更をコミット

**実施内容**:
```bash
git add hooks/useConsultingSession.ts
git add hooks/useMessageHandlers.ts
git add hooks/useFileAttachment.ts
git add app/consulting/start/page.tsx

git commit -m "$(cat <<'EOF'
refactor(consulting): Start画面リファクタリング Phase 2完了

カスタムhook化により、保守性とテスタビリティを大幅改善

変更内容:
- セッション管理を hooks/useConsultingSession.ts に分離
- メッセージ処理を hooks/useMessageHandlers.ts に分離
- ファイル添付を hooks/useFileAttachment.ts に分離
- page.tsx から494行削減（1,294→800行、38%減）

効果:
- コンパイル時間: 0.432秒 → 0.3秒（予測）
- 保守性: hook化により大幅向上
- テスタビリティ: hook単位でテスト可能
- 再利用性: 他のコンポーネントでも利用可能

技術的改善:
- 関心の分離（状態管理・ロジック・UI）
- 依存注入パターン適用
- useMemo/useCallback最適化

関連: #phase2-refactoring
EOF
)"
```

**依存**: Task 11（全体チェック完了）

**成果物**: Git commit

**見積もり**: 5分

**優先度**: 最高

**変更通知必須**: いいえ

**リスク**: なし

---

## 実施順序

### フェーズ分け

**準備フェーズ**:
```
Task 1: ディレクトリ確認（1分）
```

**hook作成フェーズ（並行可能）**:
```
Task 2: useFileAttachment作成（10分）
Task 3: useMessageHandlers作成（20分）
Task 4: useConsultingSession作成（40分）
```

**page.tsx統合フェーズ（順次）**:
```
Task 5: hookインポート追加（2分）
↓
Task 6: hook呼び出し追加（10分）
↓
Task 7: useState削除（5分）
↓
Task 8: ハンドラー関数削除（10分）
↓
Task 9: JSX内参照更新（20分）
```

**検証フェーズ**:
```
Task 10: 開発サーバー再起動・動作確認（15分）
↓
Task 11: TypeScript全体チェック（3分）
```

**完了フェーズ**:
```
Task 12: Git コミット（5分）
```

---

## 総見積もり時間

| フェーズ | タスク数 | 所要時間 |
|---------|---------|---------|
| 準備 | 1 | 1分 |
| hook作成 | 3 | 70分 |
| page.tsx統合 | 5 | 47分 |
| 検証 | 2 | 18分 |
| 完了 | 1 | 5分 |
| **合計** | **12** | **約141分（2.4時間）** |

**バッファ**: 30分  
**総計**: **約171分（2.9時間）**

---

## チェックリスト

### hook作成フェーズ完了条件
- [ ] hooks/useFileAttachment.ts 作成完了
- [ ] hooks/useMessageHandlers.ts 作成完了
- [ ] hooks/useConsultingSession.ts 作成完了
- [ ] 各hookに型エラーなし

### page.tsx統合フェーズ完了条件
- [ ] hookインポート追加完了
- [ ] hook呼び出し追加完了
- [ ] useState削除完了
- [ ] ハンドラー関数削除完了
- [ ] JSX内参照更新完了（全て）
- [ ] page.tsx に型エラーなし

### 検証フェーズ完了条件
- [ ] 開発サーバー起動成功
- [ ] Start画面アクセス成功
- [ ] カテゴリボタン動作確認
- [ ] メッセージ送信動作確認
- [ ] ファイル添付動作確認
- [ ] セッション切り替え動作確認
- [ ] TypeScript全体チェックでエラー0件

### 完了フェーズ完了条件
- [ ] Git コミット完了
- [ ] コミットメッセージが規約準拠

---

## ファクトチェックポイント

### Task 3: useMessageHandlers作成時

**確認項目**:
```bash
# handleSendMessage 内の attachedFiles 参照を確認
grep -n "attachedFiles" app/consulting/start/page.tsx | head -5

# SUBCATEGORY_MAP の使用箇所を確認
grep -n "SUBCATEGORY_MAP" app/consulting/start/page.tsx
```

### Task 4: useConsultingSession作成時

**確認項目**:
```bash
# すべてのuseStateを確認
grep -n "useState" app/consulting/start/page.tsx | wc -l

# すべてのハンドラーを確認
grep -n "const handle" app/consulting/start/page.tsx
```

### Task 9: JSX内参照更新時

**確認項目**:
```bash
# 旧参照が残っていないか確認（エラーになるはず）
grep -n "handleChoiceNew\|handleSendMessage\|inputValue" app/consulting/start/page.tsx

# hook経由の参照を確認
grep -n "session\.\|message\.\|file\." app/consulting/start/page.tsx | wc -l
```

---

## 成功基準

### Phase 2完了の定義

1. **削減目標達成**
   - ✅ page.tsx: 1,294行 → 800行以下
   - ✅ 削減: 494行以上

2. **動作確認**
   - ✅ すべての機能が正常動作（7項目）
   - ✅ TypeScriptエラー0件

3. **パフォーマンス**
   - ✅ コンパイル時間: 0.3秒以下（目標）

4. **コード品質**
   - ✅ hook化完了（3個）
   - ✅ 関心の分離
   - ✅ 型安全性維持

5. **Git管理**
   - ✅ コミットメッセージが規約準拠
   - ✅ 変更履歴が明確

---

**次のアクション**: Implementフェーズへ移行し、Task 1から順次実施する
