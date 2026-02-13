# SolveWise Stripe決済実装仕様書 v2.1

**ステータス**: 設計完了 → 実装待ち
**更新日**: 2026-02-12
**前バージョン**: v2.0
**Stripe APIバージョン**: 2025-07-30 以降推奨

## v2.1 変更点（v2.0からの差分）

| No. | 変更内容 | 対象セクション | 種別 |
|---|---|---|---|
| 1 | cancel_at_period_end → cancel_at enum対応 | §5, §5-2 | API変更対応 |
| 2 | Webhook署名検証セクション追加 | §7-4 | セキュリティ追加 |
| 3 | cancellation_details.feedback値をStripe準拠に修正 | §5-2 | バグ修正 |
| 4 | Stripe Customer作成フロー追加 | §4-3 | 設計追加 |
| 5 | Webhook冪等性・順序制御セクション追加 | §4-4 | 設計追加 |
| 6 | suspended状態の定義を明確化 | §6-4 | 曖昧さ解消 |
| 7 | subscriptionsテーブル完全スキーマ追加 | §3-0 | 設計補完 |
| 8 | APIレート制限追加 | §4-1 | セキュリティ追加 |
| 9 | Price ID管理戦略追加 | §9 Phase 1 | 設計追加 |
| 10 | プラン変更（アップ/ダウングレード）フロー追加 | §4-5 | 設計追加 |
| 11 | メール送信基盤の定義追加 | §6-7 | 設計追加 |
| 12 | 新規テーブルのRLSポリシー追加 | §3-3 | セキュリティ追加 |
| 13 | database.types.ts更新タスク追加 | §9 Phase 1 | タスク追加 |
| 14 | モニタリング/アラート設計追加 | §7-6 | 運用追加 |
| 15 | middleware.ts整備計画追加 | §8-3 | 設計追加 |
| 16 | テスト戦略追加 | §9-1 | 品質追加 |
| 17 | CSRF保護追加 | §7-5 | セキュリティ追加 |
| 18 | 環境変数一覧追加 | §1-2 | 設計補完 |
| 19 | Smart Retries設定をStripe実仕様に修正 | §6-1 | ファクトチェック |
| 20 | タイムゾーン方針追加 | §3-4 | 設計追加 |
| 21 | stripe_webhook_eventsテーブル追加 | §3-5 | 設計追加 |

---

## 1. 概要

SolveWise（AI経営コンサルティングプラットフォーム）にStripe決済を統合し、サブスクリプション課金・コンビニ決済・請求書発行・クーポン機能を実装する。

### 1-1. 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 16.1.x + TypeScript + Tailwind CSS |
| 決済UI | Stripe Elements（埋め込み型） |
| バックエンド | Next.js API Routes (App Router) |
| データベース | Supabase (PostgreSQL) |
| 決済処理 | Stripe API (version 2025-07-30+) |
| メール送信 | Stripe自動メール + Resend（カスタムメール） |
| デプロイ | Vercel |
| 申請形態 | 法人 |

### 1-2. 環境変数一覧 [NEW]

Phase 1で `.env.local` に追加する環境変数:

| 変数名 | 用途 | 必須 |
|---|---|---|
| STRIPE_SECRET_KEY | Stripeシークレットキー（sk_test_ / sk_live_） | ✅ |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe公開キー（pk_test_ / pk_live_） | ✅ |
| STRIPE_WEBHOOK_SECRET | Webhook署名検証シークレット（whsec_） | ✅ |
| STRIPE_PRICE_PRO_MONTHLY | Pro月額プランのPrice ID | ✅ |
| STRIPE_PRICE_PRO_YEARLY | Pro年額プランのPrice ID | ✅ |
| STRIPE_PRICE_ENTERPRISE_MONTHLY | Enterprise月額プランのPrice ID | ✅ |
| RESEND_API_KEY | Resendメール送信APIキー | ✅ Phase 2 |

**注意**: STRIPE_SECRET_KEY は絶対に `NEXT_PUBLIC_` プレフィックスを付けないこと。

**Price ID管理方針**: Price IDはStripe Dashboard上で作成後、環境変数で管理する。テスト環境と本番環境で異なるIDとなるため、環境変数による切替が必須。`lib/stripe/config.ts` で一元管理するヘルパーを実装する。

---

## 2. 料金プラン定義

### 2-1. プラン一覧

| 項目 | Free | Pro | Enterprise |
|---|---|---|---|
| 月額 | ¥0 | ¥35,000（年払 ¥30,000） | ¥120,000〜（要相談） |
| セッション数 | 月5回（15往復） | 月30回（30往復） | 無制限 |
| レポート | 簡易サマリーのみ | 最終レポート出力 | 全機能 + 実行計画支援 |
| 専任サポート | — | — | ✅ |
| カスタム診断 | — | — | ✅ |

### 2-2. 決済方法

| 決済方法 | Pro | Enterprise | 実装Phase | 備考 |
|---|---|---|---|---|
| クレジットカード（JCB含む） | ✅ | ✅ | Phase 2 | 3DS2自動対応済 |
| コンビニ決済 | △ オプション | ✅ 推奨 | Phase 3 | send_invoice方式必須、手動決済のみ |
| 振込決済（Furikomi） | ❌ | ✅ | Phase 2 | B2B取引の96%が銀行振込 |
| 請求書払い | ❌ | ✅ | Phase 3 | Stripe Invoicing使用 |

