# OCRデバッグ手順

## 🔍 ブラウザのNetworkタブで確認する方法（推奨）

### ステップ1: ブラウザのDevToolsを開く

1. ブラウザで `http://localhost:3000` を開く
2. `F12` キーを押す（または `Command + Option + I` (Mac) / `Ctrl + Shift + I` (Windows)）
3. **「Network」タブ**をクリック

### ステップ2: OCR処理を実行

1. 名刺登録画面で画像をアップロード
2. Networkタブで以下のリクエストを探す：
   - **`ocr-business-card`** という名前のリクエスト

### ステップ3: リクエストの詳細を確認

1. `ocr-business-card` リクエストをクリック
2. **「Headers」タブ**を確認：
   - **Request URL**: `/api/ocr-business-card`
   - **Status Code**: `200` (成功) / `406` (エラー) / `500` (サーバーエラー)
   - **Request Headers**:
     - `Content-Type`: `multipart/form-data` であることを確認
     - `Accept`: `application/json, */*` が含まれているか確認

3. **「Response」タブ**を確認：
   - エラーメッセージが表示されているか確認
   - JSON形式のレスポンスが返ってきているか確認

4. **「Preview」タブ**を確認：
   - レスポンス内容が見やすく表示されます

## 📋 確認すべきポイント

### ✅ 正常な場合

- **Status Code**: `200 OK`
- **Response**: JSON形式でOCR結果が返ってくる
  ```json
  {
    "personName": "田中 一郎",
    "companyName": "株式会社...",
    ...
  }
  ```

### ❌ エラーの場合

- **Status Code**: `406` → Acceptヘッダーの問題
- **Status Code**: `401` → 認証エラー
- **Status Code**: `500` → サーバーエラー

## 🔧 開発サーバーのログを確認する方法

### 方法1: 現在のプロセスを確認

新しいターミナルを開いて、以下を実行：

```bash
cd /Users/eiichi/Documents/ai-consulting-zero
npm run dev
```

これで、ログがリアルタイムで表示されます。

### 方法2: 既存のプロセスを確認

開発サーバーが実行中の場合は、そのターミナルウィンドウを見つけてください。

## 📸 スクリーンショットを撮る

Networkタブで以下を撮影してください：
1. `ocr-business-card` リクエストの **Status Code**
2. **Response** タブの内容（エラーの場合）
3. **Headers** タブの **Request Headers**

これらの情報を共有していただければ、問題を特定できます。


