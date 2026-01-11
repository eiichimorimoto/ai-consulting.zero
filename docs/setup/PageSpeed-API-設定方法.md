# Google PageSpeed Insights API 設定方法

## 📋 概要

Webサイト分析機能で使用するGoogle PageSpeed Insights APIの設定方法です。

## 🔑 APIキーの取得方法

### ステップ1: Google Cloud Consoleにアクセス

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）

### ステップ2: PageSpeed Insights APIを有効化

1. 「APIとサービス」→「ライブラリ」を開く
2. 「PageSpeed Insights API」を検索
3. 「有効にする」をクリック

### ステップ3: APIキーを作成

1. 「APIとサービス」→「認証情報」を開く
2. 「認証情報を作成」→「APIキー」を選択
3. 作成されたAPIキーをコピー

### ステップ4: APIキーの制限を設定（推奨）

1. 作成したAPIキーをクリック
2. 「APIキーの制限」で「PageSpeed Insights API」のみを許可
3. 「アプリケーションの制限」で必要に応じて制限を設定
4. 「保存」をクリック

## 🔧 環境変数の設定

### ローカル開発環境

`.env.local`ファイルに以下を追加：

```bash
GOOGLE_PAGESPEED_API_KEY=your_api_key_here
```

### 本番環境（Vercel）

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」を開く
4. 以下を追加：
   - **Name**: `GOOGLE_PAGESPEED_API_KEY`
   - **Value**: 取得したAPIキー
   - **Environment**: Production, Preview, Development すべてにチェック
5. 「Save」をクリック

## ✅ 設定確認

設定が正しく行われているか確認するには：

1. ブラウザで `/api/test-env` にアクセス
2. `hasKey: true` が表示されれば設定成功

または、ターミナルで：

```bash
# ローカル環境の場合
echo $GOOGLE_PAGESPEED_API_KEY

# Next.jsアプリケーション内で確認
node -e "console.log(process.env.GOOGLE_PAGESPEED_API_KEY ? '設定済み' : '未設定')"
```

## ⚠️ 注意事項

- APIキーは**絶対に**Gitにコミットしないでください
- `.env.local`は`.gitignore`に含まれていることを確認してください
- 本番環境では必ずAPIキーの制限を設定してください
- 無料枠には1日あたりのリクエスト数に制限があります

## 🔍 トラブルシューティング

### エラー: "PageSpeed APIキーが設定されていません"

**原因**: 環境変数が正しく設定されていない

**解決方法**:
1. `.env.local`ファイルに`GOOGLE_PAGESPEED_API_KEY`が設定されているか確認
2. サーバーを再起動（環境変数の変更は再起動が必要）
3. 本番環境の場合は、Vercelの環境変数を確認

### エラー: "PageSpeed API error: 403"

**原因**: APIキーが無効、またはAPIが有効化されていない

**解決方法**:
1. Google Cloud ConsoleでPageSpeed Insights APIが有効になっているか確認
2. APIキーが正しくコピーされているか確認
3. APIキーの制限設定を確認

### エラー: "PageSpeed API error: 429"

**原因**: APIの利用制限（クォータ）に達している

**解決方法**:
1. Google Cloud Consoleでクォータを確認
2. しばらく時間をおいてから再度試行
3. 必要に応じて有料プランにアップグレード

## 📚 参考リンク

- [PageSpeed Insights API ドキュメント](https://developers.google.com/speed/docs/insights/v5/get-started)
- [Google Cloud Console](https://console.cloud.google.com/)
- [APIキーのベストプラクティス](https://cloud.google.com/docs/authentication/api-keys)
