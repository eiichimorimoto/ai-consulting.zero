# 📝 Implementation Plan: Start画面リファクタリング Phase 1

**作成日**: 2026-02-04  
**対象**: Phase 1 - データ・定数の外部化  
**前提**: Brainstorm, Design完了

---

## プロジェクト構造

### 既存構造
```
ai-consulting-zero/
├─ app/consulting/start/page.tsx (1,666行)
├─ types/ (既存)
└─ lib/ (既存)
```

### Phase 1完了後の構造
```
ai-consulting-zero/
├─ types/
│  └─ consulting.ts (新規: 52行)
├─ lib/consulting/
│  ├─ category-data.ts (新規: 17行)
│  ├─ constants.ts (新規: 24行)
│  └─ sample-data.ts (新規: 273行)
└─ app/consulting/start/
   └─ page.tsx (変更: 1,666→1,350行)
```

---

## タスクリスト

### Task 1: ディレクトリ構造の確認・準備

**目的**: 新規ファイルの配置先を確認

**実施内容**:
```bash
# lib/consulting ディレクトリの存在確認
ls -la lib/

# types ディレクトリの存在確認
ls -la types/
```

**依存**: なし

**成果物**: なし（確認のみ）

**見積もり**: 2分

**優先度**: 最高

**変更通知必須**: いいえ

**リスク**: なし

---

### Task 2: 型定義ファイルの作成

**目的**: 共通型定義を types/consulting.ts に分離

**実施内容**:
1. types/consulting.ts を新規作成
2. page.tsx の 39-90行をコピー
3. 必要なインポートを追加（ReactNode）

**依存**: Task 1

**成果物**: 
- `types/consulting.ts` (新規作成、保護レベル3)

**見積もり**: 5分

**優先度**: 最高

**変更通知必須**: いいえ（新規作成）

**検証**:
```bash
# TypeScript型チェック
npx tsc --noEmit types/consulting.ts
```

**リスク**: 低（型定義のみ、実行コードなし）

---

### Task 3: カテゴリデータファイルの作成

**目的**: カテゴリデータを統合し、lib/consulting/category-data.ts に分離

**実施内容**:
1. page.tsx の 461-477行（createInitialSessionForNewUser内）を確認
2. page.tsx の 707-717行（handleNewSession内）を確認
3. 2箇所のデータが同一であることを**ファクトチェック**
4. lib/consulting/category-data.ts を新規作成
5. CONSULTING_CATEGORIES として統合エクスポート

**依存**: Task 2（types/consulting.ts が必要）

**成果物**: 
- `lib/consulting/category-data.ts` (新規作成、保護レベル3)

**見積もり**: 8分

**優先度**: 最高

**変更通知必須**: いいえ（新規作成）

**ファクトチェック項目**:
- [ ] 461-477行と707-717行のデータが完全一致
- [ ] 9カテゴリすべてが含まれている
- [ ] icon, color, bgLight すべてのプロパティが存在

**検証**:
```bash
# TypeScript型チェック
npx tsc --noEmit lib/consulting/category-data.ts

# インポートテスト（page.tsx未変更の段階）
node -e "console.log(require('./lib/consulting/category-data.ts'))"
```

**リスク**: 低（データのみ、2箇所の統合）

---

### Task 4: 定数ファイルの作成

**目的**: 定数を lib/consulting/constants.ts に分離

**実施内容**:
1. page.tsx の 91-104行（CATEGORY_ACCENT_MAP, MAX_OPEN_TABS）をコピー
2. page.tsx の 904-913行（subcategoryMap）をコピー
3. lib/consulting/constants.ts を新規作成
4. すべての定数をエクスポート

**依存**: なし（独立）

**成果物**: 
- `lib/consulting/constants.ts` (新規作成、保護レベル3)

**見積もり**: 6分

**優先度**: 高

**変更通知必須**: いいえ（新規作成）

**検証**:
```bash
# TypeScript型チェック
npx tsc --noEmit lib/consulting/constants.ts
```

**リスク**: 低（定数のみ）

---

### Task 5: サンプルデータファイルの作成

**目的**: 開発用サンプルデータを lib/consulting/sample-data.ts に分離

**実施内容**:
1. page.tsx の 106-378行（createInitialSessions関数）をコピー
2. lib/consulting/sample-data.ts を新規作成
3. 必要なインポートを追加（SessionData型、lucide-reactアイコン）

