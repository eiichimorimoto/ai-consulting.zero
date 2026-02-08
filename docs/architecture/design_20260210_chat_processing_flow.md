# チャット処理フロー（詳細）

**日付**: 2026-02-10  
**目的**: コンサルティングチャットの「メッセージ取得」と「メッセージ送信」の処理を整理し、判定分岐・レポート依頼フロー・Dify呼び出し条件を明確にする。

---

## 1. 全体像

```
[UI] MessageInput / クイック返答 / カテゴリボタン
        │
        ▼
  useMessageHandlers.handleSendMessage
        │
        ▼
  POST /api/consulting/sessions/[id]/messages
        │
        ├─ ユーザーメッセージ保存
        ├─ メッセージ種別判定（通常 / レポート依頼 / 確認 / 議論まとめ）
        ├─ 復唱 or Dify呼び出し
        └─ AIメッセージ保存（1件 or レポート時2件）
        │
        ▼
  レスポンス { messages, conversation_id } → 画面をサーバー応答で上書き
```

- **メッセージ一覧の取得**: 画面表示・既存セッション選択時に `GET /api/consulting/sessions/[id]/messages` を呼び、返却された `messages` でチャット履歴を表示する。
- **メッセージ送信**: 送信のたびに `POST /api/consulting/sessions/[id]/messages` を呼び、返却された `messages` でチャットを更新する（楽観的更新のロールバックあり）。

---

## 2. GET /api/consulting/sessions/[id]/messages

### 2.1 処理の流れ

| 順番 | 処理 | 説明 |
|-----|------|------|
| 1 | 認証 | `supabase.auth.getUser()`。失敗時 401。 |
| 2 | セッション取得 | `consulting_sessions` を `id` + `user_id` で取得。404 はセッションなし。 |
| 3 | 件数取得 | `consulting_messages` の `count`。 |
| 4 | メッセージ取得 | `consulting_messages` を `created_at` 降順で `range(offset, offset+limit-1)`。 |
| 5 | 表示用に昇順に並び替え | `reversedMessages`。 |
| 6 | 初回メッセージの付与（offset=0 のみ） | 先頭に「どのような課題をお抱えですか？…」の静的 assistant メッセージを 1 件追加。 |
| 7 | マッピング & インタラクティブ復元 | 各メッセージを `{ id, type, content, timestamp, interactive? }` に変換。カテゴリ／サブカテゴリボタンの復元。 |
| 8 | レスポンス | `{ messages, total, hasMore, offset, limit }`。 |

### 2.2 インタラクティブ要素の復元条件

| 種類 | 条件 | 設定される `interactive` |
|------|------|---------------------------|
| カテゴリボタン | `role === 'assistant'` かつ 本文に「どのような課題をお抱えですか」を含む | `{ type: 'category-buttons', data: CONSULTING_CATEGORIES }` |
| サブカテゴリボタン | `role === 'assistant'` かつ 本文に「さらに詳しくお聞かせください」**かつ**「どのような課題でしょうか」を含む かつ `analysis_type` または本文の「「〇〇」について」からカテゴリが取れる | `{ type: 'subcategory-buttons', data: SUBCATEGORY_MAP[cat], selectedCategory }` |

※ サブカテゴリは「カテゴリ選択直後の 1 通」のみ復元。通常の Dify 回答の下には付けない。

---

## 3. POST /api/consulting/sessions/[id]/messages（送信フロー）

### 3.1 リクエスト・前提

- **Body**: `{ message, conversationId?, skipDify?, aiResponse?, categoryInfo? }`
- **前提**: 認証済み・セッション取得済み・セッションが `completed` / `cancelled` でないこと。

### 3.2 処理ステップ一覧

| 段階 | 処理 | 出力・副作用 |
|------|------|--------------|
| A | ユーザーメッセージ保存 | 重複時はスキップ。通常は `consulting_messages` に 1 件 insert。`nextMessageOrder` 確定。 |
| B | セッションから `pending_report_query` 取得 | `pendingQuery`（レポート依頼で「はい」待ちのときだけ値あり） |
| C | メッセージ種別判定 | `isConfirm`, `isReportReq`, `isDiscussionSummaryReq`, `useDiscussionSummaryEcho`, `useReportEcho`, `useEchoReply` |
| D | レポート対象の解決（useReportEcho 時） | `reportTargetRef`, `matchedByRef`, `reportTargetContent`, `safeContent` |
| E | 復唱時の pending 復旧（isConfirm かつ pending なし） | `recoveredReportTarget` → `effectivePending` に反映 |
| F | 復唱のときの pending 保存 | `pending_report_query` を `pendingValue` で更新 |
| G | Dify 呼び出し or 復唱文で AI 応答決定 | `aiResponseContent`（復唱時は Dify を呼ばない） |
| H | レポート確認後は pending クリア | `treatAsReportConfirm` かつ `pendingQuery` ありなら `pending_report_query = null` |
| I | AI メッセージ保存 | 1 件 または レポート時は「〇〇のレポートを作成しました。」+ 本文の 2 件 |
| J | current_round 更新・レスポンス組み立て | `conversation_id`, `messages` など返却 |

