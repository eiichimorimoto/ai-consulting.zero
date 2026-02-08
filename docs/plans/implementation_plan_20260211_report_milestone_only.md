# 📝 Implementation Plan: レポートを節目のみに一本化

## 前提・方針（ユーザー合意）

- **廃止**: チャット途中の「これをレポートに」→ 復唱 → 確認 → レポート作成。議論まとめレポートも廃止。
- **廃止**: エクスポートダイアログでの「AI回答」選択。AI回答のエクスポートは行わない。
- **追加**: 左メニューで**各ステップごと**にレポートを作成する。
- **変更**: 各ステップは**勝手に終了しない**。**終了の意思表示**があるまで続ける。終了した時点でそのステップの**コンセンサス用レポート**を作成（当該ステップの会話全てを整理・要約、保存に耐える綺麗なレイアウト）。
- **開発ルール**: バックアップ・Git してから着手。ステップバイステップで進め、一気にやらない。ルールに従い慎重に実施し、**必ずファクトチェック**してから実装する。

---

## Phase 0: バックアップ・Git（必須・最初に実施）

### Task 0.1 作業前のコミット

**目的**: 現状を確実に保存し、ロールバック可能にする。

**手順**（ユーザー実施推奨）:

```bash
git status
git add -A
git commit -m "chore: レポート節目一本化・ステップ終了意思表示の実装前バックアップ"
git log -1 --oneline
```

**完了条件**: 上記コミットが存在し、`git status` がクリーンであること。

**ファクトチェック**: `git log -1` でコミットハッシュを控え、必要時に `git checkout <hash>` で戻れることを確認。

---

## Phase 1: レポート依頼・復唱・確認フローの削除

**目的**: API から「これをレポートに」系の処理を削除する。1ファイルずつ実施し、都度動作確認する。

### Task 1.1 messages API からレポート依頼・復唱・確認を削除

**ファイル**: `app/api/consulting/sessions/[id]/messages/route.ts`

**変更内容**:

- `report-request.ts` の import から、復唱・確認・pending・議論まとめ・USER_TOPIC 用の関数を削除（または import 自体を削除）。
- `isReportRequest` / `isConfirmation` に基づく `useReportEcho` / `useDiscussionSummaryEcho` の判定と、それに伴う分岐（復唱返答、pending 保存、`treatAsReportConfirm`、レポート生成用 messageToSend、`buildReportCreatedReply` による2件保存）を**すべて削除**。
- POST の流れを「ユーザーメッセージ保存 → Dify 呼び出し（通常の message のみ）→ AI メッセージ1件保存 → current_round 更新」に簡略化。  
  - **注意**: Phase 2 で `current_round` の更新ルールを変えるため、ここでは「current_round をメッセージ数から算出する既存ロジック」を**残す**（Phase 2 で変更）。

**影響**: レポート依頼を送っても復唱が出ず、通常の Dify 応答になる。エクスポートの「レポートを作成しました」2件組は出なくなる。

**ファクトチェック**:

- `route.ts` 内に `isReportRequest` / `pending_report_query` / `treatAsReportConfirm` / `buildEchoReply` / `buildReportCreatedReply` / `isPendingDiscussionSummary` / `isPendingUserTopic` の参照が残っていないこと。
- `grep -n "report-request" route.ts` で不要な import が消えていること（必要なら report-request は別用途で残す）。

### Task 1.2 ChatArea の「レポートを作成しました」特別表示の削除（任意）

**ファイル**: `components/consulting/ChatArea.tsx`

**変更内容**: 「〇〇のレポートを作成しました。」のラベル＋本文の特別表示（`/^「.+」のレポートを作成しました。\.?$/` の分岐）を削除し、通常の AI メッセージとして表示する。

**ファクトチェック**: 該当正規表現と FileCheck 表示がコードに残っていないこと。

---

## Phase 2: ステップを「終了の意思表示」まで続ける

**目的**: ステップをメッセージ数で自動進行させず、ユーザーが「このステップを終了」するまで同じステップに留める。

### Task 2.1 メッセージ保存時に current_round を更新しない

**ファイル**: `app/api/consulting/sessions/[id]/messages/route.ts`

**変更内容**:

