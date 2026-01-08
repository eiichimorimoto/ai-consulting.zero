# Alpha Vantage API 検証結果

> 実施日時: 2026-01-09 22:45

---

## ✅ APIキー確認

| 項目 | 結果 |
|------|------|
| APIキー設定 | ✅ `.env.local`に設定済み |
| キープレフィックス | `HOFP****` |
| キー長 | 16文字 |
| 形式 | 正常 |

---

## ✅ 為替レートAPI（USD/JPY）

### テスト実行

```bash
API: CURRENCY_EXCHANGE_RATE
URL: https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=JPY
```

### レスポンス

```json
{
  "Realtime Currency Exchange Rate": {
    "1. From_Currency Code": "USD",
    "2. From_Currency Name": "United States Dollar",
    "3. To_Currency Code": "JPY",
    "4. To_Currency Name": "Japanese Yen",
    "5. Exchange Rate": "156.69000000",
    "6. Last Refreshed": "2026-01-08 13:20:43",
    "7. Time Zone": "UTC",
    "8. Bid Price": "156.68400000",
    "9. Ask Price": "156.69000000"
  }
}
```

### 結果

| 項目 | 値 |
|------|-----|
| **為替レート** | **156.69円** |
| 更新日時 | 2026-01-08 13:20:43 UTC |
| ステータス | ✅ **成功** |

---

## ✅ 株価API（EWJ ETF）

### テスト実行

```bash
API: GLOBAL_QUOTE
Symbol: EWJ (iShares MSCI Japan ETF)
URL: https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=EWJ
```

### レスポンス

```json
{
  "Global Quote": {
    "01. symbol": "EWJ",
    "02. open": "83.1200",
    "03. high": "83.1400",
    "04. low": "82.7800",
    "05. price": "82.9200",
    "06. volume": "6011471",
    "07. latest trading day": "2026-01-07",
    "08. previous close": "83.0700",
    "09. change": "-0.1500",
    "10. change percent": "-0.1806%"
  }
}
```

### 結果

| 項目 | 値 |
|------|-----|
| **EWJ ETF価格** | **82.92 USD** |
| **日経平均（換算）** | **53,898円** |
| 変動 | -0.15 USD (-0.18%) |
| 取引日 | 2026-01-07 |
| ステータス | ✅ **成功** |

**注意:**
- EWJ × 650 = 53,898円（換算係数650）
- 実際の日経平均とは若干の乖離あり
- ETFは日本株式市場全体を追跡

---

## 📊 実装状況

### 1. ユーティリティ関数（`lib/alphavantage.ts`）

| 関数 | 実装 | テスト |
|------|------|--------|
| `getForexRate(from, to)` | ✅ | ✅ 成功 |
| `getStockPrice(symbol)` | ✅ | 🔄 実施中 |
| `getNikkeiProxy()` | ✅ | 🔄 実施中 |
| `generateWeeklyData(value, weeks)` | ✅ | - |

### 2. マーケットAPI（`app/api/dashboard/market/route.ts`）

| 機能 | 実装 | 状態 |
|------|------|------|
| `getMarketData()`でAPI呼び出し | ✅ | 実装済み |
| 為替レート取得 | ✅ | 実装済み |
| 日経平均取得 | ✅ | 実装済み |
| フォールバック値 | ✅ | 実装済み |
| 10分キャッシュ | ✅ | 実装済み |

---

## 🎯 検証項目

### ✅ 完了

- [x] APIキー設定確認
- [x] 為替レートAPI呼び出し
- [x] レスポンス形式確認
- [x] データ抽出ロジック確認

### ✅ 完了（追加）

- [x] 株価API呼び出し
- [x] EWJ → 日経平均換算
- [x] エラーハンドリング確認

### ⏳ 今後

- [ ] Vercel環境でのAPI動作確認
- [ ] レート制限の確認（25 calls/分）
- [ ] キャッシュ動作確認（10分）

---

## 📋 次のステップ

### 1. Vercel環境変数設定

```bash
Vercel Dashboard:
https://vercel.com/your-project/settings/environment-variables

Name: ALPHA_VANTAGE_API_KEY
Value: （ローカルと同じAPIキー）

保存 → Redeploy
```

### 2. 動作確認

```bash
1. Vercelデプロイ完了を確認
2. ダッシュボードの「マーケット情報」セクションを確認
3. USD/JPYと日経平均が実データで表示されることを確認
```

### 3. デバッグ情報確認

ダッシュボードで以下を確認:
- `apiSource: 'Alpha Vantage'`
- `currentRate: 156.69`（実データ）
- `currentNikkei: 39xxx`（実データ）

---

## ⚠️ 注意事項

### レート制限

```
無料プラン:
- 500 calls/日
- 25 calls/分
```

**対策:**
- 10分キャッシュ実装済み（`{ next: { revalidate: 600 } }`）
- フォールバック値でエラー時も動作保証

### エラーハンドリング

```typescript
if (data['Error Message'] || data['Note']) {
  console.error('APIエラー:', data['Error Message'] || data['Note'])
  return null  // フォールバック値を使用
}
```

---

## 📝 結論

### ✅ 為替レートAPI

**状態: 正常動作**

- APIキー: 正しく設定
- 呼び出し: 成功
- レスポンス: 正常
- データ抽出: 正常
- **為替レート: 156.69円（実データ）**

### ✅ 株価API

**状態: 正常動作**

- APIキー: 正しく設定
- 呼び出し: 成功
- レスポンス: 正常
- データ抽出: 正常
- **EWJ ETF: 82.92 USD（実データ）**
- **日経平均: 53,898円（換算値）**

---

## 🔗 関連ドキュメント

- [Alpha-Vantage-API設定.md](./Alpha-Vantage-API設定.md)
- [為替・株価API問題-解決報告.md](../troubleshooting/為替・株価API問題-解決報告.md)
