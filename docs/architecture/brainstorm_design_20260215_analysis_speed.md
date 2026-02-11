# 分析更新の高速化 — Brainstorm & Design

**日付**: 2026-02-15  
**目的**: ダッシュボード「分析」セクションの更新を速くするため、ロジックを精査しファクトに基づいて設計する。

---

## 1. ファクトチェック結果（現状）

### 1.1 フロントエンド

| 項目 | 事実 |
|------|------|
| 「全て更新」の呼び方 | `fetchSectionData('industry-trends', true)` 等を **4本とも await なしで呼んでいる** → 4リクエストは **並列** に発行されている |
| タブ切り替え時 | `Promise.all(sections.map(section => fetchSectionData(section, false)))` で並列取得（タブ1つあたり1セクション） |
| タイムアウト | `fetchWithRetry(..., 120_000, 3)`（120秒、3回リトライ） |

**結論**: クライアント側の並列化は既にされている。ボトルネックは**各APIの処理時間**。

### 1.2 各分析APIの処理フロー（コード確認済み）

| API | 処理順 | キャッシュ | 備考 |
|-----|--------|------------|------|
| industry-trends | Auth → Supabase(profile, company) → **6× Brave Web 並列** → **1× Claude generateObject** | **なし** |  |
| swot-analysis | Auth → Supabase → **10× Brave Web 並列** → **1× Claude generateObject** → checkAIResult（同期的） | **なし** |  |
| world-news | Auth → Supabase → **11× Brave News 並列** → **1× Claude generateObject** | **なし** | rate-limit 未適用 |
| industry-forecast | Auth → Supabase → **10× Brave Web 並列** → **1× Claude generateObject** → checkAIResult（同期的） | **なし** | maxDuration 120s |

- いずれも **Brave 検索は Promise.all で並列**。Claude は 1 回のみで直列。
- **checkAIResult** は同期的な軽量ロジックのためボトルネックではない。
- **分析4APIにはキャッシュが無い**。毎回 Brave + Claude を実行している。

### 1.3 既存キャッシュパターン（market / local-info）

- テーブル: **dashboard_data**（`user_id`, `company_id`, `data_type`, `data`, `updated_at`, `expires_at`）
- ユニーク: `(user_id, company_id, data_type)`
- **refresh=true** のときはキャッシュをスキップして再計算し、結果を UPSERT。
- **refresh なし** のときは `updated_at` が有効期限内ならキャッシュを返す（market は 5 分）。

---

## 2. 確定要件

- **分析の更新を体感で速くする**（同じ品質を維持する前提）。
- **既存の「全て更新」「個別更新」の挙動は維持**（強制更新時は必ず再計算）。
- **ルール遵守**: 1ファイルずつ変更、保護レベルに応じた変更通知、既存パターンに合わせる。

---

## 3. スコープ外

- Brave 検索回数の削減（品質への影響のため今回は見送り）。
- Claude モデルの変更（品質担保のため今回は見送り）。
- バッチAPI化（認証・会社取得の共通化は将来検討、今回はキャッシュのみ）。

---

## 4. 設計方針：分析APIへのサーバー側キャッシュ導入

### 4.1 方針

- **market / local-info と同じ** `dashboard_data` を使い、分析4種（industry-trends, swot-analysis, world-news, industry-forecast）にも **読み取り・保存** を追加する。
- **キャッシュ有効期間**: 分析は重いため **30分**。5分だと「更新」が頻繁に走り体感が改善しにくい。
- **強制更新**: `?refresh=true` のときはキャッシュを読まずに再計算し、結果を `dashboard_data` に UPSERT する。
- **レスポンス形式**: 既存と同一（`data`, `updatedAt`, 必要に応じて `company` / `factCheck`）。キャッシュヒット時は `cached: true` を付与（既存の market と同様）。

### 4.2 データ型（data_type）

- `industry-trends`
- `swot-analysis`
- `world-news`
- `industry-forecast`

既存の `dashboard_data` の `data_type`（VARCHAR(50)）でそのまま使用可能。マイグレーション不要。

### 4.3 キャッシュロジック（各API共通）

1. `refresh !== 'true'` の場合のみキャッシュ参照。
2. `dashboard_data` を `user_id`, `company_id`, `data_type` で検索し、`updated_at` が「現在 − 30分」以降ならヒットとする。
3. ヒットしたら `data` と `updated_at` を返し、`cached: true` を付与。Brave / Claude は呼ばない。
4. ヒットしなければ従来どおり Brave → Claude を実行し、結果を `dashboard_data` に UPSERT（`expires_at` は 30分後）、`cached: false` で返す。

### 4.4 ファイル影響範囲

| ファイル | 変更内容 | 保護レベル |
|----------|----------|------------|
| app/api/dashboard/industry-trends/route.ts | 冒頭でキャッシュ参照、末尾で保存 | レベル2 |
| app/api/dashboard/swot-analysis/route.ts | 同上 | レベル2 |
| app/api/dashboard/world-news/route.ts | 同上 + rate-limit 追加（他と揃える） | レベル2 |
| app/api/dashboard/industry-forecast/route.ts | 同上 | レベル2 |

- **参照のみ**: `lib/supabase/server`, `dashboard_data` スキーマ、`app/api/dashboard/market/route.ts`（キャッシュパターン参照）。
- **変更しない**: フロントエンド（DashboardClient）、middleware、next.config、package.json。

---

## 5. 期待効果

- **初回または「全て更新」直後**: 従来と同様の時間（Brave + Claude 実行）。
- **30分以内の再表示・タブ切り替え**: キャッシュヒットで **即時** に近い応答（DB 1クエリ程度）。
- **「更新」ボタン（refresh=true）**: 従来どおりフル再計算で最新結果を取得。

品質・セキュリティは既存と同等（認証・RLS・レート制限は維持）。
