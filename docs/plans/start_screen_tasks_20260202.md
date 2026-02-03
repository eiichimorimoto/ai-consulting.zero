# スタート画面の課題（2026-02-02 予定）

## 1. チャットエリアのロボットマーク文言を「AIコンサルタント」に変更

- **対象**: チャットエリア内のロボットマーク付き文言
- **変更**: 「AIアシスタント」等 → 「AIコンサルタント」
- **想定ファイル**: `app/consulting/components/ChatView.tsx`, `ChatMessage.tsx` 等

---

## 2. ログアウトボタン押下時の事前保存とメッセージ表示

- **要件**: ログアウト前に相談内容を保存し、メッセージを表示する
- **想定**: セッション保存 → 確認メッセージ（Toast等）→ ログアウト
- **想定ファイル**: ヘッダー／ログアウト処理（`ConsultingHeader.tsx`, 認証関連）

---

## 3. Difyの回答が来ない・2回目以降の回答の対応

- **現象**: Difyの回答が1回目は来るが、2回目以降来ない
- **対応**: conversation_id の引き継ぎ、APIリクエスト／レスポンスの確認、エラーハンドリングの見直し
- **想定ファイル**: `app/api/dify/chat/route.ts`, `app/consulting/start/page.tsx`（conversationId の扱い）

---

## 4. その他（随時TODOに追加）

- スタート画面の細部確認・改善
- 見つかり次第、TODOに追加

---

## 参考

- 相談画面レイアウト: `docs/layout-structure-best-practices.md`
- Dify連携: `app/api/dify/chat/route.ts`, sessionStorage の `dify_conversation_id`
