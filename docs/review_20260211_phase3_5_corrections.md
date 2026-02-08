# 修正箇所レビュー: Phase 3〜5 実装（2026-02-11）

## 対象範囲

- Phase 3: メッセージに step_round 紐づけ
- Phase 4: ステップ終了時レポート生成・一覧 API
- Phase 5: ExportDialog をステップレポートのみに変更
- バグ修正: currentRound 重複定義
- その他: マイグレーション・確認用 SQL

---

## 1. 新規作成ファイル

### 1.1 `supabase/20260211_add_step_round_to_consulting_messages.sql`

| 観点 | 評価 | 備考 |
|------|------|------|
| 設計整合 | ✅ | 設計どおり `step_round INTEGER NOT NULL DEFAULT 1`。既存行は DEFAULT で 1。 |
| インデックス | ✅ | `(session_id, step_round)` で STEP 単位取得に有効。 |
| ロールバック | ✅ | コメントで `DROP COLUMN` を記載。 |
| 注意 | - | 範囲チェックはアプリ側に委ねており、DB 制約は付けていない（将来拡張を考慮）。 |

### 1.2 `supabase/20260211_create_consulting_step_reports.sql`

| 観点 | 評価 | 備考 |
|------|------|------|
| 設計整合 | ✅ | 1 セッション・1 ステップ 1 件の UNIQUE(session_id, step_round)。 |
| RLS | ✅ | SELECT / INSERT / UPDATE の 3 ポリシー。セッション所有者のみ。 |
| CASCADE | ✅ | session_id は `ON DELETE CASCADE` でセッション削除時にレポートも削除。 |
| CHECK | ✅ | step_round は 1〜5。 |

### 1.3 `app/api/consulting/sessions/[id]/reports/route.ts`

| 観点 | 評価 | 備考 |
|------|------|------|
| 認証 | ✅ | `getUser()` 後、`consulting_sessions` で user_id 一致を確認。他セッションのレポートは取得不可。 |
| 認可 | ✅ | RLS と組み合わせて二重に保護。 |
| レスポンス | ✅ | content, content_markdown を含む（ExportDialog のプレビュー・エクスポート用）。 |
| 並び順 | ✅ | step_round 昇順で返却。 |

### 1.4 `supabase/20260211_verify_migrations.sql`

| 観点 | 評価 | 備考 |
|------|------|------|
| 単一クエリ | ✅ | UNION ALL で 1 文にまとめ、Explain や一括実行でエラーにならない。 |
| 網羅性 | ✅ | step_round カラム・インデックス・テーブル存在・カラム数・RLS・ポリシー数の 6 項目。 |

---

## 2. 変更ファイル（API・ロジック）

### 2.1 `app/api/consulting/sessions/[id]/messages/route.ts`

**変更内容**

- 269〜272 行目: `currentRound`, `maxRounds`, `stepRound` を算出（1 箇所で定義）。
- ユーザーメッセージ insert（291〜297）に `step_round: stepRound` を追加。
- AI メッセージ insert（365〜372）に `step_round: stepRound` を追加。
- 409 行目: 重複していた `const currentRound` を削除し、上で定義した `currentRound` を再利用。

**レビュー**

| 観点 | 評価 | 備考 |
|------|------|------|
| 設計整合 | ✅ | step_round = current_round + 1（1 始まり）、上限 max_rounds。 |
| 重複定義解消 | ✅ | currentRound は 270 行目で 1 回だけ定義し、以降は再利用。 |
| 初回重複スキップ時 | ✅ | ユーザー側は既存 `firstMessage` をそのまま使用（再 insert しない）。AI メッセージのみ新規 insert で step_round 付与。既存メッセージは select('*') で取得済みで step_round を持つ。 |
| セッション更新 | ✅ | POST では current_round を更新せず、updated_at と conversation_id のみ（設計どおり）。 |

**注意**