**依存**: Task 2（types/consulting.ts が必要）

**成果物**: 
- `lib/consulting/sample-data.ts` (新規作成、保護レベル3)

**見積もり**: 10分

**優先度**: 中

**変更通知必須**: いいえ（新規作成）

**検証**:
```bash
# TypeScript型チェック
npx tsc --noEmit lib/consulting/sample-data.ts

# 関数の戻り値確認
node -e "const {createInitialSessions} = require('./lib/consulting/sample-data.ts'); console.log(createInitialSessions().length)"
```

**リスク**: 低（データのみ、本番環境では不使用）

---

### Task 6: page.tsx のインポート追加

**目的**: 外部モジュールのインポートを追加

**実施内容**:
1. page.tsx の冒頭にインポート文を追加
   ```typescript
   import type { 
     SessionData, 
     Message, 
     ConsultingStep, 
     KPI, 
     SessionStatus, 
     CategoryData, 
     ApiSession 
   } from "@/types/consulting";
   import { MAX_OPEN_TABS, CATEGORY_ACCENT_MAP, SUBCATEGORY_MAP } from "@/lib/consulting/constants";
   import { CONSULTING_CATEGORIES } from "@/lib/consulting/category-data";
   import { createInitialSessions } from "@/lib/consulting/sample-data";
   ```

**依存**: Task 2, 3, 4, 5（すべての外部ファイルが作成済み）

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 3分

**優先度**: 最高

**変更通知必須**: はい（レベル3だが、メインファイル変更開始）

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: 冒頭（インポート文の追加）
理由: 外部モジュールのインポート追加
影響: インポート追加のみ、既存コードは未削除

この変更を実行してよろしいですか？
```

**検証**:
```bash
# TypeScript型チェック（インポートのみ）
npx tsc --noEmit app/consulting/start/page.tsx
```

**リスク**: 低（インポート追加のみ）

---

### Task 7: page.tsx の型定義削除

**目的**: 型定義を削除（外部モジュールから参照）

**実施内容**:
1. page.tsx の 39-90行を削除
   - type ConsultingStep
   - type Message
   - type CategoryData
   - type KPI
   - type SessionStatus
   - type SessionData
   - type ApiSession

**依存**: Task 6（インポート追加済み）

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 3分

**優先度**: 最高

**変更通知必須**: はい

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: 39-90行（型定義）
理由: types/consulting.ts に移動済みのため削除
影響: 型定義は外部モジュールから参照、機能は変わらず

この変更を実行してよろしいですか？
```

**検証**:
```bash
# TypeScript型チェック
npx tsc --noEmit app/consulting/start/page.tsx

# 期待: エラーなし（外部モジュールから型が解決される）
```

**リスク**: 低（型はインポート済み）

---

### Task 8: page.tsx の定数削除

**目的**: 定数を削除（外部モジュールから参照）

**実施内容**:
1. page.tsx の MAX_OPEN_TABS 定義を削除
2. page.tsx の CATEGORY_ACCENT_MAP 定義を削除

**依存**: Task 6（インポート追加済み）

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 2分

**優先度**: 高

**変更通知必須**: はい

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: 91-104行（定数定義）
理由: lib/consulting/constants.ts に移動済みのため削除
影響: 定数は外部モジュールから参照、機能は変わらず

この変更を実行してよろしいですか？
```

**検証**:
```bash
# TypeScript型チェック
npx tsc --noEmit app/consulting/start/page.tsx
```

**リスク**: 低（定数はインポート済み）

---

### Task 9: page.tsx のサンプルデータ関数削除

**目的**: createInitialSessions 関数を削除（外部モジュールから参照）

**実施内容**:
1. page.tsx の 106-378行（createInitialSessions 関数全体）を削除

**依存**: Task 6（インポート追加済み）

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 2分

**優先度**: 中

**変更通知必須**: はい

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: 106-378行（createInitialSessions 関数）
理由: lib/consulting/sample-data.ts に移動済みのため削除
影響: サンプルデータは外部モジュールから参照、機能は変わらず

この変更を実行してよろしいですか？
```

**検証**:
```bash
# TypeScript型チェック
npx tsc --noEmit app/consulting/start/page.tsx
```

**リスク**: 低（関数はインポート済み）

---

### Task 10: page.tsx のカテゴリデータ置き換え（createInitialSessionForNewUser）

