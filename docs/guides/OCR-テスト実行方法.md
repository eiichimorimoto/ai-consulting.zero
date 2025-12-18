# OCRテスト実行方法

## 📋 サンプル名刺ファイルの準備

テストを実行するには、名刺の画像ファイルまたはPDFファイルが必要です。

### 方法1: 既存のファイルを使用

プロジェクト内の画像ファイルを使用してテストできます：

```bash
# 画像ファイルでテスト
npm run test-ocr ./public/placeholder.jpg

# PDFファイルでテスト
npm run test-ocr ./public/AI.pdf
```

### 方法2: 新しいサンプルファイルを追加

1. 名刺の画像ファイルまたはPDFファイルを `public/` ディレクトリに保存
   - 例: `public/sample-card.jpg` または `public/sample-card.pdf`

2. テストを実行：
```bash
npm run test-ocr ./public/sample-card.jpg
```

## 🧪 テスト実行

### 基本的な使用方法

```bash
npm run test-ocr <ファイルパス>
```

### 実行例

```bash
# 絶対パスで指定
npm run test-ocr /Users/eiichi/Documents/ai-consulting-zero/public/sample.jpg

# 相対パスで指定（プロジェクトルートから）
npm run test-ocr ./public/sample.jpg
```

## 📊 期待される出力

正常に動作する場合、以下のような出力が表示されます：

```
🧪 OCRテストを開始します...
📁 画像ファイル: ./public/sample.jpg
✅ APIキーが設定されています
✅ 画像をBase64に変換しました
   Base64サイズ: 12345 文字
📄 MIMEタイプ: image/jpeg
🔗 Anthropic Claude APIに接続中...
✅ OCR処理が完了しました！
⏱️  処理時間: 2345 ms

📋 抽出された情報:
==========================================
{
  "fullName": "伊藤 志野",
  "personName": "伊藤 志野",
  "department": "社会インフラ事業本部・東日本営業部・東海営業室",
  "companyName": "三井情報株式会社",
  "email": "ito-shino@mki.co.jp",
  "phone": "052-533-6831",
  "postalCode": "450-0003",
  "address": "愛知県名古屋市中村区名駅1-16-21 名古屋三井ビル4F",
  "website": "https://www.mki.co.jp/"
}
==========================================

✅ テスト完了
```

## ⚠️ 注意事項

- テストを実行する前に、`.env.local` に `ANTHROPIC_API_KEY` が設定されていることを確認してください
- 大きなファイル（10MB以上）は処理に時間がかかる場合があります
- PDFファイルも対応していますが、名刺がスキャンされたPDFを推奨します


