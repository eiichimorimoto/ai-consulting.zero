# OpenWeatherMap API 設定ガイド

## 📝 APIキーの取得（5分）

### 1. アカウント作成
https://home.openweathermap.org/users/sign_up

- Email
- Username
- Password

を入力して「Create Account」

### 2. メール認証
受信したメールの「Verify your email」をクリック

### 3. APIキーを取得
https://home.openweathermap.org/api_keys

- デフォルトで1つAPIキーが生成されています
- コピーしてください

### 4. 環境変数に追加

#### ローカル（`.env.local`）
```bash
OPENWEATHERMAP_API_KEY=あなたのAPIキー
```

#### Vercel
1. https://vercel.com/your-project/settings/environment-variables
2. 「Add New」をクリック
3. Name: `OPENWEATHERMAP_API_KEY`
4. Value: あなたのAPIキー
5. 「Save」

### 5. 注意事項
- APIキーが有効になるまで**最大2時間**かかる場合があります
- 無料プラン: 60 calls/minute, 1,000,000 calls/month
- 十分な量です

## 📊 APIの仕様

### 現在の天気
```
https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API key}&lang=ja&units=metric
```

### 5日間予報
```
https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API key}&lang=ja&units=metric
```

### 気象警報
```
https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&appid={API key}&lang=ja&units=metric
```

### 主要都市の座標
- 東京都千代田区: lat=35.6940, lon=139.7536
- 大阪府大阪市: lat=34.6937, lon=135.5023
- 愛知県名古屋市: lat=35.1815, lon=136.9066
