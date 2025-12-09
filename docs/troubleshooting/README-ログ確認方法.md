# サーバーログの確認方法

## 📋 サーバーログとは？

Next.jsの開発サーバーを起動した際に、ターミナルに表示されるメッセージのことです。
OCR処理を実行すると、このログに詳細な情報が表示されます。

## 🔍 ログを確認する手順

### ステップ1: 開発サーバーが実行されているか確認

1. **ターミナルアプリケーションを開く**
   - Macの場合: `Command + Space` でSpotlightを開き、「ターミナル」と入力してEnter
   - または、`アプリケーション` → `ユーティリティ` → `ターミナル`

2. **開発サーバーが起動しているウィンドウを探す**
   - `npm run dev` または `next dev` を実行したターミナルウィンドウを探してください
   - そのウィンドウに `- Local: http://localhost:3000` のようなメッセージが表示されているはずです

### ステップ2: OCR処理を実行

1. ブラウザで `http://localhost:3000` を開く
2. 名刺登録画面で画像をアップロード
3. **すぐにターミナルウィンドウに注目する**

### ステップ3: ログを確認

ターミナルに以下のようなログが表示されます：

```
🚀 OCR API Route called at: 2024-01-XX...
📥 リクエスト受信: { ... }
🔍 環境変数チェック:
  GOOGLE_CLOUD_CREDENTIALS exists: true
=== OCR API Debug Info ===
Has credentials: Yes
✅ Google Cloud Vision API client initialized successfully
📸 画像をGoogle Cloud Vision APIに送信します...
```

## ⚠️ もしログが見つからない場合

### 開発サーバーがバックグラウンドで実行されている場合

新しいターミナルウィンドウを開いて、以下のコマンドでログを確認できます：

```bash
cd /Users/eiichi/Documents/ai-consulting-app
tail -f .next/trace  # ログファイルがあれば
```

### 開発サーバーを再起動する

新しいターミナルウィンドウで：

```bash
cd /Users/eiichi/Documents/ai-consulting-app
npm run dev
```

これで、リアルタイムでログを確認できます。

## 📸 ログのスクリーンショット

OCR処理を実行した際に、ターミナルに表示されるログのスクリーンショットを撮って共有してください。
特に以下のメッセージを探してください：

- `✅ Google Cloud Vision API client initialized successfully` → APIクライアントが正常に初期化された
- `📸 画像をGoogle Cloud Vision APIに送信します...` → APIへの送信を試みている
- `✅ Vision API response received` → APIから応答が返ってきた
- `❌ Vision API error:` → エラーが発生した（詳細を確認）

## 💡 ヒント

- ターミナルウィンドウはできるだけ大きく表示すると、ログが見やすくなります
- ログが多すぎる場合は、`Ctrl + L` で画面をクリアしてから再度OCR処理を実行してください