**コンビニ決済の制約事項:**
- `collection_method: 'send_invoice'` が必須（自動課金`charge_automatically`は不可）
- 金額制限: ¥120〜¥300,000（全プラン範囲内）
- Proでは手動決済が必要なためオプション扱い。Enterprise推奨

**振込決済（Furikomi）について:**
- Stripe `customer_balance` + `bank_transfer` を使用
- `payment_method_options.customer_balance.funding_type: 'bank_transfer'` を指定
- B2B取引では銀行振込が主流（96%）のためEnterprise向けにPhase 2から対応

### 2-3. 3D Secure 2.0 対応

2025年3月末施行の義務化に対応済み。Stripeが自動処理するため追加実装不要。

- Payment Intents / Checkout Sessions 使用時にStripeが自動トリガー
- 追加実装: 不要（Stripe側で完結）
- Radar設定推奨: Phase 1で初期設定実施（不正利用検知）
- Network Tokens: Phase 3で検討（承認率向上）

---

## 3. DB設計

### 3-0. subscriptions テーブル（完全スキーマ） [NEW - v2.1で追加]

既存テーブルの拡張。Stripe連携カラムを追加する。

| カラム名 | 型 | 説明 | 既存/新規 |
|---|---|---|---|
| id | UUID PK | 主キー | 既存 |
| profile_id | UUID FK | profiles(id)参照 | 既存 |
| plan_type | VARCHAR(20) | free / pro / enterprise | 既存（CHECK制約更新） |
| status | VARCHAR(50) | Stripe準拠ステータス（下記参照） | 既存（値の拡張） |
| app_status | VARCHAR(50) | アプリ独自ステータス（active / suspended / pending） | **新規** |
| stripe_customer_id | VARCHAR(255) | Stripe Customer ID (cus_xxx) | 既存（未使用→使用開始） |
| stripe_subscription_id | VARCHAR(255) | Stripe Subscription ID (sub_xxx) | 既存（未使用→使用開始） |
| stripe_price_id | VARCHAR(255) | 現在のStripe Price ID | **新規** |
| billing_interval | VARCHAR(20) | monthly / yearly | **新規** |
| current_period_start | TIMESTAMPTZ | 現在の請求期間開始 | 既存 |
| current_period_end | TIMESTAMPTZ | 現在の請求期間終了 | 既存 |
| cancel_at | TIMESTAMPTZ | 解約予定日時（NULL=解約予定なし） | **新規** |
| canceled_at | TIMESTAMPTZ | 解約実行日時 | **新規** |
| trial_end | TIMESTAMPTZ | トライアル終了日（将来拡張用） | **新規** |
| created_at | TIMESTAMPTZ | 作成日時 | 既存 |
| updated_at | TIMESTAMPTZ | 更新日時 | 既存 |

**status（Stripe準拠）の取りうる値:**
- `incomplete` — 初回決済が保留中
- `incomplete_expired` — 23時間以内に決済完了せず
- `trialing` — トライアル期間中
- `active` — 有効（支払い済み）
- `past_due` — 直近の請求書が未払い
- `canceled` — 解約済み
- `unpaid` — 未払い（請求書はオープンのまま）
- `paused` — 一時停止中

**app_status（アプリ独自）の取りうる値:**
- `active` — サービス利用可能
- `suspended` — サービス停止（未払いによる）
- `pending` — セットアップ中

> **重要**: Stripe側のstatusが `past_due` でも、猶予期間中はapp_statusを `active` のまま維持する。Day 17を超えた場合にapp_statusを `suspended` に変更する。

### 3-1. cancellation_reasons テーブル

解約フローで収集した理由を保存し、チャーン分析に活用する。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | UUID PK | 主キー |
| user_id | UUID FK | auth.users(id)参照 |
| subscription_id | UUID FK | subscriptions(id)参照 |
| reason_category | TEXT | too_expensive / unused / switched_service / missing_features / too_complex / other |
| reason_detail | TEXT | 自由記述（任意・最大1000文字） |
| plan_at_cancel | TEXT | pro / enterprise |
| months_subscribed | INTEGER | 契約期間（月数） |
| cancel_type | TEXT | end_of_period / immediate |
| retention_offered | BOOLEAN | リテンションクーポン提示有無 |
| retention_accepted | BOOLEAN | クーポン受諾有無 |
| created_at | TIMESTAMPTZ | 解約理由登録日時 |

> **v2.1修正**: reason_categoryの選択肢をStripe `cancellation_details.feedback` の列挙値に完全一致させた。

### 3-2. payment_failures テーブル