- 「4. セッションの current_round を更新」で、`newRound = Math.floor((nextMessageOrder + 1) / 2)` で更新している部分を**削除**する（POST では `current_round` を更新しない）。
- レスポンスの `current_round` は、**DB から読み直したセッションの現在値**をそのまま返す（既に取得している `session` の `current_round` を返す）。

**影響**: メッセージを送ってもステップが自動で進まなくなる。

**ファクトチェック**: POST 後に `consulting_sessions` の `current_round` が変わっていないこと（DB または API レスポンスで確認）。

### Task 2.2 「このステップを終了」API の追加

**ファイル**: 新規 `app/api/consulting/sessions/[id]/complete-step/route.ts`（または既存 PATCH session に統合）

**仕様**:

- メソッド: POST または PATCH。
- 認証: セッションの所有者のみ。
- 処理: セッションの `current_round` を 1 増やす（上限は `max_rounds`、例: 5）。既に `current_round >= max_rounds` の場合は 400 を返す。
- レスポンス: 更新後の `current_round` とセッション情報。  
  - ここでは**レポート生成は呼ばない**（Phase 4 でレポート生成を組み込む）。

**ファクトチェック**: 左メニューから「このステップを終了」を押したときだけ `current_round` が増えること（Phase 3 で UI を付けた後に確認可）。

### Task 2.3 左メニューに「このステップを終了」ボタンを追加

**ファイル**: `app/consulting/start/page.tsx`（および必要なら `useConsultingSession.ts`）

**変更内容**:

- 現在のステップ（active）のカードまたはその近くに「このステップを終了」ボタンを配置。
- クリックで Task 2.2 の API を呼び、成功時に `current_round` を反映して UI を更新（次のステップが active になる）。

**ファクトチェック**: ボタン表示・クリックで API が呼ばれ、ステップが 1 つ進むこと。他ステップは変わらないこと。

---

## Phase 3: メッセージにステップを紐づける

**目的**: どのメッセージがどのステップの会話か判別できるようにする。

### Task 3.1 consulting_messages に step_round を追加

**ファイル**: マイグレーション（Supabase 用 SQL）と `types/database.types.ts`

**変更内容**:

- `consulting_messages` に `step_round INTEGER NOT NULL DEFAULT 1` を追加（1〜5 を想定、既存行は 1）。
- 型定義を更新。

**ファクトチェック**: マイグレーション実行後、`consulting_messages` に `step_round` が存在し、既存レコードが 1 になっていること。

### Task 3.2 メッセージ保存時に step_round をセットする

**ファイル**: `app/api/consulting/sessions/[id]/messages/route.ts`

**変更内容**:

- ユーザーメッセージ・AI メッセージの insert 時に、セッションの現在の `current_round` に基づき `step_round` を設定する。  
  - 例: `step_round = Math.min(session.current_round + 1, session.max_rounds)` または `session.current_round` を 1 始まりに揃えた値（仕様に合わせて決定）。

**ファクトチェック**: 新規メッセージに `step_round` が入り、現在のステップと一致していること。

---

## Phase 4: ステップ終了時にコンセンサスレポートを作成

**目的**: ステップ終了時、そのステップの会話全てを使って整理・要約したレポートを生成し、保存に耐える体裁で保存する。

### Task 4.1 ステップ終了 API でレポート生成を呼ぶ

**ファイル**: `app/api/consulting/sessions/[id]/complete-step/route.ts`（または同等）

**変更内容**:

- ステップ終了時（`current_round` をインクリメントする前の値 = 終了したステップ）に対し、`consulting_messages` から `step_round = 終了したステップ` のメッセージを取得。
- 会話テキストを組み立て（既存の `formatCollectedConversation` や `getAllSessionMessages` の流れを利用可能）、Dify または静的テンプレートで「整理・要約・レポート形式」の本文を生成。
- 生成したレポートを `reports` テーブル（または step_reports 用テーブル）に保存。タイトル例: 「STEP N 〇〇（課題のヒアリング等）コンセンサスレポート」。レイアウトは既存の report フォーマット（HTML/MD）に合わせ、綺麗に保存できる形式にする。

**ファクトチェック**: ステップ終了後に DB にレポートが 1 件入り、内容が当該ステップの会話要約になっていること。

### Task 4.2 レポート一覧取得 API（セッション・ステップ単位）