- `session.current_round` は「今いる STEP」の 0-based 表現。step_round は 1-based で、`Math.min(currentRound + 1, maxRounds)` で正しく 1〜5 に収まる。

### 2.2 `app/api/consulting/sessions/[id]/complete-step/route.ts`

**変更内容**

- 終了する step_round（= currentRound + 1）のメッセージを `getMessagesByStepRound` で取得。
- `formatCollectedConversation` で本文テキスト化し、`contentPlain` / `contentMarkdown` を生成。
- `consulting_step_reports` に upsert（onConflict: 'session_id,step_round'）。
- その後 `current_round` を +1 してセッション更新。

**レビュー**

| 観点 | 評価 | 備考 |
|------|------|------|
| 順序 | ✅ | レポート保存 → その後 current_round 更新。終了「した」ステップのメッセージでレポートを作るため正しい。 |
| タイトル | ✅ | STEP_TITLES と completedStepRound で「STEP N 〇〇 コンセンサスレポート」を生成。 |
| 会話なし | ✅ | conversationText が空のとき「（会話なし）」を代入。 |
| 認可 | ✅ | セッション取得時に .eq('user_id', user.id) で所有者のみ。 |
| upsert onConflict | ⚠️ | 文字列 `'session_id,step_round'` で指定。Supabase のバージョンによっては配列 `['session_id','step_round']` が必要な場合あり。エラーが出たら配列に変更すること。 |

**推奨（任意）**

- レポート保存失敗時に `current_round` を更新しない現状でよい。レポート失敗時は 500 を返し、クライアントでリトライ or 表示する想定。

---

## 3. 変更ファイル（lib・型）

### 3.1 `types/database.types.ts`

**変更内容**

- `consulting_messages`: Row / Insert / Update に `step_round: number`（Insert/Update は省略可）を追加。
- `consulting_step_reports`: 新規テーブルとして Row / Insert / Update を追加。

**レビュー**

| 観点 | 評価 | 備考 |
|------|------|------|
| 整合性 | ✅ | マイグレーションのカラムと一致。 |
| Insert | ✅ | step_round は API で必ず渡すため optional で問題なし。 |

### 3.2 `lib/consulting/conversation-collector.ts`

**変更内容**

- `getMessagesByStepRound(supabase, sessionId, stepRound)` を追加。`consulting_messages` を session_id と step_round でフィルタし、message_order 昇順で返す。

**レビュー**

| 観点 | 評価 | 備考 |
|------|------|------|
| 既存への影響 | ✅ | getAllSessionMessages 等は変更なし。select に step_round を追加していないが、CollectedMessage は role, content, created_at, message_order のみ使用。getMessagesByStepRound の返却も同型で十分。 |
| エラーハンドリング | ✅ | エラー時は throw。呼び出し元の complete-step が try/catch で 500 を返す。 |

### 3.3 `lib/consulting/constants.ts`

**変更内容**

- `STEP_TITLES: readonly [string, string, string, string, string]` を 5 要素で追加。start/page の steps の title と一致。

**レビュー**

| 観点 | 評価 | 備考 |
|------|------|------|
| 整合性 | ✅ | 「課題のヒアリング」「現状分析」「解決策の提案」「実行計画の策定」「レポート作成」は start/page と同一。 |
| 型 | ✅ | タプル型で長さ 5 を保証。STEP_TITLES[completedStepRound - 1] のアクセスは 0〜4 で安全。 |

---

## 4. 変更ファイル（UI）

### 4.1 `components/consulting/ExportDialog.tsx`

**変更内容**

- Props を `sessionId` 必須に変更。`messages` を削除。
- 開時に `GET /api/consulting/sessions/${sessionId}/reports` でステップレポート一覧を取得。
- AI 回答・会話セクションを削除し、ステップレポート一覧の選択 UI に変更。
- 選択レポートから `ReportSection[]` を組み立て、既存の PDF/PPT/MD ダウンロード処理を利用。
- `buildReportMarkdown([], sections, exportMetadata)` で Markdown は「付録のみ」として生成。

