# 🧠 Brainstorm: Start画面リファクタリング（パフォーマンス最適化）

**作成日**: 2026-02-04  
**対象機能**: Start画面（page.tsx）の大規模リファクタリング  
**プロジェクト**: AI Consulting Zero  
**目的**: コンパイル時間削減、保守性向上、Dify統合準備

---

## プロジェクトコンテキスト

- **技術スタック**: Next.js 16 + TypeScript + Supabase
- **ファイル保護レベル**: レベル3（Start画面の構造変更）
- **関連ファイル**: 
  - `app/consulting/start/page.tsx`（1,666行 - 改善対象）
  - 新規: データ・定数ファイル（複数）
  - 新規: カスタムhook（複数）

---

## 問題の発見

### 【重大】コンパイル時間の異常

**実測データ**:
```
✓ Ready in 145.5s           ← サーバー起動に2.4分
GET /consulting/start 200 in 2.9min (compile: 2.9min, ...)  ← Start画面コンパイルに2.9分
curl リクエスト: 333秒（5分半） ← HTTPレスポンスに5分半
```

**原因の特定**:
- ファイルサイズ: **1,666行**（Next.jsページとしては異常に大きい）
- Turbopackのコンパイル: Start画面単体で **2.9分**
- 初回アクセス: ユーザー体験として許容できない遅さ

### ファイル構造の詳細分析

```
app/consulting/start/page.tsx (1,666行)
├─ インポート: 1-37行 (37行)
├─ 型定義: 39-90行 (52行)
├─ 定数: 91-104行 (14行)
├─ createInitialSessions: 106-378行 (273行) ★ サンプルデータ、本番不要
├─ mapApiSessionsToSessionData: 393-443行 (51行)
├─ createInitialSessionForNewUser: 446-494行 (49行) ★ カテゴリデータ重複
└─ ConsultingStartPage: 499-1666行 (1,168行) ★ 巨大なメインコンポーネント
   ├─ useState宣言: 500-531行 (32行)
   ├─ useVoiceInput: 511行
   ├─ useEffect（複数）: 514-994行
   ├─ handleChoiceNew: 533-538行
   ├─ handleChoiceExisting: 540-563行
   ├─ currentSession計算: 566-595行
   ├─ displaySessions計算: 598-611行
   ├─ handleSessionChange: 618-631行
   ├─ handleSessionClose: 633-668行
   ├─ handleRenameSession: 670-679行
   ├─ handleNewSession: 681-763行 (83行)
   ├─ handleOpenSession: 765-785行
   ├─ handleTogglePin: 787-791行
   ├─ handleDeleteSession: 793-817行
   ├─ handleSendMessage: 819-862行
   ├─ handleFileAttach: 864-868行
   ├─ handleRemoveFile: 870-872行
   ├─ handleQuickReply: 881-953行 (73行) ★ subcategoryMap埋め込み
   ├─ handleStepClick: 955-967行
   ├─ confirmStepNavigation: 969-980行
   ├─ handleEndSession: 996-998行
   ├─ confirmEndSession: 1000-1077行 (78行)
   └─ JSX return: 1120-1666行 (547行) ★ 巨大なJSX
```

---

## 問題点の整理

### 1. サンプルデータの肥大化（273行）

**場所**: `createInitialSessions` 関数（106-378行）

**問題**:
- 4つのサンプルセッションを全て定義
- 各セッションに messages, kpis, steps を含む
- 本番環境では使用されない（APIから取得）
- **開発用データが本番ビルドに含まれている**

**影響**:
- ファイルサイズ: 約16%（273/1666行）
- コンパイル時間への影響: 大
- バンドルサイズへの影響: 中

### 2. カテゴリデータの重複定義

**場所**:
- `createInitialSessionForNewUser`: 461-477行（17行）
- `handleNewSession`: 707-717行（11行）

**問題**:
- 同じカテゴリボタンデータが2箇所に定義
- メンテナンス時に2箇所修正が必要
- データ不整合のリスク

**カテゴリデータ内容**:
```typescript
{ label: "売上の伸び悩み", icon: "TrendingDown", color: "bg-red-500", ... }
{ label: "コスト削減", icon: "DollarSign", color: "bg-green-500", ... }
// ... 9カテゴリ × 2箇所 = 計34行の重複
```

### 3. サブカテゴリマップの埋め込み（10行）

**場所**: `handleQuickReply` 内（904-913行）

**問題**:
- subcategoryMap が関数内にハードコード
- 再利用不可
- テストしづらい

**内容**:
```typescript
const subcategoryMap: Record<string, string[]> = {
  "売上の伸び悩み": ["新規顧客獲得が低調", ...],
  "コスト削減": ["人件費の最適化", ...],
  // ... 8カテゴリ
}
```