**目的**: 左メニュー・エクスポートダイアログで「このセッションのステップ別レポート一覧」を表示するため。

- 例: `GET /api/consulting/sessions/[id]/reports` で、そのセッションに紐づくステップレポート一覧を返す。
- レスポンスに step_round（または step タイトル）と report id、作成日時を含める。

**ファクトチェック**: セッション ID を指定して呼ぶと、作成済みステップレポートだけが返ること。

---

## Phase 5: エクスポートダイアログから AI 回答を削除し、ステップレポートのみにする

**目的**: 「レポートをエクスポート」では AI 回答を選ばせず、ステップ終了で作成したレポートのみを対象にする。

### Task 5.1 ExportDialog の仕様変更

**ファイル**: `components/consulting/ExportDialog.tsx`

**変更内容**:

- 「AI回答」セクション（`getDifyContentItems` / `difyItems` / `selectedDifyIds`）を**削除**。
- 「チャット」セクションも削除する（または「ステップレポート」に置き換える）。
- 代わりに、**当該セッションのステップレポート一覧**（Task 4.2 の API で取得）を表示する。各レポートをチェックで選択し、PDF/PPT/MD のいずれかでエクスポートする。

**Props**: `messages` に加え、`sessionId` を渡し、`GET .../sessions/[id]/reports` でレポート一覧を取得する。

**ファクトチェック**: ダイアログに AI 回答の選択肢がなく、ステップレポートのみ表示・選択・エクスポートできること。

### Task 5.2 start/page の「レポートをエクスポート」まわり

**ファイル**: `app/consulting/start/page.tsx`

**変更内容**:

- 「レポートをエクスポート」ボタンのバッジは、**ステップレポート件数**（または「作成済みレポート N 件」）に変更。`getDifyContentItems(...).length` は使わない。
- ExportDialog に `sessionId` を渡す。

**ファクトチェック**: ボタン・バッジがステップレポート数に連動していること。

---

## Phase 6: 左メニューでステップごとにレポートを表示（任意・仕上げ）

**目的**: 左メニューの各ステップに「このステップのレポート」がある場合、そのプレビューやリンクを表示する。

- 例: ステップ 1 が「完了」かつレポートが存在する場合、そのステップの下に「STEP 1 レポートを表示」などのリンクまたはプレビューを出す。
- 実装は Phase 5 の API と ExportDialog のデータを流用。

**ファクトチェック**: 完了したステップにのみレポート表示が出ること。

---

## 実装順序サマリ（ステップバイステップ）

| 順 | Phase | 内容 | 備考 |
|----|--------|------|------|
| 0 | Phase 0 | バックアップ・Git コミット | 必須・最初 |
| 1 | Phase 1 | レポート依頼・復唱・確認の削除（API → ChatArea） | 1ファイルずつ |
| 2 | Phase 2 | ステップ自動進行の停止、終了 API・UI | current_round を POST で更新しない |
| 3 | Phase 3 | step_round カラム追加・保存時セット | マイグレーション → API |
| 4 | Phase 4 | ステップ終了時のレポート生成・保存、一覧 API | Dify/テンプレート・DB |
| 5 | Phase 5 | ExportDialog をステップレポートのみに変更 | AI 回答削除 |
| 6 | Phase 6 | 左メニューでステップ別レポート表示（任意） | 仕上げ |

---

## ファクトチェック一覧（実施必須）

- [ ] Phase 0: コミットが存在し、`git status` がクリーン。
- [ ] Phase 1: API にレポート依頼・復唱・確認・pending の参照が残っていない。ChatArea の「レポートを作成しました」特別表示が削除されている。
- [ ] Phase 2: メッセージ送信で current_round が増えない。「このステップを終了」でだけ増える。
- [ ] Phase 3: 新規メッセージに step_round が入り、現在ステップと一致する。
- [ ] Phase 4: ステップ終了で 1 件レポートが作成され、当該ステップの会話要約になっている。
- [ ] Phase 5: エクスポートダイアログに AI 回答がなく、ステップレポートのみ選択・エクスポートできる。
- [ ] Phase 6（実施時）: 左メニューで完了ステップにレポート表示が出る。

---

## 変更履歴

- 2026-02-11: 初版（節目一本化・ステップ終了意思表示・エクスポートから AI 回答削除・全 STEP でレポート）
