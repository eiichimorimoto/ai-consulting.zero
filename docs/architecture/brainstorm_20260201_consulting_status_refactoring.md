# 🧠 Brainstorm: 相談履歴・ステータス管理の改善

**作成日**: 2026-02-01  
**担当**: AI Consulting Zero 開発チーム

---

## プロジェクトコンテキスト
- **技術スタック**: Next.js 16 + TypeScript + Supabase
- **ファイル保護レベル**: レベル2-3（慎重な変更が必要）
- **関連ファイル**: 
  - `app/consulting/start/page.tsx`
  - `app/consulting/components/SimpleSidebar.tsx`
  - `app/consulting/components/ConsultingHeader.tsx`
  - `app/api/consulting/sessions/[id]/route.ts`
  - `supabase/schema.sql`

---

## 要件サマリー

### ユーザーからの指摘

> 左メニューの相談履歴の作り方がおかしくないか？

1. **相談履歴の作り方が不適切**
   - 現在：1つ相談したら履歴になっている
   - あるべき：課題に対する相談が「終了」した時点で履歴になる
   - 履歴の単位：以前相談したAIとのチャットが「終了」まで（「完了」ではない）

2. **ステータス管理が不足**
   - 現在：ステータスを入れる場所がない
   - 必要：課題会話が終わる時点で「まだ相談中」なのか「課題は解決して完了」なのかを決める

### 必要な変更

1. **終了ボタンの変更**
   - 現在：「終了」ボタン1つ
   - 変更後：「課題継続」ボタン + 「課題完了」ボタンの2つ

2. **左メニューの相談履歴表示**
   - デフォルト：「課題継続」（status='active'）のみ表示
   - オプション：ステータスフィルター追加（完了・アーカイブも見れる）

---

## 現状分析

### DBスキーマ（consulting_sessions）

```sql
CREATE TABLE consulting_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'completed', 'archived')),
  -- その他のフィールド...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 現在のステータスの意味（曖昧）
- `active`: 相談中？（実際は全ての相談が履歴に表示されている）
- `completed`: 完了？（使われていない）
- `archived`: アーカイブ？（使われていない）

### 現在のUI動作
1. **新規相談開始**
   - ステータス: `active`
   - 左メニューの履歴に即座に表示される

2. **終了ボタンクリック**
   - ステータス: `completed` に変更
   - 左メニューの履歴に残る（フィルタリングなし）

3. **左メニューの履歴**
   - 全ての相談セッションを表示（statusに関係なく）
   - フィルター機能なし

---

## 確定要件

### 1. ステータスの意味を明確化

| ステータス | 意味 | 表示場所 | 説明 |
|-----------|------|---------|------|
| `active` | 課題継続中 | 左メニュー（デフォルト） | まだ相談が続いている状態 |
| `completed` | 課題完了 | フィルター選択時のみ | 課題が解決して完了した状態 |
| `archived` | アーカイブ | フィルター選択時のみ | 削除せずに非表示にした状態 |

### 2. 新しいユーザーフロー

#### パターンA: 課題継続
```
新規相談開始 (status='active')
  ↓
相談を進める
  ↓
「課題継続」ボタンクリック
  ↓
status='active'のまま維持
  ↓
左メニューの「相談履歴」に残る
  ↓
後日、同じ相談を再開可能
```

#### パターンB: 課題完了
```
新規相談開始 (status='active')
  ↓
相談を進める
  ↓
「課題完了」ボタンクリック
  ↓
status='completed'に変更
  ↓
左メニューから非表示（デフォルト）
  ↓
フィルターで「完了」を選択すると表示
```

### 3. UI変更

#### ConsultingHeader
```tsx
// Before
<Button onClick={onEndSession}>
  <X /> 終了
</Button>

// After
<div className="flex gap-2">
  <Button onClick={() => onEndSession('active')} variant="outline">
    <Pause /> 課題継続
  </Button>
  <Button onClick={() => onEndSession('completed')} variant="default">
    <CheckCircle /> 課題完了
  </Button>
</div>
```

#### SimpleSidebar
```tsx
// 追加: ステータスフィルター
<Select value={statusFilter} onValueChange={setStatusFilter}>
  <option value="active">相談中</option>
  <option value="completed">完了</option>
  <option value="all">すべて</option>
</Select>

// 履歴一覧のフィルタリング
const filteredSessions = sessions.filter(s => 
  statusFilter === 'all' || s.status === statusFilter
)
```

---

## スコープ外（今回はやらないこと）

- アーカイブ機能の実装（将来対応）
- 相談セッションの削除機能
- 相談セッションの検索機能
- ステータスの一括変更機能

---

## 技術的な考慮事項

### 1. DB変更の必要性
- **不要**：既存のスキーマで対応可能
- statusの値は既に `active`, `completed`, `archived` をサポート

### 2. API変更
- `PATCH /api/consulting/sessions/[id]`
  - リクエストボディに `status` パラメータ追加
  - `'active'` または `'completed'` を受け取る

### 3. フロントエンド変更
- `ConsultingHeader`: 終了ボタンを2つに分割
- `SimpleSidebar`: ステータスフィルター追加
- `page.tsx`: `handleEndSession` の引数に `status` 追加

### 4. データ整合性
- 既存の `status='active'` のセッションはそのまま使用可能
- 既存の `status='completed'` のセッションもそのまま使用可能

---

## リスク管理

### リスク1: 既存データの扱い
- **影響**: 既存の相談セッションの表示が変わる
- **対策**: デフォルトで `active` のみ表示、フィルターで切り替え可能に

### リスク2: UXの混乱
- **影響**: 「課題継続」と「課題完了」の違いがわかりにくい
- **対策**: ツールチップやヘルプテキストを追加

### リスク3: 誤操作
- **影響**: 間違って「課題完了」を押してしまう
- **対策**: 確認ダイアログを表示（オプション）

---

## 次のステップ

Phase 2: DESIGN
- UIコンポーネントの詳細設計
- API仕様の詳細設計
- 状態管理の設計