### 4. メインコンポーネントの巨大化（1,168行）

**問題**:
- 1つのコンポーネントに1,168行
- 20個以上のハンドラー関数
- 10個以上のuseState/useEffect
- JSXが547行
- 可読性・保守性が低い
- テストが困難

### 5. インポートの肥大化（37行）

**場所**: 1-37行

**問題**:
- lucide-react から11個のアイコンを個別インポート
- すべてのコンポーネントを個別インポート
- バンドルサイズへの影響

**インポート例**:
```typescript
import { ArrowRight, BarChart3, CheckCircle2, FileText, Lightbulb, 
         MessageSquare, Send, Target, TrendingDown, DollarSign, Rocket, 
         Users, Edit3, Cpu, Shield, Cloud, Zap, X, Paperclip, Mic, MicOff } 
from "lucide-react";
```

### 6. JSXの巨大化（547行）

**場所**: return文（1120-1666行）

**問題**:
- 1つのreturnに547行のJSX
- 複数のダイアログ、サイドバー、チャットエリアが混在
- ネストが深い（最大10階層以上）
- 可読性が極めて低い

---

## パフォーマンス影響の定量分析

### コンパイル時間の内訳（推測）

| 要素 | 推定影響 | 根拠 |
|------|---------|------|
| ファイルサイズ（1,666行） | 40% | 大規模JSXの解析 |
| サンプルデータ（273行） | 15% | 複雑なオブジェクト構造 |
| インポート数（20+） | 15% | 依存関係解決 |
| JSX複雑度（547行） | 20% | ネスト解析、型チェック |
| その他 | 10% | - |

### 削減目標

| 項目 | 現在 | 目標 | 削減率 |
|------|------|------|--------|
| 総行数 | 1,666行 | 600行以下 | -64% |
| サンプルデータ | 273行 | 0行（分離） | -100% |
| メイン関数 | 1,168行 | 300行以下 | -74% |
| JSX | 547行 | 200行以下 | -63% |
| コンパイル時間 | 2.9分 | 30秒以下 | -83% |

---

## リファクタリング方針（案）

### 方針A: 段階的分離（推奨）

**アプローチ**:
1. データ・定数を外部ファイルに分離
2. カスタムhookに状態管理を移行
3. サブコンポーネントに分割
4. 最終的に page.tsx を「組み立て役」に

**利点**:
- ✅ 段階的実施可能（1ファイルずつ）
- ✅ テスト容易
- ✅ リスク低
- ✅ ロールバック可能

**欠点**:
- ⚠️ ファイル数が増える
- ⚠️ 実施に時間がかかる

### 方針B: 全面書き直し

**アプローチ**:
- page.tsx を完全に再設計
- 最初から最適な構造で実装

**利点**:
- ✅ 最適な設計になる
- ✅ 技術的負債なし

**欠点**:
- ❌ リスクが高い
- ❌ テスト工数大
- ❌ バグ混入リスク
- ❌ 既存機能の動作保証が困難

### 方針C: 最小限の最適化のみ

**アプローチ**:
- サンプルデータのみ分離
- 他は現状維持

**利点**:
- ✅ 実施時間が短い
- ✅ リスク最小

**欠点**:
- ❌ 根本的な改善にならない
- ❌ 保守性が低いまま
- ❌ Dify統合時に再度問題化

---

## ファクトチェック結果

### 実測データの確認

**✅ 確認済み**:
- 総行数: 1,666行（`wc -l` で確認）
- コンパイル時間: 2.9分（サーバーログで確認）
- ページレスポンス: 200 OK（curl で確認）
- サンプルデータ: 273行（106-378行）

**✅ 検証済み**:
- カテゴリデータ重複: 2箇所（461-477行、707-717行）
- subcategoryMap: handleQuickReply内（904-913行）
- JSX行数: 547行（1120-1666行）

### 他プロジェクトとの比較（業界標準）

**Next.js ページの一般的なサイズ**:
- 小規模: 100-300行
- 中規模: 300-600行
- 大規模: 600-1000行
- **超大規模: 1000行以上**（リファクタリング推奨）

**当プロジェクト**:
- Start画面: **1,666行**（超大規模の1.6倍）
- **業界標準の2.7倍以上**

### コンポーネント分離の効果（理論値）

**想定シナリオ**: サンプルデータ分離 + 5つのhook化 + 3つのコンポーネント分離