未払いイベントの履歴と督促状況を管理する。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | UUID PK | 主キー |
| user_id | UUID FK | auth.users(id)参照 |
| stripe_invoice_id | TEXT | 対象請求書ID |
| attempt_count | INTEGER | 試行回数（Stripe側） |
| last_attempt_at | TIMESTAMPTZ | 最終試行日時 |
| next_attempt_at | TIMESTAMPTZ | 次回試行予定 |
| dunning_status | TEXT | retry_scheduled / final_warning / suspended / resolved |
| email_sent_count | INTEGER | 通知メール送信数 |
| service_suspended_at | TIMESTAMPTZ | サービス停止日時（NULL=未停止） |
| resolved_at | TIMESTAMPTZ | 解決日時（入金確認時） |
| created_at | TIMESTAMPTZ | 登録日時 |

### 3-3. RLSポリシー [NEW]

全テーブルでRLSを有効化し、以下のポリシーを設定する。

**cancellation_reasons:**
```sql
-- ユーザーは自分の解約理由のみ作成可能
CREATE POLICY "Users can insert own cancellation reasons"
  ON cancellation_reasons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の解約理由のみ参照可能
CREATE POLICY "Users can view own cancellation reasons"
  ON cancellation_reasons FOR SELECT
  USING (auth.uid() = user_id);
```

**payment_failures:**
```sql
-- ユーザーは自分の未払い情報のみ参照可能
CREATE POLICY "Users can view own payment failures"
  ON payment_failures FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATEはservice_role（Webhook経由）のみ
-- RLSポリシー不要（service_roleはRLSをバイパス）
```

**stripe_webhook_events:**
```sql
-- ユーザーアクセス不可（service_roleのみ）
-- SELECTポリシーなし = 一般ユーザーはアクセス不可
```

### 3-4. タイムゾーン方針 [NEW]

- DB保存: 全てUTC（TIMESTAMPTZ）
- Stripe: UTCで管理
- フロントエンド表示: JST（Asia/Tokyo）に変換して表示
- 請求期間の表示: `date-fns` の `formatInTimeZone` を使用してJST変換
- 月次リセット: UTCベースでStripeが自動管理

### 3-5. stripe_webhook_events テーブル [NEW]

Webhook冪等性を保証するためのイベント記録テーブル。

| カラム名 | 型 | 説明 |
|---|---|---|
| id | UUID PK | 主キー |
| stripe_event_id | TEXT UNIQUE | Stripeイベント ID (evt_xxx) |
| event_type | TEXT | イベントタイプ (e.g., checkout.session.completed) |
| processed_at | TIMESTAMPTZ | 処理完了日時 |
| created_at | TIMESTAMPTZ | レコード作成日時 |

---

## 4. API Routes設計

### 4-1. エンドポイント一覧 [UPDATED v2.1]

| メソッド | パス | 機能 | Phase | レート制限 |
|---|---|---|---|---|
| POST | /api/stripe/create-checkout | Checkout Session作成 | 2 | 5回/分/ユーザー |
| POST | /api/stripe/webhook | Stripeイベント受信 | 2 | 無制限（Stripe署名検証で保護） |
| POST | /api/stripe/create-portal | カスタマーポータルURL生成 | 2 | 10回/分/ユーザー |
| GET | /api/stripe/subscription | 現在のサブスク状態取得 | 2 | 30回/分/ユーザー |
| GET | /api/stripe/invoices | 請求書一覧取得 | 2 | 15回/分/ユーザー |
| POST | /api/stripe/apply-coupon | クーポン検証・適用 | 4 | 5回/分/ユーザー |
| GET | /api/usage | 当月の利用状況取得 | 2 | 30回/分/ユーザー |
| POST | /api/stripe/cancel | 解約理由収集 + サブスク停止 | 2 | 3回/分/ユーザー |
| POST | /api/stripe/retry-payment | 手動再請求トリガー | 2 | 3回/分/ユーザー |
| **POST** | **/api/stripe/change-plan** | **[NEW] プラン変更（アップ/ダウングレード）** | **2** | **3回/分/ユーザー** |

**レート制限実装**: 既存の `lib/rate-limit.ts` を活用。Webhookエンドポイントはレート制限不要（Stripe署名検証で保護されるため）。

### 4-2. Webhookイベントハンドリング [UPDATED v2.1]

| イベント | 処理内容 | 重要度 |
|---|---|---|
| checkout.session.completed | サブスク開始、subscriptions更新、Stripe Customer ID保存 | 🔴 必須 |
| customer.subscription.created | subscriptions作成（checkout.session.completedとの順序不整合に対応） | 🔴 必須 |
| customer.subscription.updated | ステータス・プラン変更反映 | 🔴 必須 |
| customer.subscription.deleted | 解約完了処理、cancellation_reasons保存 | 🔴 必須 |
| invoice.paid | invoices更新、領収書URL保存、dunning解決・サービス復旧 | 🔴 必須 |
| invoice.payment_failed | 未払い督促フロー開始、payment_failures記録 | 🔴 必須 |
| invoice.finalized | 請求書確定 | 🟡 推奨 |
| payment_intent.succeeded | コンビニ決済完了 | 🟡 Phase 3 |

### 4-3. Stripe Customer作成フロー [NEW]

Stripe CustomerオブジェクトとSupabaseユーザーの紐付けフロー。

**タイミング**: Checkout Session作成時に処理。

