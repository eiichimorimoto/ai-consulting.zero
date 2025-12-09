# Anthropic Claude API 設定手順

## 📋 概要

名刺OCR機能でAnthropic Claude APIを使用して名刺画像から情報を抽出します。

## 🔑 APIキーの取得

1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. アカウントを作成またはログイン
3. 「API Keys」セクションから新しいAPIキーを作成
4. APIキーをコピー（表示されるのは一度だけなので注意）

## ⚙️ 環境変数の設定

`.env.local` ファイルに以下の環境変数を追加してください：

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 設定方法

1. プロジェクトルートの `.env.local` ファイルを開く
2. 以下の行を追加（既存の内容は残してください）：

```bash
# Anthropic Claude API
ANTHROPIC_API_KEY=your-api-key-here
```

3. ファイルを保存
4. **開発サーバーを再起動**してください（重要）

## 🧪 動作確認

1. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. ブラウザで `http://localhost:3000` を開く
3. 名刺登録画面で名刺画像をアップロード
4. OCR処理が正常に動作することを確認

## 📝 抽出される情報

以下の情報が名刺画像から抽出されます：

- **personName**: 氏名（漢字）
- **personNameKana**: 氏名（カタカナ）
- **position**: 役職（例: 営業部長、代表取締役）
- **department**: 部署（例: 営業部、開発部）
- **companyName**: 会社名
- **email**: メールアドレス
- **phone**: 固定電話番号
- **mobile**: 携帯電話番号
- **postalCode**: 郵便番号（例: 150-0001）
- **address**: 住所
- **website**: ウェブサイトURL

## 🔧 トラブルシューティング

### APIキーが設定されていない場合

- **症状**: モックデータが返される
- **解決策**: `.env.local` に `ANTHROPIC_API_KEY` を設定し、開発サーバーを再起動

### 認証エラー（401）が発生する場合

- **症状**: "authentication" エラー
- **解決策**: APIキーが正しいか確認してください

### レート制限エラー（429）が発生する場合

- **症状**: "rate limit" エラー
- **解決策**: しばらく待ってから再度お試しください

### ネットワークエラーが発生する場合

- **症状**: "network" または "ECONNREFUSED" エラー
- **解決策**: インターネット接続を確認してください

## 💡 技術的な詳細

- **使用モデル**: `claude-3-5-sonnet-20241022`
- **データ検証**: Zodスキーマを使用して構造化データを検証
- **画像形式**: JPEG, PNG, GIF, WebP（最大10MB）


