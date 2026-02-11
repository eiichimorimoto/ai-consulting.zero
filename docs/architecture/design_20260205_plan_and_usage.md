# 🎨 Design: プラン・利用カウント・アカウント情報表示

**日付**: 2026-02-05

---

## 1. データフロー

```
[ユーザー] 
  → 設定アカウントタブ: プロフィール + アカウント情報（プラン・利用数）表示
  → 「プラン変更」クリック → プランタブへ切り替え
  → プランカードで「プランを変更」 → confirm → POST /api/settings/change-plan
  → API: profiles.plan_type 更新 + subscriptions 更新（upsert）
  → 成功時: toast + router.refresh()

[チャット送信]
  → POST /api/consulting/sessions/[id]/messages（既存）
  → メッセージ保存・Dify 呼び出し後、profiles.monthly_chat_count を +1（同一 user_id）

[OCR 利用]
  → POST /api/ocr-business-card（既存）
  → OCR 成功後、profiles.monthly_ocr_count を +1（同一 user_id）
```

---

## 2. API 設計

### POST /api/settings/change-plan

- **認証**: 必須（getUser）。
- **Body**: `{ planType: 'free' | 'standard' | 'enterprise' }`
- **処理**:
  1. profiles を user_id で取得。
  2. profiles.plan_type を更新。
  3. subscriptions を user_id で取得。なければ insert（user_id, plan_type, status: 'active'）、あれば update（plan_type）。
- **レスポンス**: `{ success: true }` または 400/401/500。

---

## 3. UI 設計（SettingsContent）

- **プロフィール情報カード内**（「肩書き・部署」の下、または保存ボタンの上）に **「アカウント情報」** セクションを追加。
  - 表示項目: 現在のプラン名（getPlanName(profile?.plan_type)）、今月のチャット利用数（profile?.monthly_chat_count ?? 0）、今月のOCR利用数（profile?.monthly_ocr_count ?? 0）。
  - ボタン: 「プラン変更」→ クリックで setActiveTab('plan') でプランタブに切り替え。
- **handleChangePlan**: confirm のあと POST /api/settings/change-plan を呼び、成功で toast.success + router.refresh()。失敗で toast.error。

---

## 4. 利用カウント加算

- **messages API**: ユーザーメッセージ保存および Dify 呼び出しが成功したあと、その user_id の profiles に対して `monthly_chat_count = COALESCE(monthly_chat_count,0) + 1` を 1 回だけ実行。
- **ocr-business-card API**: OCR 処理が成功したあと、その user_id の profiles に対して `monthly_ocr_count = COALESCE(monthly_ocr_count,0) + 1` を 1 回だけ実行。

---

## 5. 保護レベル・影響

- 変更対象: SettingsContent（レベル3）、messages route（レベル2）、ocr-business-card route（レベル2）、新規 API（レベル2相当）。
- 複数ファイルにまたがるため、1 ファイルずつ実装し、動作確認後に次へ進む。