---

## 4. メッセージ種別判定（C の詳細）

### 4.1 判定に使う関数（`lib/consulting/report-request.ts`）

| 判定 | 関数 | 意味 |
|------|------|------|
| レポート・資料の依頼 | `isReportRequest(message)` | 「レポート作成して」「〇〇についてレポートに」等のパターンにマッチ |
| 確認（はい・お願いします） | `isConfirmation(message)` | 短い肯定返答。50 文字超は false。 |
| 議論まとめレポート依頼 | `isDiscussionSummaryReportRequest(message)` | 「〇〇の議論をまとめてレポートに」等 |

### 4.2 フラグの決定

```
pendingQuery = session.pending_report_query   // DB に保存されていた保留クエリ

useDiscussionSummaryEcho = !pendingQuery && isDiscussionSummaryReq
useReportEcho             = !pendingQuery && isReportReq && !useDiscussionSummaryEcho
useEchoReply              = useDiscussionSummaryEcho || useReportEcho
```

- **useEchoReply === true**: この送信では Dify を呼ばず、復唱文だけ返す。
- **treatAsReportConfirm**: 「はい」等の確認であり、かつレポート対象（`effectivePending`）が存在する。

---

## 5. レポート対象の解決（D の詳細・通常レポート依頼時）

`useReportEcho === true` のときのみ実行。

### 5.1 参照の抽出

```
reportTargetRef = extractReportTargetReference(message)
```

- 「〇〇について、これをレポートに」→ **〇〇** を返す（例: 「長期的視点での投資判断」）。
- 「これ」「この内容」のみの短い依頼 → `null`（直前の AI 回答を対象とする）。
- 「〇〇の内容をレポートに」「先ほどの〇〇を」「〇〇についてのレポート」等 → 〇〇 を返す。

### 5.2 該当 AI メッセージの検索

```
matchedByRef = findAssistantMessageByReference(assistantMessages, reportTargetRef)
```

- 復唱メッセージ・「レポートを作成しました」メッセージは**対象外**。
- まず「見出し（先頭行）に参照が含まれる」メッセージを直近から検索。
- なければ「本文に参照が含まれる」直近 1 件を返す。

### 5.3 レポート対象本文と pending に保存する値

```
reportTargetContent = matchedByRef ? matchedByRef.content : latestAiContent

safeContent = reportTargetContent かつ
              !isEchoReplyContent(reportTargetContent) かつ
              !isReportCreatedContent(reportTargetContent)
              ? reportTargetContent : null

pendingValue = useDiscussionSummaryEcho ? (PREFIX + message)
             : (useReportEcho && safeContent ? safeContent : message)
```

- 復唱や「レポートを作成しました」が `reportTargetContent` に入った場合は `safeContent = null` とし、pending にはユーザー発言（`message`）を入れる。

---

## 6. 復唱時の pending 復旧（E の詳細）

- **条件**: `isConfirm === true` かつ `pendingQuery === null` かつ メッセージが 2 件以上。
- **処理**: 直直前の AI メッセージが復唱（`isEchoReplyContent`）なら、その 1 つ前の AI メッセージ本文を `recoveredReportTarget` とする。
- **効果**: `effectivePending = pendingQuery || recoveredReportTarget` で、pending がなくても「はい」でレポート確認として扱える。

---

## 7. Dify 呼び出しの分岐（G の詳細）

### 7.1 分岐図

```
skipDify && aiResponse あり
    → aiResponseContent = aiResponse（Dify を呼ばない）

useEchoReply
    → 復唱文のみ生成（Dify を呼ばない）
    → 通常レポート: buildEchoReply(message, reportTargetContent, reportTargetRef)
    → 議論まとめ:  buildDiscussionSummaryEchoReply(message)

上記以外
    → messageToSend を決めて Dify を呼ぶ
```

### 7.2 messageToSend の決め方

| 条件 | messageToSend |
|------|----------------|
| ユーザー指定トピックのみ（`treatAsReportConfirm` かつ `isPendingUserTopic(effectivePending)`） | 会話履歴を `getAllSessionMessages` で取得し、「以下は相談のやり取りです。ユーザーは【〇〇】についてのレポートを求めています。会話からその話題に関する部分を抽出し、レポート形式でまとめてください。」+ 改行 + 会話テキスト。該当メッセージが見つからなかった場合の遡及用。 |
| 通常レポート確認（`treatAsReportConfirm` かつ 議論まとめでない かつ 上記でない かつ `effectivePending` あり） | 「以下をレポート形式（見出し・箇条書き・必要なら表）で整えてください。」+ 改行 + `effectivePending` |
| 議論まとめ確認（`isDiscussionSummaryConfirm` かつ `pendingQuery` あり） | テーマに沿って会話を収集し、「以下は、ある相談セッションの会話です。【〇〇】に関する部分を…」形式。該当なしなら「該当する議論が見つかりませんでした。」とし Dify は呼ばない。 |
| 上記以外 | `message`（ユーザーの今回の送信） |