**処理フロー:**
1. Supabase認証でユーザーIDを取得
2. subscriptionsテーブルからstripe_customer_idを検索
3. **存在する場合**: そのcustomer IDをCheckout Sessionのcustomerパラメータに設定
4. **存在しない場合**: `customer_email` パラメータにユーザーのemailを設定し、Stripeに自動作成させる
5. checkout.session.completed Webhook受信時に、sessionオブジェクトからcustomer IDを取得し、subscriptionsテーブルのstripe_customer_idに保存

```
// create-checkout API内の疑似コード
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('stripe_customer_id')
  .eq('profile_id', userId)
  .single();

const sessionParams = {
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/checkout/cancel`,
};

if (subscription?.stripe_customer_id) {
  sessionParams.customer = subscription.stripe_customer_id;
} else {
  sessionParams.customer_email = userEmail;
}
```

### 4-4. Webhook冪等性・順序制御 [NEW]

**冪等性保証:**
- 全Webhookハンドラーの先頭で `stripe_webhook_events` テーブルを確認
- stripe_event_idが既に存在する場合、200を返却しスキップ
- 処理完了後にstripe_event_idを記録

```
// Webhookハンドラー冒頭の疑似コード
const { data: existing } = await supabase
  .from('stripe_webhook_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .single();

if (existing) {
  return NextResponse.json({ received: true, duplicate: true });
}

// 処理実行後
await supabase.from('stripe_webhook_events').insert({
  stripe_event_id: event.id,
  event_type: event.type,
  processed_at: new Date().toISOString(),
});
```

**順序不整合の対応:**
- `customer.subscription.created` が `checkout.session.completed` より先に到着する場合がある
- 対策: 両方のハンドラーで「subscriptionsテーブルに対象レコードが存在するか」をチェックし、UPSERTパターンで処理
- checkout.session.completed: stripe_customer_idとstripe_subscription_idを保存（レコードがなければINSERT）
- customer.subscription.created: ステータスを更新（レコードがなければINSERT）

**リトライ戦略:**
- Webhookハンドラーは処理成功時に200を返却
- 5xx/タイムアウト時はStripeが自動リトライ（最大3日間、段階的間隔）
- 処理中にDBエラーが発生した場合は500を返却し、Stripeのリトライに委ねる

### 4-5. プラン変更API [NEW]

**POST /api/stripe/change-plan**

プランのアップグレード/ダウングレードを処理する。

リクエスト:
```json
{
  "new_plan": "enterprise",
  "billing_interval": "monthly"
}
```

処理フロー:
1. Supabase認証でユーザー確認
2. 現在のsubscriptionとplanを取得
3. 新しいprice_idを環境変数から取得
4. Stripe `subscription.update()` を呼び出し:
   - `items`: 現在のアイテムを新しいprice_idに変更
   - `proration_behavior: 'create_prorations'` で日割り調整を自動適用
5. subscriptionsテーブルのplan_type, stripe_price_id, billing_intervalを更新
6. activity_logsにプラン変更イベント記録

**日割り調整（Proration）:**
- アップグレード: 即時適用。未使用日数分を日割りクレジットとして計算し、新プランの残日数を即時請求
- ダウングレード: 即時適用。クレジットは次回請求書に反映
- Stripeが自動計算するため、独自計算は不要

---

## 5. 解約フロー

顧客がサービス停止を希望する際の解約理由収集、リテンション施策、Stripeサブスクリプション停止の一連のフロー。

### 5-1. 解約フロー全体図

**ステップ1: 解約意思表示**
- ユーザーが /account/billing から「解約する」ボタンをクリック
- 解約確認モーダルを表示（即時解約ではなく確認ステップを挿入）

**ステップ2: 解約理由収集（チャーン分析用）**

解約理由の選択肢を表示（必須）:

| 選択肢ID | 表示テキスト | Stripe cancellation_details.feedback |
|---|---|---|
| too_expensive | 料金が高い | too_expensive |
| unused | 期待した効果が得られなかった / あまり使っていない | unused |
| switched_service | 他のサービスに切り替えた | switched_service |
| missing_features | 必要な機能が不足 | missing_features |
| too_complex | 使い方が難しい | too_complex |
| other | その他 | other |

> **v2.1修正**: 全選択肢IDをStripe APIの `cancellation_details.feedback` 列挙値に完全一致させた。Stripeが受け付ける値: `customer_service`, `low_quality`, `missing_features`, `other`, `switched_service`, `too_complex`, `too_expensive`, `unused`

- 自由記述欄（任意・最大1000文字）→ Stripeの `cancellation_details.comment` にも保存

**ステップ3: リテンション施策（任意）**
- `reason_category === 'too_expensive'` の場合のみリテンションクーポンを提示
- 例: 「次回請求から20%OFFクーポンを適用しますか？」
- Stripe Customer PortalのRetention Coupon機能を利用
- 受諾時: クーポン適用し解約キャンセル / 拒否時: 次ステップへ

**ステップ4: 解約タイプ選択** [UPDATED v2.1]

| 解約タイプ | 動作 | Stripe API |
|---|---|---|
| 期間終了時解約（推奨） | 現在の請求期間終了までサービス継続 | `subscription.update({ cancel_at: 'MAX_PERIOD_END' })` |
| 即時解約 | 即座にサービス停止、日割り返金なし | `subscription.cancel()` |

> **v2.1修正**: `cancel_at_period_end: true` から `cancel_at: 'MAX_PERIOD_END'` に変更。Stripe API 2025-05-28で `cancel_at_period_end` は非推奨となり、より柔軟な `cancel_at` 列挙型が導入された。`MAX_PERIOD_END` は最も遅い請求期間終了日に解約をスケジュールする。

- デフォルトは「期間終了時解約」を推奨（顧客が支払い済み期間を利用可能）
- 即時解約は確認ダイアログを表示し、日割り返金がない旨を明記

**ステップ5: Stripe解約実行 + DB更新**

### 5-2. 解約API詳細設計

**POST /api/stripe/cancel**

リクエスト:
```json
{
  "reason_category": "too_expensive",
  "reason_detail": "月額35,000円は中小企業には負担が大きい",
  "cancel_type": "end_of_period",
  "retention_accepted": false
}
```

処理フロー:
1. Supabase認証でユーザー確認
2. subscriptionsテーブルからstripe_subscription_idを取得
3. cancellation_reasonsテーブルに解約理由を保存
4. Stripe APIでサブスクリプション停止:
   - 期間終了時: `stripe.subscriptions.update(subId, { cancel_at: 'MAX_PERIOD_END', cancellation_details: { comment, feedback } })`
   - 即時: `stripe.subscriptions.cancel(subId, { cancellation_details: { comment, feedback } })`
5. subscriptionsテーブルの cancel_at / canceled_at を更新
6. activity_logsに解約イベント記録
7. 解約確認メール送信（Resend経由、期間終了日または即時停止の旨）

### 5-3. 解約後の動作 [UPDATED v2.1]

| 項目 | 期間終了時解約 | 即時解約 |
|---|---|---|
| サービス利用 | 期間終了まで継続 | 即座停止 |
| データ保持 | 30日間保持後削除 | 30日間保持後削除 |
| 再開可能期間 | cancel_atまでならキャンセル可 | 新規契約が必要 |
| Stripe status | active | canceled |
| cancel_at | 期間終了日時が設定される | NULL（即時キャンセル済み） |
| app_status | active（期間終了まで） | freeにダウングレード |

### 5-4. チャーン分析ダッシュボード

cancellation_reasonsテーブルのデータを集計し、以下の指標を管理画面に表示:
- 月次解約率（チャーンレート）
- 解約理由の分布（円グラフ）
- プラン別・契約期間別の解約傾向
- リテンションクーポンの成功率

---

## 6. 未払い・督促フロー

入金が確認されなかった場合の再請求・通知・サービス停止の一連のフロー。

### 6-1. Stripe Smart Retries設定 [UPDATED v2.1]

Stripe Dashboardの「Revenue Recovery」設定で自動再試行を有効化する:
- Smart Retries: ON（StripeのMLが最適タイミングで再試行）
- 再試行ポリシー: **2週間以内**に最大**8回**の再試行（Stripeデフォルト）
- カスタム設定可能: 1週間 / 2週間 / 3週間 / 1ヶ月 / 2ヶ月から選択
- **推奨設定**: 2週間（デフォルト）— SolveWiseの督促タイムラインに合わせて調整
- 失敗後のサブスクステータス: past_due → 最終的に canceled

> **v2.1修正**: Stripeのデフォルトは最大8回/2週間。仕様書v2.0の「最大4回/28日間」はカスタム設定値であった。Dashboard設定で調整可能だが、まずデフォルトで運用開始し、実績に基づいて調整することを推奨。

### 6-2. 督促タイムライン

| 経過日数 | イベント | アクション | サービス状態 |
|---|---|---|---|
| Day 0 | invoice.payment_failed（1回目） | Stripe自動メール + アプリ内通知 | 継続（status: past_due, app_status: active） |
| Day 3 | Smart Retry | SolveWiseからお知らせメール（Resend） | 継続（app_status: active） |
| Day 7 | Smart Retry | 警告メール「サービス停止のお知らせ」（Resend） | 継続（app_status: active） |
| Day 14 | 最終Smart Retry | 最終警告メール「3日以内にお支払いがない場合停止」（Resend） | 継続（app_status: active） |
| **Day 17** | **全試行失敗** | **サービス停止実行 + 停止通知メール** | **停止（app_status: suspended）** |
| Day 30 | 最終期限 | 自動解約（Stripe canceled）+ Freeにダウングレード | 解約 |

### 6-3. invoice.payment_failed Webhook処理詳細

処理フロー:
1. Stripe Webhookでinvoice.payment_failedを受信（署名検証必須）
2. 冪等性チェック（stripe_webhook_eventsテーブル）
3. invoiceオブジェクトからattempt_countを取得
4. payment_failuresテーブルに記録（attempt_count, dunning_status更新）
5. subscriptionsテーブルのstatusを'past_due'に更新
6. attempt_countに応じた通知メール送信（Resend経由、テンプレート切替）
7. Day 17到達判定: 全試行失敗の場合、サービス停止処理を実行

### 6-4. サービス停止処理詳細 [UPDATED v2.1]

> **v2.1修正**: Stripeのsubscription statusに `suspended` は存在しない。SolveWise独自の `app_status` カラムで管理する。

**停止時の処理:**
- subscriptions.app_status を `'suspended'` に更新（Stripe側のstatusはpast_dueのまま）
- payment_failures.service_suspended_at に現在日時を記録
- payment_failures.dunning_status を 'suspended' に更新
- コンサルティング機能へのアクセスをブロック（PlanGateコンポーネントで `app_status` を確認）
- ダッシュボードに「お支払いが未完了です」バナー表示（PaymentFailureBanner）
- データは保持（削除しない）— 入金後に復旧可能

**復旧時の処理（invoice.paid Webhook）:**
- subscriptions.status を Stripeから取得した値に同期
- subscriptions.app_status を `'active'` に復旧
- payment_failures.dunning_status を 'resolved' に更新
- payment_failures.resolved_at に現在日時を記録
- サービス復旧通知メール送信（Resend経由）

### 6-5. 手動再請求API

**POST /api/stripe/retry-payment**

管理者またはユーザーが支払い方法を更新した後、手動で再請求をトリガーするためのAPI:
- リクエスト: stripe_invoice_id または user_id
- Stripe API: `invoice.pay()` で再試行
- 成功時: invoice.paid Webhookで復旧フローが自動実行
- 失敗時: エラーメッセージを返却し、支払い方法の更新を促す

### 6-6. ユーザー向け通知メールテンプレート

| トリガー | 件名 | 内容概要 | 送信方法 |
|---|---|---|---|
| 初回失敗 | お支払いに問題がありました | 支払い方法更新リンク + 自動再試行の旨 | Stripe自動メール |
| Day 3 | お支払いの確認のお願い | 状況確認 + 支払い更新リンク | Resend |
| Day 7 | お支払いの確認のお願い（再送） | サービス停止予告 + 支払い更新リンク | Resend |
| Day 14 | 【重要】サービス停止のお知らせ | 3日以内に入金なければ停止 + 支払い更新リンク | Resend |
| 停止時 | サービス停止のご連絡 | 停止済み + 復旧方法の案内 + 30日以内に入金で復旧可 | Resend |
| 復旧時 | サービス復旧のご連絡 | 復旧完了 + ご利用案内 | Resend |
| 解約時 | サブスクリプション解約のご連絡 | 自動解約済み + 再契約方法の案内 | Resend |

### 6-7. メール送信基盤 [NEW]

| メール種類 | 送信元 | 実装方法 |
|---|---|---|
| 決済完了・請求書発行 | Stripe | Stripe Dashboard自動メール設定 |
| 初回決済失敗通知 | Stripe | Stripe Dashboard自動メール設定 |
| 督促メール（Day 3〜） | SolveWise | Resend API (lib/email/send.ts) |
| 解約確認メール | SolveWise | Resend API |
| サービス停止/復旧通知 | SolveWise | Resend API |

**Resend選定理由:**
- Vercelとの親和性が高い（Edge Runtime対応）
- 日本語メール送信に対応
- React Emailでテンプレートを管理可能
- Phase 2で `npm install resend` を追加

---

## 7. セキュリティ要件 [UPDATED v2.1]

### 7-1. 3D Secure 2.0 対応状況

2025年3月末施行の義務化について、Stripeが自動対応済み。追加実装不要。

- Payment Intents / Checkout Sessions使用で自動トリガー
- Stripe.jsがチャレンジフローをハンドル
- ダッシュボード設定でカスタマイズ可能（リスク閾値の調整など）

### 7-2. Radar初期設定

Phase 1で以下のRadar設定を実施:
- Stripe Dashboard → Radar → Rules でデフォルトルール確認
- Block rule: `risk_level = 'highest'` を有効化
- Review rule: `risk_level = 'elevated'` を有効化（手動レビュー対象）
- 日本国外からの決済ブロックルール検討（必要に応じて）

### 7-3. 3DSテストカード

| カード番号 | 用途 |
|---|---|
| 4242 4242 4242 4242 | 正常決済（3DSなし） |
| 4000 0000 0000 3220 | 3DS認証必須（認証成功） |
| 4000 0027 6000 3184 | 3DS認証必須（カード拒否） |
| 4000 0000 0000 3063 | 3DS認証必須（認証失敗） |
| 4000 0000 0000 9995 | 決済失敗（残高不足） |
| 4000 0000 0000 0341 | カード拒否 |

有効期限: 将来の任意の日付 / CVC: 任意の3桁 / 郵便番号: 任意

### 7-4. Webhook署名検証 [NEW]

**必須実装**: 全Webhookリクエストに対してStripe署名検証を実施する。

**実装方法（Next.js 16 App Router）:**
```typescript
// app/api/stripe/webhook/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  // 1. Raw bodyを取得（パース前の文字列が必須）
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  // 2. 署名検証
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  // 3. イベント処理（冪等性チェック → ハンドラー呼び出し）
  // ...

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

**重要**: `request.text()` を使用すること。`request.json()` はボディをパースしてしまい、署名検証が失敗する。

### 7-5. CSRF保護 [NEW]

**対象**: ユーザー操作を伴うPOST系API（Webhookは除外）

| エンドポイント | CSRF保護方法 |
|---|---|
| /api/stripe/webhook | Stripe署名検証で保護（CSRF不要） |
| /api/stripe/create-checkout | Supabase認証トークン検証 + Origin/Refererヘッダー検証 |
| /api/stripe/cancel | Supabase認証トークン検証 + Origin/Refererヘッダー検証 |
| /api/stripe/retry-payment | Supabase認証トークン検証 + Origin/Refererヘッダー検証 |
| /api/stripe/change-plan | Supabase認証トークン検証 + Origin/Refererヘッダー検証 |

**実装方針**: Next.js 16のServer Actionsを使用する場合は、フレームワークが自動的にCSRFトークンを生成するため追加対策不要。API Routesを使用する場合は、Supabase認証トークン + Originヘッダー検証で対応する。

### 7-6. モニタリング・アラート設計 [NEW]

既存の `lib/health-monitor.ts` を拡張し、決済関連の監視を追加する。

| 監視項目 | 閾値 | アクション |
|---|---|---|
| Webhook処理エラー率 | >5%/時 | 管理者メール通知 |
| 決済失敗率 | >10%/日 | 管理者メール通知 + Slackアラート |
| 月次チャーン率 | >5% | ダッシュボードに警告表示 |
| Webhook応答時間 | >5秒 | ログにWARN記録 |
| 未処理Webhookイベント | >100件滞留 | 管理者メール通知 |

**実装**: Phase 2で基本的なロギングを実装し、Phase 4で本格的なダッシュボードを構築。

---

## 8. フロントエンド設計

### 8-1. ページ構成

| パス | 機能 |
|---|---|
| /pricing | 料金プラン選択ページ |
| /checkout | Stripe Elements埋め込み決済 |
| /checkout/success | 決済完了 |
| /checkout/cancel | 決済キャンセル |
| /account | アカウント管理 |
| /account/billing | 請求・支払い管理 |
| /account/billing/invoices | 請求書/領収書一覧 |
| /account/billing/portal | Stripe Portalへリダイレクト |
| /account/cancel | 解約フロー（理由収集 + 確認） |
| /account/billing/update-payment | 支払い方法更新（督促メールからのリンク先） |

### 8-2. コンポーネント構成

| コンポーネント | 機能 |
|---|---|
| billing/PricingCard.tsx | 料金プランカード |
| billing/CheckoutForm.tsx | Stripe Elements決済フォーム |
| billing/SubscriptionStatus.tsx | 現在のプラン状態表示 |
| billing/UsageIndicator.tsx | セッション使用量バー |
| billing/InvoiceList.tsx | 請求書/領収書一覧 |
| billing/CouponInput.tsx | クーポンコード入力 |
| billing/PaymentMethodSelect.tsx | 決済方法選択 |
| billing/CancelFlow.tsx | 解約フロー（ステップウィザード） |
| billing/RetentionOffer.tsx | リテンションクーポン提示 |
| billing/PaymentFailureBanner.tsx | 未払い警告バナー（app_status=suspendedで表示） |
| billing/UpdatePaymentMethod.tsx | 支払い方法更新フォーム |
| guards/PlanGate.tsx | プラン制限 + app_status=suspendedブロック |

### 8-3. middleware.ts整備計画 [NEW]

現在ルートにmiddleware.tsが存在しないため、Phase 2で統合的なmiddlewareを構築する。

**middleware.tsの責務:**
1. Supabaseセッション更新（既存のproxy.ts機能を統合）
2. 認証チェック（保護ルートへのアクセス制御）
3. サブスクリプション状態チェック（app_status=suspendedの場合、/account/billing/update-paymentへリダイレクト）
4. OAuth callbackリダイレクト処理（既存のmiddleware 2.tsの機能）

**保護レベル**: Level 1（.cursorrules準拠）— 作成・変更時は必ず確認を取る。

**ルーティング制御:**
```
/dashboard/**     → 認証必須 + app_status確認
/consulting/**    → 認証必須 + app_status確認 + プラン制限確認
/account/**       → 認証必須
/api/stripe/webhook → middleware除外（Stripe直接アクセスのため）
/pricing, /auth/** → 公開（認証不要）
```

### 8-4. フロントエンドエラーハンドリング

| エラー種類 | UI対応 |
|---|---|
| 決済失敗（カード拒否等） | トースト通知 + エラーメッセージ表示 + リトライボタン |
| 3DS認証失敗 | モーダルでの案内 + 別カードでのリトライ提案 |
| ネットワークエラー | トースト通知 + 自動リトライ（3回まで） |
| サブスク状態不整合 | 画面リロード + Stripe状態再取得 |
| Webhook遅延 | 「処理中」表示 + ポーリング（5秒間隔、最大60秒） |

---

## 9. 実装フェーズ [UPDATED v2.1]

### Phase 1: 基盤構築（1〜2週間）

- Stripeアカウント作成・テストモードAPIキー取得
- `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`
- **[NEW] `npm install resend`（メール送信基盤）**
- 環境変数設定（.env.local — §1-2の全変数）
- Stripe DashboardでProduct/Price作成（テストモード）
  - **[NEW] 作成したPrice IDを環境変数に設定**
- DBマイグレーション:
  - subscriptions拡張（§3-0の新規カラム追加）
  - cancellation_reasons作成（§3-1）
  - payment_failures作成（§3-2）
  - stripe_webhook_events作成（§3-5）
  - **[NEW] 全新規テーブルのRLSポリシー設定（§3-3）**
- **[NEW] `supabase gen types` でdatabase.types.tsを再生成**
- lib/stripe/ のサーバー・クライアント・設定ファイル
  - **[NEW] lib/stripe/config.ts: Price ID一元管理ヘルパー**
- Radar初期設定（Dashboardでルール有効化）
- Smart Retries設定（DashboardでRevenue Recovery有効化）

### Phase 2: 決済コア（2〜3週間）

- Checkout / Webhook / Portal / Subscription各API実装
  - **[NEW] Webhook署名検証実装（§7-4）**
  - **[NEW] Webhook冪等性チェック実装（§4-4）**
  - **[NEW] Stripe Customer作成フロー実装（§4-3）**
- CheckoutForm / PricingCard / SubscriptionStatus / UsageIndicator / PlanGate
  - **[NEW] PlanGateにapp_status=suspended判定を追加**
- consulting_sessions作成時の利用量チェックロジック
- **[NEW] middleware.ts構築（§8-3 — Level 1変更のため確認必須）**
- Stripe CLIでWebhookローカルテスト
  - `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- /api/stripe/cancel 解約API実装
- CancelFlow.tsx / RetentionOffer.tsx 解約UI実装
- invoice.payment_failed Webhookハンドラー実装
- PaymentFailureBanner / UpdatePaymentMethod 未払いUI実装
- /api/stripe/retry-payment 手動再請求API実装
- **[NEW] /api/stripe/change-plan プラン変更API実装（§4-5）**
- 振込決済対応（Enterprise向け）
- **[NEW] 基本的なモニタリングログ実装**

### Phase 3: 日本市場対応（1〜2週間）

- コンビニ決済対応（send_invoice方式で実装）
- 請求書払い対応（Enterprise向け）
- Stripe Invoicing設定（インボイス制度対応）
- 請求書/領収書一覧ページ
- Network Tokens検討（承認率向上のため）

### Phase 4: クーポン・仕上げ（1週間）

- クーポン/プロモーションコード作成・UI・検証API
- Stripe Customer Portal設定
- メール通知設定（Stripe Dashboard + Resendテンプレート整備）
- エラーハンドリング・エッジケース対応
- 本番申請準備（特商法ページ・利用規約・プライバシーポリシー）
- チャーン分析ダッシュボード実装
- **[NEW] モニタリングダッシュボード構築（§7-6）**

### 9-1. テスト戦略 [NEW]

| テスト種類 | ツール | 対象 | Phase |
|---|---|---|---|
| 単体テスト | Jest + stripe-mock | Webhookハンドラー、API Route | 2 |
| 結合テスト | Stripe CLI (webhook forward) | Webhook → DB更新の一連のフロー | 2 |
| E2Eテスト | Playwright + Stripeテストカード | Checkout → 完了 → サブスク確認の全フロー | 2 |
| 手動テスト | Stripe Dashboard (テストモード) | 3DSフロー、コンビニ決済、督促フロー | 2-3 |

**Stripe CLIテスト手順:**
```bash
# 1. Stripe CLIインストール
brew install stripe/stripe-cli/stripe

# 2. ログイン
stripe login

# 3. Webhookフォワード開始
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 4. テストイベント送信
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

**Playwright E2Eテスト例:**
- テストカード4242424242424242で正常決済フローをテスト
- テストカード4000000000003220で3DS認証フローをテスト
- テストカード4000000000009995で決済失敗フローをテスト

---

## 10. 参考リンク

- Stripe Elements: https://stripe.com/docs/payments/elements
- Stripe Billing: https://stripe.com/docs/billing/subscriptions/overview
- Stripe Webhook: https://stripe.com/docs/webhooks
- Stripe Webhook署名検証: https://stripe.com/docs/webhooks/signatures
- Stripe Customer Portal: https://stripe.com/docs/billing/subscriptions/integrating-customer-portal
- Stripe 日本の決済方法: https://stripe.com/docs/payments/payment-methods/integration-options#japan
- Cancel Subscriptions: https://stripe.com/docs/billing/subscriptions/cancel
- cancel_at enum変更 (2025-05-28): https://docs.stripe.com/changelog/basil/2025-05-28/cancel-at-enums
- Customer Portal Cancellation Page: https://stripe.com/docs/customer-management/cancellation-page
- Revenue Recovery (Smart Retries): https://stripe.com/docs/billing/revenue-recovery/smart-retries
- 3D Secure: https://stripe.com/docs/payments/3d-secure
- Radar Rules: https://stripe.com/docs/radar/rules
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Resend (メール送信): https://resend.com/docs
- Konbini決済: https://stripe.com/docs/payments/konbini
- Furikomi (銀行振込): https://stripe.com/docs/payments/bank-transfers
