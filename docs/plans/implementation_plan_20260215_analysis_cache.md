# 実装計画: 分析API サーバーキャッシュ追加

**日付**: 2026-02-15  
**前提**: [brainstorm_design_20260215_analysis_speed.md](../architecture/brainstorm_design_20260215_analysis_speed.md) の設計に基づく。

---

## タスク一覧

### Task 1: industry-trends API にキャッシュ追加

- **目的**: 業界動向APIで dashboard_data の読み書きを行う。
- **ファイル**: `app/api/dashboard/industry-trends/route.ts`
- **手順**:
  1. GET 冒頭で `refresh=true` でなければ `dashboard_data` を参照（user_id, company_id, data_type: `industry-trends`、updated_at が 30分以内）。
  2. ヒット時は `data` と `updated_at` を返し `cached: true`。return で終了。
  3. ヒットしなければ既存の Brave → Claude 処理を実行。
  4. レスポンス返却前に `dashboard_data` に UPSERT（expires_at は 30分後）。
- **見積もり**: 約15分
- **依存**: なし

### Task 2: swot-analysis API にキャッシュ追加

- **目的**: SWOT分析APIで同様に dashboard_data を利用。
- **ファイル**: `app/api/dashboard/swot-analysis/route.ts`
- **手順**: Task 1 と同様。data_type: `swot-analysis`。返却形式に factCheck があるため、キャッシュ保存・返却時に factCheck も含める（既存レスポンスをそのまま保存）。
- **見積もり**: 約15分
- **依存**: なし（Task 1 と独立）

### Task 3: world-news API にキャッシュ追加

- **目的**: 世界ニュースAPIで同様にキャッシュ。あわせて rate-limit を他APIと統一。
- **ファイル**: `app/api/dashboard/world-news/route.ts`
- **手順**: Task 1 と同様。data_type: `world-news`。冒頭に `applyRateLimit(request, 'dashboard')` を追加。
- **見積もり**: 約15分
- **依存**: なし

### Task 4: industry-forecast API にキャッシュ追加

- **目的**: 業界予測APIで同様にキャッシュ。
- **ファイル**: `app/api/dashboard/industry-forecast/route.ts`
- **手順**: Task 1 と同様。data_type: `industry-forecast`。factCheck を保存・返却に含める。
- **見積もり**: 約15分
- **依存**: なし

---

## 実装順序

1. Task 1 → 動作確認（キャッシュなしで初回、2回目でキャッシュヒットすることを確認）。
2. Task 2 → 動作確認。
3. Task 3 → 動作確認。
4. Task 4 → 動作確認。

---

## 注意事項

- **1ファイルずつ** 変更し、都度コミット・確認。
- 既存の `dashboard_data` の UPSERT は market と同様 `onConflict: 'user_id,company_id,data_type'`。スキーマに `updated_at` の自動更新トリガーあり。
- キャッシュ保存時は `expires_at` を 30分後に設定（参考: market は 5分）。
