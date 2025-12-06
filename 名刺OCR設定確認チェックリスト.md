# 名刺OCR設定確認チェックリスト

## ⚠️ 現在の問題

環境変数の確認結果から、以下の問題が判明しました：

1. **`project_id`が `your-project-id` になっている**
   - これはプレースホルダーです
   - 実際のGoogle CloudプロジェクトIDに置き換える必要があります

2. **`private_key`が58文字しかない**
   - 実際のprivate_keyは通常2000文字以上です
   - これは不完全な値です

## ✅ 解決手順

### ステップ1: Google Cloud Consoleで認証情報を確認

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択
3. 「IAMと管理」→「サービスアカウント」を開く
4. 作成したサービスアカウント（例: `vision-ocr-service@...`）を確認

### ステップ2: サービスアカウントキーをダウンロード

1. サービスアカウントをクリック
2. 「キー」タブを開く
3. 「キーを追加」→「新しいキーを作成」
4. キーのタイプ: **JSON** を選択
5. 「作成」をクリック
6. JSONファイルがダウンロードされる

### ステップ3: 環境変数を設定

#### 方法A: スクリプトを使用（推奨）

```bash
# ダウンロードしたJSONファイルのパスを指定
node scripts/setup-google-vision-env.js ~/Downloads/your-service-account-key.json
```

#### 方法B: 手動で設定

1. ダウンロードしたJSONファイルをテキストエディタで開く
2. すべての内容をコピー（`Cmd+A`, `Cmd+C`）
3. `.env.local` ファイルを開く
4. `GOOGLE_CLOUD_CREDENTIALS` の行を見つける
5. 以下の形式で置き換える：

```env
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"実際のプロジェクトID",...}'
```

**重要**: 
- JSON全体をシングルクォート `'...'` で囲む
- 改行を削除して1行にする
- オンラインツール（https://jsonformatter.org/json-minify）を使用すると便利

### ステップ4: 設定を確認

```bash
node scripts/check-ocr-env.js
```

以下のような出力が表示されればOK：

```
✅ Project ID: 実際のプロジェクトID（your-project-idではない）
✅ private_key: 長さ: 2000文字以上
```

### ステップ5: 開発サーバーを再起動

```bash
npm run dev
```

### ステップ6: テスト

1. プロフィール登録画面を開く
2. 名刺画像をアップロード
3. ターミナルのログを確認

**正常なログの例**:
```
🔑 認証情報の検証:
  Project ID: 実際のプロジェクトID
  Client Email: vision-ocr-service@...
✅ ImageAnnotatorClient を作成しました
📸 画像をGoogle Cloud Vision APIに送信します...
✅ Vision API response received
```

## 🔍 よくある問題と解決方法

### 問題1: "PERMISSION_DENIED" エラー

**原因**: サービスアカウントに権限が不足している

**解決方法**:
1. Google Cloud Consoleで「IAMと管理」→「IAM」を開く
2. サービスアカウントを検索
3. 「ロールを追加」をクリック
4. 「Cloud Vision AI サービス エージェント」ロールを追加
5. 「保存」をクリック

### 問題2: "API not enabled" エラー

**原因**: Cloud Vision APIが有効になっていない

**解決方法**:
1. Google Cloud Consoleで「APIとサービス」→「ライブラリ」を開く
2. 「Cloud Vision API」を検索
3. 「有効にする」をクリック

### 問題3: モックデータが返される

**原因**: API呼び出しが失敗している

**確認項目**:
1. `.env.local` の `GOOGLE_CLOUD_CREDENTIALS` が正しく設定されているか
2. ターミナルのエラーログを確認
3. `node scripts/check-ocr-env.js` で環境変数を確認

## 📝 設定確認コマンド

定期的に以下のコマンドで設定を確認できます：

```bash
node scripts/check-ocr-env.js
```

## 🔗 参考リンク

- [Google Cloud Vision API セットアップガイド](./README-GOOGLE-VISION-SETUP.md)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Cloud Vision API 料金](https://cloud.google.com/vision/pricing)

