# 🧠 Brainstorm: プラン・利用カウント・アカウント情報表示

**日付**: 2026-02-05  
**対象**: プロファイルにプラン/利用数を含める、プラン変更手続き、利用カウント集計、プロフィール内アカウント情報表示

---

## 要件サマリー

1. **プロファイルに含める**: `plan_type`, `monthly_chat_count`, `monthly_ocr_count` をプロファイル取得で確実に含める（設定は既に select('*') のため取得済み。他画面でプロファイルを参照する場合は明示 select に追加）。
2. **プラン変更手続き**: アカウント設定のプランタブで「プランを変更」押下時の処理を追加する（現状は `alert('準備中')` のみ）。
3. **利用カウント集計の仕掛け**: ユーザーの利用（チャット送信・OCR利用）をカウントし、集計できるようにする。
4. **プロフィール情報にアカウント情報を表示**: 設定の「アカウント」タブ内のプロフィール情報ブロックで、プラン名・利用数などを表示する。ここに「プラン変更」を促すボタンを配置する。

---

## ファクトチェック結果

| 項目 | 確認結果 |
|------|----------|
| profiles の plan_type / monthly_chat_count / monthly_ocr_count | schema.sql に存在。設定ページは select('*') で取得済み。 |
| subscriptions テーブル | user_id, plan_type, status, chat_count, ocr_count, stripe_* 等。schema は user_id + plan_type。 |
| 設定のプラン表示 | SettingsContent の「プラン」タブで profile?.plan_type, subscription?.status を表示。handleChangePlan は confirm + alert のみ。 |
| 利用数の保存先 | profiles: monthly_chat_count, monthly_ocr_count。subscriptions: chat_count, ocr_count。どちらも未更新のまま。 |
| チャット送信箇所 | POST /api/consulting/sessions/[id]/messages でメッセージ保存。ここで profiles の monthly_chat_count を加算可能。 |
| OCR 利用箇所 | /api/ocr-business-card 等。利用回数を加算するならここか、呼び出し元で API 経由で加算。 |

---

## 確定要件

- 設定のプロフィール取得は既に select('*') のため、plan_type / monthly_* は既に取得されている。他 API で profiles を明示 select している箇所（ダッシュボード等）で、アカウント情報を表示する場合はそれらを追加する。
- プロフィール情報カード内に「アカウント情報」セクションを追加し、現在プラン・今月の利用数（チャット/OCR）を表示する。ボタン「プラン変更」でプランタブへ切り替える。
- プラン変更手続き: 簡易フローとする。Stripe 決済はスコープ外。選択したプラン（free/standard/enterprise）で profiles.plan_type と subscriptions を更新する API を用意し、handleChangePlan から呼び出す。
- 利用カウント: チャット送信成功時に profiles.monthly_chat_count を +1。OCR 実行成功時に profiles.monthly_ocr_count を +1。月次リセットは別タスクとする（スコープ外でも可）。

---

## スコープ外

- Stripe による決済・課金（「変更手続き」は DB 更新＋成功メッセージまで）。
- 月次リセット（monthly_* の月初リセット）は今回含めない。必要なら cron 等で別対応。
- subscriptions.chat_count / ocr_count との二重管理は避け、profiles の monthly_* に統一する（表示・集計は profiles ベース）。

---

## ファイル影響範囲

| 種別 | ファイル |
|------|----------|
| 変更 | components/SettingsContent.tsx（アカウント情報ブロック追加、handleChangePlan 実装） |
| 変更 | app/api/consulting/sessions/[id]/messages/route.ts（チャット送信後に monthly_chat_count 加算） |
| 変更 | app/api/ocr-business-card/route.ts（OCR 成功後に monthly_ocr_count 加算） |
| 新規 | app/api/settings/change-plan/route.ts（プラン変更 API） |
| 参照のみ | app/dashboard/settings/page.tsx（既に select('*') のため変更なしでよい） |

---

## 補足

- ダッシュボード TOP でプランや利用数を表示する要件は今回含めない（設定内のプロフィール＋アカウント情報に限定）。
- プロファイル取得を明示 select にしている他画面で「プラン・利用数」を表示する場合は、その画面の select に plan_type, monthly_chat_count, monthly_ocr_count を追加する。