- レポート確認時は会話履歴は渡さず、`messageToSend` だけを Dify に送る（`conversationId` も渡さない）。ただし**ユーザー指定トピックのみ**の場合は、`messageToSend` に会話全文を埋め込み「〇〇について会話から抽出してレポートに」と指示する。

### 7.3 レポート確認後のクリア

- `treatAsReportConfirm` かつ `pendingQuery` が存在するとき、Dify 呼び出し後に `pending_report_query = null` で更新。

---

## 8. AI メッセージ保存（I の詳細）

### 8.1 レポート確認応答として保存する条件

```
isReportConfirmResponse =
  treatAsReportConfirm &&
  effectivePending あり &&
  aiResponseContent あり &&
  !useEchoReply
```

### 8.2 保存パターン

| パターン | 保存内容 |
|----------|----------|
| レポート確認応答 | 1 件目: `buildReportCreatedReply(effectivePending)`（「〇〇のレポートを作成しました。」）。2 件目: Dify の応答本文（レポート本文）。 |
| 上記以外 | assistant 1 件。`analysis_type` は `categoryInfo?.selectedCategory` があれば付与。 |

※ `buildReportCreatedReply` は、`effectivePending` が `__USER_TOPIC__:` の場合はトピック行を表題に使い、それ以外は**先頭行**を見出しとして使い、括弧は一重「〇〇」のみになる。

---

## 9. 議論まとめレポートの流れ（要約）

1. ユーザーが「〇〇の議論をまとめてレポートに」等と送信。
2. `useDiscussionSummaryEcho` が true → 復唱（「〇〇に関する議論をまとめてレポートにする、という事ですね。…」）。`pending_report_query = PREFIX + message` で保存。
3. ユーザーが「はい」等で送信。
4. `treatAsReportConfirm` かつ `isPendingDiscussionSummary(pendingQuery)` → テーマで会話を収集し、そのテキストを Dify に送る。Dify 応答をレポート本文として保存。`pending_report_query` を null に更新。

---

## 10. フローチャート（POST 送信時の分岐）

```
                    [ユーザーメッセージ保存]
                                │
                                ▼
                    [pendingQuery 取得]
                                │
                                ▼
              ┌─────────────────┴─────────────────┐
              │ isReportReq / isDiscussionSummaryReq │
              │ isConfirmation                       │
              └─────────────────┬─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
  useEchoReply            isConfirm かつ          それ以外
  (レポート依頼 or         effectivePending
  議論まとめ依頼)          (レポート確認)
        │                       │                       │
        ▼                       ▼                       ▼
  pending 保存             messageToSend =           messageToSend =
  (safeContent or          effectivePending を         message
  message)                 レポート形式で整えて
  復唱文を生成              の指示文とともに
  Dify は呼ばない          Dify 呼び出し
        │                       │                       │
        │                       ▼                       │
        │               pending クリア                 │
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                    [AI 応答を 1 件 or 2 件保存]
                                │
                                ▼
                    [current_round 更新・レスポンス]
```

---

## 11. 関連ファイル

| ファイル | 役割 |
|----------|------|
| `app/api/consulting/sessions/[id]/messages/route.ts` | GET/POST のエントリ。判定・Dify 呼び出し・保存・レスポンス。 |
| `lib/consulting/report-request.ts` | レポート依頼判定・参照抽出・該当メッセージ検索・復唱文・「レポートを作成しました」文・議論まとめ。 |
| `hooks/useMessageHandlers.ts` | 送信処理。POST 呼び出しと `messages` / `conversation_id` の反映。 |
| `hooks/useConsultingSession.ts` | 既存セッション選択時の GET によるメッセージ取得。 |
| `lib/consulting/constants.ts` | `SUBCATEGORY_MAP`。サブカテゴリボタン用。 |

---

## 12. 該当メッセージが無い場合の会話履歴遡及（USER_TOPIC）

- ユーザーが「長期的視点での投資判断について、これをレポートに」と依頼したが、会話中に**見出しに「長期的視点での投資判断」を含む AI メッセージが 1 件もない**場合、`matchedByRef = null` となり、従来は pending にユーザー発言だけが入り、Dify に依頼文のみが渡ってセッション文脈（例: コスト削減）に引っ張られ別トピックのレポートになりやすかった。
- **対応**: 該当 AI 回答がないときは `pending_report_query` に `__USER_TOPIC__:トピック\nユーザー発言` を保存（`wrapPendingUserTopic(reportTargetRef, message)`）。確認（「はい」）時に `isPendingUserTopic(effectivePending)` なら、`getAllSessionMessages` で会話履歴を取得し、「ユーザーは【〇〇】についてのレポートを求めています。会話からその話題に関する部分を抽出し、レポート形式でまとめてください。」という指示と会話テキストを Dify に送る。これで依頼トピックに沿ったレポートが生成される。

---

## 13. 変更履歴

- 2026-02-10: 初版作成（GET/POST フロー、レポート対象解決、復唱・確認・議論まとめ、括弧二重防止のための safeContent / 検索除外を反映）。
- 2026-02-10: 該当メッセージが無い場合の会話履歴遡及（`__USER_TOPIC__`）を追加。`report-request.ts` に wrap/unwrap、route で pending 保存時・確認時の分岐を実装。
