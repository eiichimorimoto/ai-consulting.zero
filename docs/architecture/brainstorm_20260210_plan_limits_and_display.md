# 🧠 Brainstorm: プラン別制限と表示（相談/アカウント連携）

## プロジェクトコンテキスト
- 技術スタック: Next.js 16 + TypeScript + Supabase
- ファイル保護レベル:
  - レベル1: `middleware.ts`, `next.config.js`, `package.json` など（今回は触らない）
  - レベル2: `lib/supabase.ts`, `lib/auth.ts`, `app/layout.tsx`, `app/api/**`
  - レベル3: `components/**`（`SettingsContent.tsx` を含む）、`lib/**` の新規モジュール
- 関連テーブル: Supabase `profiles`, `consulting_sessions`, `consulting_messages`

## 要件サマリー
ユーザーごとに Free / Pro / Enterprise のプランを定義し、それぞれに

- 月あたりの **課題数（= 相談セッション数）上限**
- 月あたりの **AI回答数（総往復数）上限**

を設ける。  
相談画面は出来るだけシンプルに保ち、**制限に達したタイミングでのみ**メッセージを出す。  
詳細な利用状況（今月の課題数・AI相談回数・残り回数など）は、**アカウント設定画面（プラン表示）側でまとめて見せる**。

## 逆質問リスト
1. **機能要件**
   - Free / Pro / Enterprise の各プランごとに、課題数とAI回答数の上限をどう定義するか？
   - 無料枠を使い切った後の挙動（新規セッション不可 / 既存セッション内での制限メッセージ）をどうするか？
2. **技術整合性**
   - 既存の `profiles.plan_type` / `monthly_chat_count` との整合は取れるか？
   - 月あたりの課題数はどのように集計するか？（追加カラムか、`consulting_sessions` の COUNT か）
3. **セキュリティ / 課金まわり**
   - 今回は Stripe 等の決済連携は行わず、「内部的な上限ロジック」のみに留めて良いか？
4. **UI/UX**
   - 相談画面には「制限に達したときのメッセージ」だけを表示し、詳細な数字はアカウント画面に寄せる方針で良いか？
   - 設定画面のタブはスクロールしても固定表示（sticky）で良いか？

## 回答サマリー（ユーザーからの指示）
- プラン仕様:
  - Free: 月 5 セッション（課題 5つ）、1セッション15往復、クレジット不要
  - Pro: 月 30 セッション、1セッション30往復、決済あり
  - Enterprise: 無制限（詳細は個別相談）
- カウントの軸:
  - 「課題数」＝ セッション数（`consulting_sessions`）
  - 「AI相談回数」＝ AI回答数（既存の `monthly_chat_count` を利用）
- 表示場所:
  - 相談画面ではカウントを常時表示しない。
  - 制限に達した場合に「回数制限を超えました。アカウントのプランをご覧ください。」と表示。
  - 詳細なカウント（今月の課題数 / AI相談回数 / 残り回数）はアカウント設定のプラン表示に集約。
- UI:
  - 設定画面のタブを固定（スクロールしても動かないように）してほしい。

## 確定要件
- **プラン上限値**
  - Free: `maxSessions = 5`, `maxTurnsPerSession = 15`, `maxTurnsTotal = 75`
  - Pro(内部的には `standard`): `maxSessions = 30`, `maxTurnsPerSession = 30`, `maxTurnsTotal = 900`
  - Enterprise: 制限なし（制限チェックをスキップ）
- **制限チェックの振る舞い**
  - 新規セッション作成時:
    - 当月の `consulting_sessions` をユーザーごとに COUNT し、`maxSessions` を超えていれば新規作成不可。
  - メッセージ送信時:
    - Dify 呼び出し前に `monthly_chat_count` と `maxTurnsTotal` で残り回数を計算。
    - 残りが 0 以下なら、Dify を呼ばずに「制限を超えました。アカウントのプランをご覧ください。」と応答。
    - セッション内の AI回答数もカウントし、1セッションあたりの 15 / 30 往復制限も将来的にかけられるようにする（今回は最低限の総数チェックを優先）。
- **表示場所**
  - アカウント設定のプラン画面に:
    - 現在のプラン名
    - 今月の課題数（セッション数）
    - 今月のAI相談回数（`monthly_chat_count`）
    - 残りの AI相談可能回数（`maxTurnsTotal - monthly_chat_count`）
  - 相談画面では制限到達時のみメッセージ表示。
- **UI 要件**
  - `SettingsContent` のタブリストを sticky にして、スクロールしてもタブが上部に固定されるようにする。

## スコープ外
- 月初の自動リセット（`monthly_chat_count` のリセット・セッション集計の区切り）は別タスクとする。
- Stripe 等の決済連携や、実決済金額との完全同期。
- Enterprise プランの細かいカスタム要件（今回は「制限なし」のみ実装）。

## ファイル影響範囲
- **新規作成（レベル3）**
  - `lib/plan-config.ts`（仮）: プランごとの上限値・表示名を集中管理するモジュール。
- **変更対象**
  - レベル2: 
    - `app/api/consulting/sessions/route.ts`（新規セッション作成時の上限チェック）
    - `app/api/consulting/sessions/[id]/messages/route.ts`（メッセージ送信時の上限チェックと制限時の応答）
  - レベル3:
    - `components/SettingsContent.tsx`（プラン・利用状況表示の強化 + タブバーの sticky 化）
- **参照のみ**
  - `supabase/schema.sql`（既存の `plan_type`, `monthly_chat_count` 定義の確認）
  - 既存のドキュメント（plan_and_usage 関連）

