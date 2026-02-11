# Difyチャット「一時的な問題が発生しております」調査メモ

**目的**: 既存相談でフォールバックメッセージが出る原因の切り分け用。

---

## 1. 呼び出しの流れ

```
[フロント] メッセージ送信
  → POST /api/consulting/sessions/:id/messages
      body: { message, conversationId, categoryInfo }
  → [messages/route.ts] セッション取得・stepRound 算出
  → POST (内部) /api/dify/chat
      body: { sessionId, message, userId, conversationId, categoryInfo, stepRound, stepTitle, stepGoal }
  → [dify/chat/route.ts] プロフィール・会社情報取得 → Dify Chatflow API
  → 例外時: generateFallbackResponse() で「一時的な問題が発生しております」を返す
```

- **既存相談**でも同じ `POST /api/dify/chat` が使われ、`conversationId` が付与されて送られている。

---

## 2. Dify に送っている内容（コード準拠）

**送信元**: `app/api/dify/chat/route.ts` の `requestBody`

| 項目 | 内容 |
|------|------|
| **inputs** | 以下すべて文字列（空の場合は `''`） |
| | `company_name`, `industry`, `capital`, `employee_count`, `website`, `business_description` |
| | `postal_code`, `prefecture`, `city`, `address` |
| | `user_name`, `user_position`, `user_department` |
| | `selected_category`, `selected_subcategory` |
| | `consulting_step_number` (数値→文字列), `consulting_step_title`, `consulting_step_goal` |
| **query** | ユーザーの発言（`message`） |
| **user** | `userId`（Supabase auth の user id） |
| **conversation_id** | 既存相談の場合は前回レスポンスの `conversation_id` |
| **response_mode** | `'blocking'` |

- Dify の「ユーザー入力」ノードの変数名は、上記 **inputs のキーと完全一致**させる必要あり（`capital` も含む）。

---

## 3. フォールバックが出る条件

`/api/dify/chat` の **try ブロック内で例外**が発生したとき。

- プロフィール・会社情報取得の失敗（Supabase エラー）
- **Dify API の fetch 失敗**（ネットワーク、タイムアウト）
- **Dify が 4xx/5xx を返したとき**（`!difyResponse.ok` で throw）
- `difyResponse.json()` のパース失敗

---

## 4. 確認すべきログ（サーバー側）

フォールバックが出たタイミングで、以下を確認する。

1. **`Dify API call error:`**  
   - 直後の **エラー名・メッセージ**（例: `Dify API error: 404 ...`, `fetch failed`, `timeout`）
2. **`Dify API call stack:`**  
   - どの処理で例外になったか
3. **`Dify Chatflow API Error:`**（`!difyResponse.ok` のとき）  
   - `status`, `statusText`, `body`（Dify が返した本文）

---

## 5. 既存相談で疑うポイント

| 状況 | 確認すること |
|------|----------------|
| conversation_id が無効・期限切れ | Dify が 404 等を返す。ログの `body` を確認 |
| Dify の URL / API キー誤り | 401, 403, 接続エラー。環境変数 `DIFY_CHATFLOW_URL`, `DIFY_CHATFLOW_API_KEY` を確認 |
| ワークフロー入力の必須不足 | Dify が 400 等でエラー本文を返す。inputs のキーが Dify の「ユーザー入力」と一致しているか確認 |
| タイムアウト | ブロッキングで Dify の応答が遅いと fetch がタイムアウト。Dify 側の実行時間・負荷を確認 |

---

## 6. 参照ファイル

- Dify リクエスト組み立て: `app/api/dify/chat/route.ts`（196–257 行付近）
- フォールバック生成: 同ファイル `generateFallbackResponse`
- 呼び出し元（既存相談）: `app/api/consulting/sessions/[id]/messages/route.ts`（354–370 行付近）
