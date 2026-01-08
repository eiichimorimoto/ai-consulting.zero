# Vercelでマーケットデータが表示されない問題

> 作成: 2026-01-08

---

## 🔴 症状

- ローカル環境: マーケットデータが表示される
- Vercel環境: マーケットデータが表示されない（古いデータ/固定値）

---

## 🔍 原因の切り分け

### **Step 1: Vercel環境変数の確認**

#### **確認方法:**
```
Vercelダッシュボード
→ プロジェクト選択
→ Settings
→ Environment Variables
```

#### **必要な環境変数:**
```
ALPHA_VANTAGE_API_KEY=YOUR_KEY_HERE
```

#### **チェックポイント:**
- [ ] `ALPHA_VANTAGE_API_KEY`が設定されているか？
- [ ] 値が正しいか？（ローカルの`.env.local`と同じか？）
- [ ] スペースや改行が入っていないか？

---

### **Step 2: Vercelログの確認**

#### **確認方法:**
```
Vercelダッシュボード
→ プロジェクト選択
→ Deployments
→ 最新のデプロイをクリック
→ Functions タブ
→ /api/dashboard/market を探す
```

#### **期待されるログ:**
```
✅ 為替レート: USD/JPY = 156.99円
⏱️ レート制限対策: 1秒待機中...
✅ 日経平均: 53900円 (+150)
```

#### **エラーが出ている場合:**
```
❌ ALPHA_VANTAGE_API_KEY が設定されていません
→ 環境変数が未設定

❌ Alpha Vantage API エラー: 403
→ APIキーが無効

❌ Alpha Vantage API エラー: 429
→ レート制限超過
```

---

### **Step 3: キャッシュのクリア**

#### **Vercel側のキャッシュクリア:**
```bash
# ローカルから実行
vercel env pull .env.vercel
vercel --prod
```

または、Vercelダッシュボードから:
```
Deployments → 最新のデプロイ → ⋯ → Redeploy
```

#### **ブラウザキャッシュのクリア:**
```
1. ブラウザでCmd+Shift+R（Mac）/ Ctrl+Shift+R（Windows）
2. または、開発者ツールを開いて「Disable cache」をチェック
```

---

## ✅ **解決方法（原因別）**

### **原因1: 環境変数が未設定**

#### **対策:**
```
Vercelダッシュボード
→ Settings
→ Environment Variables
→ Add New

Name: ALPHA_VANTAGE_API_KEY
Value: YOUR_KEY_HERE
Environment: Production, Preview, Development（すべてチェック）
→ Save
→ Redeploy
```

---

### **原因2: APIキーが無効**

#### **確認方法:**
```bash
# ローカルで直接APIを叩いて確認
curl "https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=JPY&apikey=YOUR_KEY_HERE"
```

#### **期待される結果:**
```json
{
  "Realtime Currency Exchange Rate": {
    "1. From_Currency Code": "USD",
    "5. Exchange Rate": "156.42"
  }
}
```

#### **エラーが出る場合:**
```json
{
  "Error Message": "Invalid API call"
}
```
→ APIキーを再取得: https://www.alphavantage.co/support/#api-key

---

### **原因3: レート制限超過**

#### **症状:**
```json
{
  "Note": "Thank you for using Alpha Vantage! Please consider spreading out your free API requests more sparingly (1 request per second)."
}
```

#### **対策:**
- キャッシュ時間をさらに延長（2時間、6時間、24時間）
- 開発環境で固定値を使用

---

### **原因4: Vercelのキャッシュが残っている**

#### **対策:**
```
Vercelダッシュボード
→ Deployments
→ 最新のデプロイ
→ ⋯ → Redeploy
```

---

## 🎯 **推奨デバッグ手順**

### **1. Vercel環境変数を確認（最優先）**
```
Settings → Environment Variables → ALPHA_VANTAGE_API_KEY
```

### **2. Vercelログを確認**
```
Deployments → Functions → /api/dashboard/market
```

### **3. 環境変数を追加/修正した場合は必ずRedeploy**
```
Deployments → 最新のデプロイ → ⋯ → Redeploy
```

### **4. ブラウザでハードリロード**
```
Cmd+Shift+R（Mac）/ Ctrl+Shift+R（Windows）
```

---

## 🔗 **関連ドキュメント**

- Alpha Vantage API設定: `docs/setup/Alpha-Vantage-API設定.md`
- Vercelログ確認方法: `docs/troubleshooting/Vercelログ確認方法.md`