**目的**: createInitialSessionForNewUser 内のカテゴリデータを CONSULTING_CATEGORIES に置き換え

**実施内容**:
1. page.tsx の createInitialSessionForNewUser 関数（446-494行）を確認
2. 461-477行のカテゴリボタンデータを削除
3. `data: CONSULTING_CATEGORIES` に置き換え

**変更前**（461-477行）:
```typescript
interactive: {
  type: "category-buttons",
  data: [
    { label: "売上の伸び悩み", icon: "TrendingDown", color: "bg-red-500", bgLight: "bg-red-50 border-red-200" },
    // ... 残り8カテゴリ
  ]
}
```

**変更後**:
```typescript
interactive: {
  type: "category-buttons",
  data: CONSULTING_CATEGORIES
}
```

**依存**: Task 6（インポート追加済み）

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 5分

**優先度**: 高

**変更通知必須**: はい

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: 461-477行（createInitialSessionForNewUser 内カテゴリデータ）
理由: CONSULTING_CATEGORIES（外部モジュール）に置き換え
影響: データ内容は同一、重複削減

この変更を実行してよろしいですか？
```

**ファクトチェック項目**:
- [ ] CONSULTING_CATEGORIES と既存データが完全一致
- [ ] 置き換え後もTypeScriptエラーなし

**検証**:
```bash
# TypeScript型チェック
npx tsc --noEmit app/consulting/start/page.tsx
```

**リスク**: 低（データ内容は同一）

---

### Task 11: page.tsx のカテゴリデータ置き換え（handleNewSession）

**目的**: handleNewSession 内のカテゴリデータを CONSULTING_CATEGORIES に置き換え

**実施内容**:
1. page.tsx の handleNewSession 関数（681-763行）を確認
2. 707-717行のカテゴリボタンデータを削除
3. `data: CONSULTING_CATEGORIES` に置き換え

**変更前**（707-717行）:
```typescript
interactive: {
  type: "category-buttons",
  data: [
    { label: "売上の伸び悩み", icon: "TrendingDown", color: "bg-red-500", bgLight: "bg-red-50 border-red-200" },
    // ... 残り8カテゴリ
  ]
}
```

**変更後**:
```typescript
interactive: {
  type: "category-buttons",
  data: CONSULTING_CATEGORIES
}
```

**依存**: Task 6（インポート追加済み）

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 5分

**優先度**: 高

**変更通知必須**: はい

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: 707-717行（handleNewSession 内カテゴリデータ）
理由: CONSULTING_CATEGORIES（外部モジュール）に置き換え
影響: データ内容は同一、重複削減

この変更を実行してよろしいですか？
```

**ファクトチェック項目**:
- [ ] CONSULTING_CATEGORIES と既存データが完全一致
- [ ] 置き換え後もTypeScriptエラーなし

**検証**:
```bash
# TypeScript型チェック
npx tsc --noEmit app/consulting/start/page.tsx
```

**リスク**: 低（データ内容は同一）

---

### Task 12: page.tsx の subcategoryMap 置き換え

**目的**: handleQuickReply 内の subcategoryMap を SUBCATEGORY_MAP に置き換え

**実施内容**:
1. page.tsx の handleQuickReply 関数（881-953行）を確認
2. 904-913行の subcategoryMap 定義を削除
3. `const subcategories = SUBCATEGORY_MAP[reply] || [];` に置き換え

**変更前**（904-913行）:
```typescript
const subcategoryMap: Record<string, string[]> = {
  "売上の伸び悩み": ["新規顧客獲得が低調", ...],
  // ... 残り7カテゴリ
};

const subcategories = subcategoryMap[reply] || [];
```

**変更後**:
```typescript
const subcategories = SUBCATEGORY_MAP[reply] || [];
```

**依存**: Task 6（インポート追加済み）

**成果物**: 
- `app/consulting/start/page.tsx` (変更、保護レベル3)

**見積もり**: 5分

**優先度**: 高

**変更通知必須**: はい

**変更通知**:
```
【変更通知】
ファイル: app/consulting/start/page.tsx
箇所: 904-913行（handleQuickReply 内 subcategoryMap）
理由: SUBCATEGORY_MAP（外部モジュール）に置き換え
影響: データ内容は同一、定数として外部化

この変更を実行してよろしいですか？
```

**ファクトチェック項目**:
- [ ] SUBCATEGORY_MAP と既存データが完全一致
- [ ] 置き換え後もTypeScriptエラーなし