**削減見込み**:
```
現在: 1,666行

分離後の page.tsx:
- インポート: 30行
- 型定義: 20行（共通型は別ファイル）
- メイン: 250行（組み立てのみ）
= 合計 300行

外部ファイル:
- lib/consulting/sample-data.ts: 300行
- lib/consulting/constants.ts: 50行
- hooks/useConsultingSession.ts: 200行
- hooks/useMessageHandlers.ts: 150行
- components/consulting/ChatArea.tsx: 300行
- components/consulting/SessionDialogs.tsx: 200行

総コード量: 1,500行（-10%）
メインファイル: 300行（-82%）
```

**コンパイル時間の理論値**:
- 現在: 2.9分（174秒）
- 分離後: 30-45秒（予測）
- 削減: 約75-83%

---

## 逆質問リスト

### 1. リファクタリングのスコープ

**Q1-1: どこまでやるか？**
- A. データ分離のみ（最小限）
- B. hook化 + データ分離（中程度）
- C. 完全なコンポーネント分割（最大限）

**Q1-2: 優先度は？**
- A. コンパイル時間削減が最優先
- B. 保守性向上が最優先
- C. Dify統合の準備が最優先

### 2. サンプルデータの扱い

**Q2-1: createInitialSessions（273行）**
- A. 完全に削除（本番では不要）
- B. 別ファイルに分離（開発時のみ使用）
- C. 環境変数で切り替え（DEV=サンプル、PROD=API）

**Q2-2: サンプルデータの保持場所**
- A. `lib/consulting/sample-data.ts`
- B. `__mocks__/consulting-sessions.ts`
- C. `app/consulting/start/sample-data.ts`（同階層）

### 3. コンポーネント分割の粒度

**Q3-1: ChatArea（メッセージ表示部分）**
- A. 分離する（推奨）
- B. 現状維持

**Q3-2: SessionDialogs（確認ダイアログ群）**
- A. 分離する（推奨）
- B. 現状維持

**Q3-3: StepNavigation（左サイドバー）**
- A. 分離する
- B. 現状維持（既に複雑ではない）

### 4. カスタムhook化

**Q4-1: セッション管理ロジック**
- A. `useConsultingSession` に分離
  - allSessions, activeSessionId, handleSessionChange等
- B. 現状維持

**Q4-2: メッセージ管理ロジック**
- A. `useMessageHandlers` に分離
  - handleSendMessage, handleQuickReply等
- B. 現状維持

**Q4-3: ファイル添付ロジック**
- A. `useFileAttachment` に分離
- B. handleSendMessage内に統合

### 5. 定数の外部化

**Q5-1: CATEGORY_ACCENT_MAP（14行）**
- A. `lib/consulting/constants.ts` に移動
- B. 現状維持

**Q5-2: subcategoryMap（10行）**
- A. `lib/consulting/constants.ts` に移動（推奨）
- B. 現状維持

**Q5-3: カテゴリボタンデータ**
- A. `lib/consulting/category-data.ts` に移動
- B. 定数ファイルに統合

### 6. 型定義の整理

**Q6-1: 共通型の分離**
- A. `types/consulting.ts` に移動
  - ConsultingStep, Message, CategoryData, KPI等
- B. 現状維持（page.tsx内）

### 7. 実施タイミング

**Q7-1: いつ実施？**
- A. 今すぐ（Dify統合前）
- B. Dify統合と並行
- C. Dify統合後

**Q7-2: 段階的実施の順序**
- A. データ分離 → hook化 → コンポーネント分割
- B. コンポーネント分割 → hook化 → データ分離
- C. hook化 → データ分離 → コンポーネント分割

---

## 推奨方針（ファクトチェック後）

### 【推奨】方針A: 段階的分離（3段階）

#### Phase 1: データ・定数の外部化（即効性大）

**実施内容**:
1. `createInitialSessions` → `lib/consulting/sample-data.ts`（開発専用）
2. `CATEGORY_ACCENT_MAP` → `lib/consulting/constants.ts`
3. `subcategoryMap` → `lib/consulting/constants.ts`
4. カテゴリボタンデータ → `lib/consulting/category-data.ts`

**削減見込み**:
- 行数: 1,666 → 1,350行（-19%）
- コンパイル時間: 2.9分 → 2.0分（予測）

**リスク**: 低（データのみ移動）

#### Phase 2: カスタムhook化（保守性向上）

**実施内容**:
1. `useConsultingSession`: セッション管理
   - allSessions, activeSessionId, setActiveSessionId
   - handleSessionChange, handleSessionClose, handleNewSession等
   
2. `useMessageHandlers`: メッセージ処理
   - handleSendMessage, handleQuickReply
   - inputValue, setInputValue
   
3. `useFileAttachment`: ファイル管理
   - attachedFiles, handleFileAttach, handleRemoveFile

**削減見込み**:
- 行数: 1,350 → 800行（-41%）
- コンパイル時間: 2.0分 → 1.0分（予測）

**リスク**: 中（ロジック移動）