**レビュー**

| 観点 | 評価 | 備考 |
|------|------|------|
| クリーンアップ | ✅ | getDifyContentItems, getAvailableSections, selectedSections 等の未使用 state を削除。 |
| 取得タイミング | ✅ | useEffect で sessionId に依存して 1 回取得。cancelled で unmount 時の setState を防止。 |
| デフォルト選択 | ✅ | レポートが 1 件以上あるとき全件選択。 |
| buildSectionsForExport | ✅ | step_round 昇順で並べ、content は content_markdown ?? content。ReportSection の type は 'text'。 |
| ローディング | ✅ | loading 中は Loader2 表示。レポート 0 件時は案内文を表示。 |

**注意**

- `(reports as StepReportItem[])` のキャストは、API の戻り型がそのまま StepReportItem 相当である前提。型安全にするなら API の戻り値を zod 等で検証する拡張が望ましい（任意）。

### 4.2 `app/consulting/start/page.tsx`

**変更内容**

- `getDifyContentItems` の import を削除。
- 「レポートをエクスポート」ボタン: `disabled={!session.currentSession}` に変更（messages 長は見ない）。
- バッジ（AI 件数表示）を削除。
- ExportDialog に `sessionId={session.currentSession.id}` を渡し、`messages` を削除。`session.currentSession.id !== 'new-session'` のときのみダイアログを表示。

**レビュー**

| 観点 | 評価 | 備考 |
|------|------|------|
| 新規セッション | ✅ | id が 'new-session' のときは ExportDialog を開かない。レポート API は実セッション ID が必要なため妥当。 |
| ボタン無効 | ✅ | セッションがないときだけ無効。レポート 0 件でもダイアログは開き、案内文で対応。 |

---

## 5. ドキュメント・その他

### 5.1 `docs/plans/implementation_plan_20260211_report_milestone_only.md`

- 「実行が必要なマイグレーション（詳細）」セクションを追加。2 本の SQL の目的・内容・ロールバック・実行方法・実行後確認を記載。
- 変更履歴に Phase 3〜5 実施とマイグレーション 2 本のファイル名を追記。

### 5.2 `design_20260211_step_back_and_conversation_per_step.md`

- 本実装では未変更。§7（戻っても他 STEP は維持）、§8（データ量）は以前の会話で追加済み。

---

## 6. 総合チェックリスト

| 項目 | 状態 |
|------|------|
| 設計（step_round = current_round + 1、他 STEP 維持）との整合 | ✅ |
| 認証・認可（セッション所有者のみ） | ✅ |
| RLS と API の二重チェック | ✅ |
| 重複定義の解消（currentRound） | ✅ |
| 既存フロー（初回重複スキップ、メッセージ返却）への影響 | ✅ なし |
| エラーハンドリング（try/catch、適切な status） | ✅ |
| 型定義とマイグレーションの一致 | ✅ |
| ExportDialog の sessionId 必須と new-session 除外 | ✅ |
| Supabase upsert onConflict の互換性 | ⚠️ 要確認（問題時は配列指定） |

---

## 7. 今後の改善案（任意）

1. **GET messages の step_round フィルタ**  
   設計 §3.3 の「その STEP の会話だけ表示」を行う場合は、GET に `step_round` クエリを追加し、返却メッセージをその STEP に絞る。

2. **ステップを戻る API**  
   設計 §3.2 の「set-step」API（current_round を指定して更新）を実装し、フロントの「戻る」確定時に呼ぶ。

3. **レポート一覧の型**  
   GET reports のレスポンスを zod 等で検証し、ExportDialog 側のキャストをやめる。

4. **complete-step の onConflict**  
   Supabase で `onConflict: 'session_id,step_round'` がエラーになる場合は、`onConflict: ['session_id','step_round']` に変更。
