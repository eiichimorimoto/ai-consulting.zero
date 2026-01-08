# Alpha Vantage API 設定ガイド

> 為替・株価データを正確に取得

## 📝 APIキーの取得（3分）

### 1. APIキー発行
https://www.alphavantage.co/support/#api-key

1. メールアドレスを入力
2. 「GET FREE API KEY」をクリック
3. APIキーが即座に表示される

### 2. 環境変数に追加

#### ローカル（`.env.local`）
```bash
ALPHA_VANTAGE_API_KEY=あなたのAPIキー
```

#### Vercel
1. https://vercel.com/your-project/settings/environment-variables
2. 「Add New」をクリック
3. Name: `ALPHA_VANTAGE_API_KEY`
4. Value: あなたのAPIキー
5. 「Save」→「Redeploy」

### 3. 無料プランの制限
- **500 calls/日**
- **25 calls/分**
- 十分な量です

---

## 📊 APIの仕様

### 為替レート
```
https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=JPY&apikey={API_KEY}
```

**レスポンス例:**
```json
{
  "Realtime Currency Exchange Rate": {
    "1. From_Currency Code": "USD",
    "2. From_Currency Name": "United States Dollar",
    "3. To_Currency Code": "JPY",
    "4. To_Currency Name": "Japanese Yen",
    "5. Exchange Rate": "156.42000000",
    "6. Last Refreshed": "2026-01-09 12:34:56",
    "7. Time Zone": "UTC",
    "8. Bid Price": "156.41000000",
    "9. Ask Price": "156.43000000"
  }
}
```

### 株価
```
https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey={API_KEY}
```

**レスポンス例:**
```json
{
  "Global Quote": {
    "01. symbol": "AAPL",
    "02. open": "185.50",
    "03. high": "186.20",
    "04. low": "184.30",
    "05. price": "185.92",
    "06. volume": "52340000",
    "07. latest trading day": "2026-01-08",
    "08. previous close": "184.50",
    "09. change": "1.42",
    "10. change percent": "0.7699%"
  }
}
```

---

## 📈 取得できるデータ

### 為替
- USD/JPY (ドル円)
- EUR/JPY (ユーロ円)
- その他の通貨ペア

### 株価
- 米国株式（AAPL, GOOGL, MSFT等）
- ETF（EWJ: 日本株式市場）
- **注意**: 日経平均（^N225）は直接取得不可
  - 代替: EWJ ETF（日本株式市場全体を追跡）

### 金利
- Alpha Vantageでは非対応
- 代替: 財務省・日本銀行の公開データ

---

## 🔧 実装例

### 為替レート取得
```typescript
import { getForexRate } from '@/lib/alphavantage'

const usdJpy = await getForexRate('USD', 'JPY')
// → { symbol: 'USD/JPY', rate: 156.42, timestamp: '2026-01-09 12:34:56' }
```

### 株価取得
```typescript
import { getStockPrice } from '@/lib/alphavantage'

const apple = await getStockPrice('AAPL')
// → { symbol: 'AAPL', price: 185.92, change: 1.42, changePercent: 0.77, timestamp: '2026-01-08' }
```

### 日経平均の代替
```typescript
import { getNikkeiProxy } from '@/lib/alphavantage'

const nikkei = await getNikkeiProxy()
// → { symbol: '日経平均 (EWJ)', price: 39000, change: 200, changePercent: 0.51, timestamp: '2026-01-08' }
```

---

## ⚠️ 注意事項

### レート制限
- 25 calls/分を超えると、APIがエラーを返す
- キャッシュ（10分）を使用して呼び出し回数を削減

### エラーハンドリング
```json
{
  "Note": "Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per minute."
}
```

このエラーが発生した場合、フォールバック値を使用するか、キャッシュ時間を延長する。

---

## 🎯 今後の拡張

### 金利データ
- API Ninjas: https://api-ninjas.com/api/interestrate
- または日本銀行の公開データ

### 原材料価格
- Commodities API: https://commodities-api.com/
- または各取引所のAPI