#### Phase 3: コンポーネント分割（可読性向上）

**実施内容**:
1. `ChatArea.tsx`: メッセージ表示部分（400行）
2. `SessionDialogs.tsx`: 確認ダイアログ群（150行）
3. `MessageInputArea.tsx`: 入力エリア（100行）

**削減見込み**:
- 行数: 800 → 300行（-63%）
- コンパイル時間: 1.0分 → 30秒（予測）

**リスク**: 中（構造変更）

---

## 【重要】Dify統合への影響

### リファクタリング後のDify統合

**メリット**:
- ✅ `useMessageHandlers` にDify通信ロジックを追加しやすい
- ✅ `handleSendMessage` のフック化で拡張が容易
- ✅ サンプルデータ分離により、本番とDev環境の切り替えが明確
- ✅ コンパイル時間短縮で開発体験向上

**デメリット**:
- ⚠️ リファクタリング中はDify統合作業が停止
- ⚠️ 同時進行の場合、コンフリクトリスク

### 推奨実施順序

**パターンA: リファクタリング優先**
```
1. Start画面リファクタリング（Phase 1-3）
2. テスト・動作確認
3. Dify統合開始
```

**メリット**: 綺麗なコードベースでDify統合可能  
**デメリット**: Dify統合が遅れる

**パターンB: 最小限リファクタリング + Dify統合並行**
```
1. Phase 1のみ実施（データ分離）
2. Dify統合開始
3. Dify統合完了後、Phase 2-3実施
```

**メリット**: Dify統合を早く開始可能  
**デメリット**: 巨大なファイルのままDify統合

---

## スコープ外（今回やらないこと）

1. **他のページのリファクタリング**: Start画面のみ対象
2. **UIデザインの変更**: 機能・見た目は現状維持
3. **新機能の追加**: リファクタリングに集中
4. **Dify統合の実装**: 別タスク（このリファクタリング後）

---

## セキュリティ・安全性の考慮

### ファイル保護レベル

- `app/consulting/start/page.tsx`: レベル3（変更可能）
- 新規ファイル: すべてレベル3

### 変更方針

- ❌ インポート文の自動整理禁止（依存関係破壊リスク）
- ✅ 1ファイルずつ変更・確認
- ✅ 各Phase後に動作確認
- ✅ Git commitで段階的に記録

---

## 次のステップ

### 【この Brainstorm 完了後】

1. **ユーザーに逆質問を投げる**
   - 上記Q1-Q7の回答を得る
   - 方針を確定

2. **Design フェーズへ**
   - ファイル構造設計
   - hook設計
   - コンポーネント分割設計

3. **Plan フェーズへ**
   - タスク分解
   - 実施順序決定
   - 各Phase の詳細計画

4. **Implement フェーズへ**
   - Phase 1: データ分離
   - Phase 2: hook化
   - Phase 3: コンポーネント分割

---

## 暫定的な確定要件（推奨案）

**前提**: ユーザー回答前の推奨案

1. **リファクタリング方針**: 方針A（段階的分離）
2. **実施範囲**: Phase 1-3 すべて実施
3. **サンプルデータ**: 環境変数で切り替え（DEV/PROD）
4. **hook化**: useConsultingSession, useMessageHandlers を作成
5. **コンポーネント分割**: ChatArea, SessionDialogs を分離
6. **実施タイミング**: Dify統合前（パターンA）
7. **定数**: すべて外部ファイルに移動

**目標**:
- page.tsx: 300行以下
- コンパイル時間: 30秒以下
- 保守性: 大幅向上
- Dify統合: スムーズに実施可能

---

## ファイル影響範囲（推奨案）

### 新規作成（Phase 1）
- `lib/consulting/sample-data.ts`: サンプルセッションデータ
- `lib/consulting/constants.ts`: CATEGORY_ACCENT_MAP, subcategoryMap
- `lib/consulting/category-data.ts`: カテゴリボタンデータ
- `types/consulting.ts`: 共通型定義

### 新規作成（Phase 2）
- `hooks/useConsultingSession.ts`: セッション管理hook
- `hooks/useMessageHandlers.ts`: メッセージ処理hook
- `hooks/useFileAttachment.ts`: ファイル添付hook

### 新規作成（Phase 3）
- `components/consulting/ChatArea.tsx`: チャット表示エリア
- `components/consulting/SessionDialogs.tsx`: 確認ダイアログ群
- `components/consulting/MessageInputArea.tsx`: 入力エリア

### 変更対象
- `app/consulting/start/page.tsx`: メイン（1,666行 → 300行）

### 参照のみ
- 既存コンポーネント: SessionTabs, SessionHistoryPanel等

---

**次のアクション**: ユーザーに逆質問リストを提示し、方針を確定する