**検証**:
```bash
# TypeScript型チェック
npx tsc --noEmit app/consulting/start/page.tsx
```

**リスク**: 低（データ内容は同一）

---

### Task 13: 開発サーバー再起動・動作確認

**目的**: すべての変更後、開発サーバーでの動作確認

**実施内容**:
1. 開発サーバーを停止
2. キャッシュクリア
3. 開発サーバー再起動
4. コンパイル時間測定
5. ブラウザで動作確認

**依存**: Task 6-12（すべての変更完了）

**成果物**: なし（確認のみ）

**見積もり**: 15分

**優先度**: 最高

**変更通知必須**: いいえ

**実施コマンド**:
```bash
# サーバー停止
pkill -f "next"

# 待機
sleep 5

# キャッシュクリア
rm -rf .next

# サーバー起動（時間測定）
time npm run dev
# 目標: 2.0分以下（現在2.9分）
```

**ブラウザ確認項目**:
1. [ ] Start画面アクセス: `http://localhost:3000/consulting/start`
2. [ ] 新規ボタンクリック → カテゴリボタン9個表示
3. [ ] 「売上の伸び悩み」選択 → サブカテゴリ4個表示
4. [ ] 「その他」選択 → カスタム入力フォーム表示
5. [ ] 既存ボタンクリック → サンプルデータの履歴表示（4件）
6. [ ] セッション切り替え → 正常に動作
7. [ ] メッセージ送信 → 正常に動作

**リスク**: 中（統合テスト）

---

### Task 14: TypeScript全体チェック

**目的**: プロジェクト全体の型チェック

**実施内容**:
```bash
# プロジェクト全体の型チェック
npx tsc --noEmit
```

**依存**: Task 13（動作確認完了）

**成果物**: なし（確認のみ）

**見積もり**: 3分

**優先度**: 最高

**変更通知必須**: いいえ

**期待結果**: エラー0件

**リスク**: 低（最終確認）

---

### Task 15: Git コミット

**目的**: Phase 1の変更をコミット

**実施内容**:
```bash
# 新規ファイルを追加
git add types/consulting.ts
git add lib/consulting/category-data.ts
git add lib/consulting/constants.ts
git add lib/consulting/sample-data.ts

# 変更ファイルを追加
git add app/consulting/start/page.tsx

# コミット
git commit -m "$(cat <<'EOF'
refactor(consulting): Start画面リファクタリング Phase 1完了

データ・定数の外部化により、保守性とコンパイル速度を改善

変更内容:
- 型定義を types/consulting.ts に分離
- カテゴリデータを lib/consulting/category-data.ts に統合・分離
- 定数を lib/consulting/constants.ts に分離
- サンプルデータを lib/consulting/sample-data.ts に分離
- page.tsx から316行削減（1,666→1,350行）

効果:
- コンパイル時間: 2.9分 → 2.0分（予測）
- 重複削減: カテゴリデータ2箇所→1箇所
- 保守性向上: データ・定数の一元管理

関連: #phase1-refactoring
EOF
)"
```

**依存**: Task 14（全体チェック完了）

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
Task 1: ディレクトリ確認（2分）
```

**ファイル作成フェーズ**:
```
Task 2: types/consulting.ts 作成（5分）
↓
Task 3: lib/consulting/category-data.ts 作成（8分）
  ├─ ファクトチェック: カテゴリデータ2箇所の一致確認
↓
Task 4: lib/consulting/constants.ts 作成（6分）
↓
Task 5: lib/consulting/sample-data.ts 作成（10分）
```

**page.tsx 変更フェーズ**:
```
Task 6: インポート追加（3分）
↓
Task 7: 型定義削除（3分）
↓
Task 8: 定数削除（2分）
↓
Task 9: サンプルデータ関数削除（2分）
↓
Task 10: カテゴリデータ置き換え（createInitialSessionForNewUser）（5分）
  ├─ ファクトチェック: データ一致確認
↓
Task 11: カテゴリデータ置き換え（handleNewSession）（5分）
  ├─ ファクトチェック: データ一致確認
↓
Task 12: subcategoryMap 置き換え（5分）
  ├─ ファクトチェック: データ一致確認
```

**検証フェーズ**:
```
Task 13: 開発サーバー再起動・動作確認（15分）
  ├─ コンパイル時間測定
  ├─ ブラウザ動作確認（7項目）
