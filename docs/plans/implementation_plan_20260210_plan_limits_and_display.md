# 📝 Implementation Plan: プラン別制限と表示

## タスク一覧

### Task 1: Design/Plan ドキュメント作成（このファイル）
- **目的**: 実装タスクを小さく分解し、順序と影響範囲を明確にする。
- **依存**: Brainstorm / Design ドキュメント。
- **成果物**: 本ファイル。

### Task 2: プラン定義モジュールの追加（`lib/plan-config.ts`）
- **目的**: プラン上限値と表示情報を一元管理する。
- **依存**: なし（単体で作成可能）。
- **内容**:
  - `PlanType`, `PlanLimits`, `PlanMeta` 型定義。
  - `PLAN_CONFIG` 定数に Free / Pro(standard) / Enterprise の設定値を定義。
  - `getPlanMeta`, `getPlanLimits` のユーティリティ関数を実装。
- **影響範囲**:
  - 後続の API / UI からインポートされる。

### Task 3: セッション作成APIへの上限チェック追加（`app/api/consulting/sessions/route.ts`）
- **目的**: プランごとの「今月の課題数（セッション数）」上限を enforce する。
- **依存**: Task 2（`getPlanLimits` を利用）。
- **内容**:
  - 認証後、`profiles` から `plan_type` を取得。
  - `PlanLimits.maxSessions` を取得し、Enterprise（`isUnlimited`）ならチェックをスキップ。
  - 当月の `consulting_sessions` を COUNT。
  - 上限超過時はエラー（`400` + メッセージ）を返す。
  - OK の場合は既存ロジックでセッションを作成。
- **注意**:
  - 変更前に「どこに INSERT しているか」を確認し、その直前にチェックを挿入する。

### Task 4: メッセージ送信APIへの上限チェック追加（`app/api/consulting/sessions/[id]/messages/route.ts`）
- **目的**: プランごとの「今月のAI相談回数（AI回答数）」上限を enforce する。
- **依存**: Task 2（`getPlanLimits`）、既存の monthly_chat_count インクリメント実装。
- **内容**:
  - 認証・セッション所有権チェック後、Dify 呼び出し前に:
    - `profiles` から `plan_type`, `monthly_chat_count` を取得。
    - `PlanLimits.maxTurnsTotal` を取得し、Enterprise ならチェックをスキップ。
    - `remaining = maxTurnsTotal - monthly_chat_count` を計算。
    - `remaining <= 0` なら Dify を呼ばずにエラーレスポンスを返却。
  - 既存の Dify 呼び出しと monthly_chat_count インクリメントは、制限を超えていない場合のみ実行。
- **注意**:
  - 既存の monthly_chat_count インクリメント処理と競合しないようにする（位置だけ追加）。

### Task 5: アカウント設定画面のプラン・利用状況表示強化（`components/SettingsContent.tsx`）
- **目的**: 「今月の課題数 / AI相談回数 / 残り回数」とプラン詳細を、アカウント画面のプラン表示部分に集約する。
- **依存**: Task 2, Task 3, Task 4（値の意味づけが揃っていること）。
- **内容**:
  - `PlanMeta` / `PlanLimits` を利用して、現在プランの名称・説明・価格を表示。
  - 「今月の課題数: currentSessions / maxSessions（Enterpriseは制限なし）」を表示。
  - 「今月のAI相談: monthly_chat_count / maxTurnsTotal（Enterpriseは制限なし）」を表示。
  - 残り回数 `remaining = maxTurnsTotal - monthly_chat_count` を計算し、「既存の課題であと remaining 回 AI に相談できます」を表示。
- **注意**:
  - 追加する計算ロジックはコンポーネント内の小さなヘルパー関数にまとめ、JSX を読みやすく保つ。
  - 既存の「アカウント情報」ブロックに自然に組み込む。

### Task 6: 設定タブの sticky 化（`components/SettingsContent.tsx`）
- **目的**: 設定タブをスクロールしても画面上部に固定表示し、タブ遷移をしやすくする。
- **依存**: なし（レイアウト変更のみ）。
- **内容**:
  - `TabsList` を囲むコンテナに `sticky top-0 z-20 bg-...` クラスを追加。
  - 下のコンテンツとの余白・境界を整える（軽いスタイル調整）。
- **注意**:
  - JSX/HTML 構造が崩れないよう、タグの開閉を2〜3回検証する（プロジェクトルール準拠）。

## 実装順序

1. **Task 2**: `lib/plan-config.ts` 追加  
   → 他タスクが共通で使うため最初に実装。
2. **Task 3**: セッション作成API上限チェック  
   → セッション数の制限を先に入れる。
3. **Task 4**: メッセージ送信API上限チェック  
   → AI相談回数の制限を実装。
4. **Task 5**: アカウント設定画面のプラン・利用状況表示  
   → バックエンドのロジックが揃った後で UI を連動させる。
5. **Task 6**: 設定タブの sticky 化  
   → UI の仕上げとして最後に実施。

## リスクと対策

- **リスク**: 上限チェックのロジック追加で既存フローが壊れる可能性。
  - **対策**: INSERT/処理の直前にのみロジックを挿入し、それ以外は変えない。
- **リスク**: JSX 編集時のタグ開閉ミス。
  - **対策**: ルールどおり 2〜3 回のタグ検証（構造確認）を行う。

