# OpenWeatherMap API 設定確認方法

> 作成: 2026-01-09

---

## 📋 Vercel環境変数設定手順

### 1. Vercel Dashboardにアクセス

```
https://vercel.com/your-project/settings/environment-variables
```

### 2. 環境変数を追加

| 項目 | 値 |
|------|-----|
| Name | `OPENWEATHERMAP_API_KEY` |
| Value | （取得したAPIキー） |
| Environment | Production, Preview, Development（全てチェック） |

### 3. 保存 → Redeploy

1. 「Save」ボタンをクリック
2. 「Deployments」タブに移動
3. 最新のデプロイの「...」メニューから「Redeploy」を選択

---

## ✅ 動作確認方法

### 1. ローカル環境でテスト

```bash
node -e "
const apiKey = require('fs').readFileSync('.env.local', 'utf8').match(/OPENWEATHERMAP_API_KEY=([^\n]+)/)?.[1]?.trim();
if (!apiKey) {
  console.log('❌ APIキーが設定されていません');
  process.exit(1);
}
console.log('✅ APIキー確認:', { exists: true, prefix: apiKey.substring(0, 4), length: apiKey.length });

// 東京の座標でテスト
const lat = 35.6762;
const lon = 139.6503;
const url = \`https://api.openweathermap.org/data/2.5/weather?lat=\${lat}&lon=\${lon}&appid=\${apiKey}&units=metric&lang=ja\`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log('📊 APIレスポンス:', JSON.stringify(data, null, 2));
    if (data.main && data.main.temp) {
      console.log('✅ 天気データ取得成功:');
      console.log('  気温:', data.main.temp, '°C');
      console.log('  天気:', data.weather[0].description);
      console.log('  場所:', data.name);
    } else if (data.cod === '401') {
      console.log('❌ APIキーが無効です');
    } else if (data.message) {
      console.log('❌ APIエラー:', data.message);
    }
  })
  .catch(err => console.error('❌ ネットワークエラー:', err.message));
"
```

**期待される出力:**
```
✅ APIキー確認: { exists: true, prefix: 'xxxx', length: 32 }
📊 APIレスポンス: { ... }
✅ 天気データ取得成功:
  気温: 8.5 °C
  天気: 晴天
  場所: Tokyo
```

---

### 2. Vercelデプロイ後の確認

#### A. ダッシュボードで確認

1. https://ai-consulting-zero.vercel.app/dashboard にアクセス
2. 「エリア情報」セクションを確認
3. 「現在の天気」カードを確認

**期待される表示:**
```
現在の天気
📍 東京都千代田区  🕐 1月9日 23:15

☀️ 8°C
晴れ / 配送影響なし

時間別予報: 23:00, 2:00, 5:00, 8:00, 11:00, 14:00
週間天気: 日〜土（7日分）
```

#### B. サーバーログで確認

Vercel Dashboard → Deployments → 最新デプロイ → Function Logs

**確認すべきログ:**
```
💱 Alpha Vantage API: マーケットデータ取得開始...
✅ 為替レート: USD/JPY = 156.69円
✅ 日経平均: 53898円

🌍 天気取得: 東京都千代田区 (lat=35.6762, lon=139.6503)
✅ 為替レート: USD/JPY = 156.69円 (2026-01-08 13:20:43)
```

**エラーの場合:**
```
❌ OPENWEATHERMAP_API_KEY が設定されていません
または
❌ OpenWeatherMap API エラー: 401 Unauthorized
```

---

## 🔍 トラブルシューティング

### エラー: `401 Unauthorized`

**原因:**
- APIキーが無効
- APIキーが有効化されていない

**対策:**
1. OpenWeatherMapのメール確認（確認メール）
2. メール内のリンクをクリックして有効化
3. 数分待ってから再試行

---

### エラー: `APIキーが設定されていません`

**原因:**
- Vercel環境変数が設定されていない
- 環境変数名が間違っている

**対策:**
1. 環境変数名を確認: `OPENWEATHERMAP_API_KEY`（大文字小文字注意）
2. Value欄にAPIキーが正しく入力されているか確認
3. Redeploy実行

---

### データが表示されない

**原因:**
- キャッシュが残っている
- APIレスポンスが遅い

**対策:**
1. ブラウザのリロード（Ctrl+Shift+R / Cmd+Shift+R）
2. ダッシュボードの「更新」ボタンをクリック
3. 数分待ってから再確認

---

## 📊 APIキー情報

### OpenWeatherMap

```
無料プラン:
- 60 calls/分
- 1,000,000 calls/月
- 現在の天気
- 5日間/3時間ごとの予報
```

**取得場所:**
```
https://openweathermap.org/appid
```

**API仕様:**
```
Current Weather:
https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric&lang=ja

5 Day Forecast:
https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API_KEY}&units=metric&lang=ja
```

---

## ✅ 設定完了のチェックリスト

- [ ] APIキーを取得
- [ ] メールで有効化確認
- [ ] `.env.local`に設定（ローカル）
- [ ] Vercel環境変数に設定
- [ ] Redeploy実行
- [ ] ダッシュボードで天気表示確認
- [ ] 気温が実データで表示
- [ ] 週間天気が表示
- [ ] 時間別予報が表示

---

## 🎯 期待される動作

### ダッシュボード表示

```
現在の天気
📍 東京都千代田区  🕐 1月9日 23:15

☀️ 8°C
晴れ / 配送影響なし

[時間別予報]
23:00: ☀️ 8°C
2:00: 🌙 6°C
5:00: 🌙 5°C
...

[週間天気]
日 1/12: ☀️ 10°C
月 1/13: ⛅ 9°C
火 1/14: ☁️ 7°C
...
```

### デバッグ情報

「ⓘ」ボタンをクリック:
```json
{
  "apiSource": "OpenWeatherMap",
  "location": "東京都千代田区",
  "timestamp": "2026-01-09T14:15:00.000Z",
  "extractedTemp": 8,
  "weatherMain": "Clear",
  "weatherDescription": "晴天"
}
```

---

## 📞 サポート

問題が解決しない場合:

1. Vercel Function Logsを確認
2. ブラウザのコンソールを確認（F12）
3. APIキーの有効性を確認
4. 環境変数名を再確認

---

**設定完了後、正確な天気データがリアルタイムで表示されます！**
