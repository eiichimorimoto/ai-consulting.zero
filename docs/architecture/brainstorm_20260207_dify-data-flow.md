# 🧠 Brainstorm: Dify連携とデータフロー完全検証

**日付**: 2026-02-07  
**機能名**: Dify APIへの会社情報送信と初回画面表示の修正

---

## プロジェクトコンテキスト

- **技術スタック**: Next.js 16 + TypeScript + Supabase + Dify API
- **ファイル保護レベル**: レベル2（慎重に扱う）
- **関連ファイル**:
  - `app/api/dify/chat/route.ts`
  - `app/api/consulting/sessions/[id]/messages/route.ts`
  - `hooks/useMessageHandlers.ts`

---

## 要件サマリー

### 現在の問題

1. **会社情報がDifyに渡っていない**
   - Supabaseには会社情報が存在する
   - しかしDify APIに渡される時点で空になっている
   - 原因: 認証セッションが取得できず、RLSポリシーが機能していない
   - ログ: `has_auth_user: false`, `count: 0`

2. **初回カテゴリ選択画面が表示されない**
   - 動的生成ロジックは実装済み
   - しかし画面に表示されていない
   - GET APIのレスポンスで `interactive` データが含まれているか不明

3. **Difyの応答が不十分**
   - 「会社名や業界情報を直接提供していただく必要があります」
   - 会社情報が inputs に含まれていない

---

## 逆質問リスト

### 1. **機能要件**
- ✅ 初回カテゴリ選択画面は**必ず**履歴のトップに表示される
- ✅ 会社情報（会社名、業種、従業員数、Webサイト等）をDifyに渡す
- ✅ カテゴリ・サブカテゴリ情報もDifyに渡す

### 2. **技術整合性**
- ✅ Next.js/Supabaseとの統合方法は現行通り
- ✅ Dify APIのinputs構造も現行通り

### 3. **セキュリティ**
- ✅ SERVICE_ROLE_KEYを使用してRLSをバイパス
- ✅ userIdは上流で認証済みのため、安全

### 4. **ファイル影響**
- ✅ 保護レベル2のファイルを変更（変更通知必須）

### 5. **外部検索（Dify側）**
- ✅ 会社のWebサイトURLは会社情報に含まれる
- ⏸️ 外部検索機能は今回のスコープ外（将来的に検討）

---

## 回答サマリー

ユーザーからの回答:
1. **データフロー**: 正しい
2. **HPのURL**: 会社情報で持っている
3. **優先順位**: OK（会社情報 → 初回画面 → 外部検索）

---

## 確定要件

### 優先度1: 会社情報をDifyに渡す
- SERVICE_ROLE_KEYを使用してRLSをバイパス（実装済み）
- プロフィール + 会社情報をJOINで取得
- Dify APIの `inputs` に以下を含める:
  - `company_name`
  - `industry`
  - `capital`
  - `employee_count`
  - `website`
  - `business_description`
  - `user_name`
  - `user_position`
  - `user_department`
  - `selected_category`
  - `selected_subcategory`

### 優先度2: 初回カテゴリ画面を表示
- GET APIで初回メッセージを動的生成（実装済み）
- `interactive` データに `CONSULTING_CATEGORIES` を含める
- offset=0の場合のみ生成

### 優先度3: カテゴリ情報をDifyに渡す
- sessionStorageから取得（実装済み）
- Dify APIの `inputs` に含める（実装済み）

---

## スコープ外

- 外部検索機能（Difyワークフロー設計）
- Webサイト情報の自動取得
- Backボタンの実装（別途対応）

---

## ファイル影響範囲

### 変更対象
1. `app/api/dify/chat/route.ts` (保護レベル2)
   - SERVICE_ROLE_KEY使用（実装済み）
   - デバッグログ追加
   
2. `app/api/consulting/sessions/[id]/messages/route.ts` (保護レベル2)
   - 初回メッセージ動的生成（実装済み）
   - GET APIのレスポンス検証

3. `hooks/useMessageHandlers.ts` (保護レベル3)
   - カテゴリ情報の保存と送信（実装済み）

### 参照のみ
- `lib/supabase/server.ts`
- `supabase/schema.sql`
- `lib/consulting/category-data.ts`

---

## 次のステップ

**Phase 2: DESIGN（設計）** に進み、現在の実装を検証します。