↓
Task 14: TypeScript全体チェック（3分）
```

**完了フェーズ**:
```
Task 15: Git コミット（5分）
```

---

## 総見積もり時間

| フェーズ | タスク数 | 所要時間 |
|---------|---------|---------|
| 準備 | 1 | 2分 |
| ファイル作成 | 4 | 29分 |
| page.tsx 変更 | 7 | 25分 |
| 検証 | 2 | 18分 |
| 完了 | 1 | 5分 |
| **合計** | **15** | **約79分（1.3時間）** |

**バッファ**: 20分  
**総計**: **約100分（1.7時間）**

---

## チェックリスト

### 準備フェーズ完了条件
- [ ] lib/ ディレクトリ存在確認
- [ ] types/ ディレクトリ存在確認

### ファイル作成フェーズ完了条件
- [ ] types/consulting.ts 作成完了
- [ ] types/consulting.ts に型エラーなし
- [ ] lib/consulting/category-data.ts 作成完了
- [ ] カテゴリデータ2箇所が完全一致（ファクトチェック）
- [ ] lib/consulting/constants.ts 作成完了
- [ ] lib/consulting/sample-data.ts 作成完了

### page.tsx 変更フェーズ完了条件
- [ ] インポート追加完了
- [ ] 型定義削除完了
- [ ] 定数削除完了
- [ ] サンプルデータ関数削除完了
- [ ] カテゴリデータ置き換え（2箇所）完了
- [ ] subcategoryMap 置き換え完了
- [ ] page.tsx に型エラーなし

### 検証フェーズ完了条件
- [ ] 開発サーバー起動成功
- [ ] コンパイル時間2.0分以下
- [ ] Start画面アクセス成功
- [ ] カテゴリボタン表示確認
- [ ] サブカテゴリボタン表示確認
- [ ] カスタム入力表示確認
- [ ] サンプルデータ履歴表示確認
- [ ] セッション切り替え動作確認
- [ ] メッセージ送信動作確認
- [ ] TypeScript全体チェックでエラー0件

### 完了フェーズ完了条件
- [ ] Git コミット完了
- [ ] コミットメッセージが規約に準拠

---

## リスク管理

### 高リスクタスク

**Task 13: 開発サーバー再起動・動作確認**
- **リスク**: 統合後の動作不良
- **対策**: 7項目の詳細な確認項目
- **ロールバック**: Git revert

### 中リスクタスク

**Task 3, 10, 11, 12: カテゴリデータ関連**
- **リスク**: データ不一致
- **対策**: ファクトチェック（内容比較）
- **ロールバック**: Git revert

---

## ファクトチェックポイント

### Task 3: カテゴリデータ統合前

**確認項目**:
```bash
# 461-477行と707-717行の内容を抽出・比較
grep -A 10 'label: "売上の伸び悩み"' app/consulting/start/page.tsx | head -20

# 期待: 2箇所で完全一致
```

**手動確認**:
- [ ] ラベル名が一致（9カテゴリ）
- [ ] icon が一致
- [ ] color が一致
- [ ] bgLight が一致

### Task 10, 11: カテゴリデータ置き換え後

**確認項目**:
```typescript
// CONSULTING_CATEGORIES の内容を確認
console.log(CONSULTING_CATEGORIES);

// 期待: 既存データと完全一致
```

### Task 12: subcategoryMap 置き換え後

**確認項目**:
```typescript
// SUBCATEGORY_MAP の内容を確認
console.log(SUBCATEGORY_MAP);

// 期待: 既存データと完全一致（8カテゴリ、各4サブカテゴリ）
```

---

## 成功基準

### Phase 1完了の定義

1. **削減目標達成**
   - ✅ page.tsx: 1,666行 → 1,350行以下
   - ✅ 削減: 316行以上

2. **動作確認**
   - ✅ すべての機能が正常動作（7項目）
   - ✅ TypeScriptエラー0件

3. **パフォーマンス**
   - ✅ コンパイル時間: 2.0分以下（目標）

4. **コード品質**
   - ✅ 重複削減: カテゴリデータ2箇所→1箇所
   - ✅ 定数の一元管理
   - ✅ 型定義の共有

5. **Git管理**
   - ✅ コミットメッセージが規約準拠
   - ✅ 変更履歴が明確

---

**次のアクション**: Implementフェーズへ移行し、Task 1から順次実施する
