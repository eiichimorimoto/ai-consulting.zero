# Cloud Vision API 権限設定の詳細手順

## 問題: 「Cloud Vision API User」ロールが見つからない

Google Cloud Consoleで「Cloud Vision API User」という名前のロールが見つからない場合、以下の手順で正しいロールを設定してください。

## 解決方法

### ステップ1: IAMページにアクセス

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクト「aiconsultingzero」が選択されていることを確認
3. 左側のメニューから「**IAMと管理**」→「**IAM**」を選択

### ステップ2: サービスアカウントを検索

1. ページ上部の検索ボックスに以下を入力：
   ```
   vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com
   ```
2. 該当するサービスアカウントが表示されます

### ステップ3: ロールを追加

1. サービスアカウントの行の右側にある**鉛筆アイコン（編集）**をクリック
2. 「**ロールを追加**」ボタンをクリック
3. 検索ボックスに「**Cloud Vision**」と入力（完全一致ではなく、部分一致で検索）
4. 以下のロールが表示されるはずです：
   - **`Cloud Vision API Client`** ← **これを選択してください**
   - `Cloud Vision API User`（もし表示されれば）

### ステップ4: ロールが見つからない場合の対処法

もし「Cloud Vision」で検索してもロールが見つからない場合：

#### オプションA: APIを有効化する
1. 「APIとサービス」→「ライブラリ」を選択
2. 「Cloud Vision API」を検索
3. 「有効にする」をクリック
4. 再度、上記のステップ3を試してください

#### オプションB: 一時的にEditorロールを付与（開発・テスト用のみ）
**注意**: これは開発・テスト環境でのみ使用してください。本番環境では使用しないでください。

1. 上記のステップ3で、検索ボックスに「**Editor**」と入力
2. 「**Editor**」ロールを選択
3. 「保存」をクリック

#### オプションC: カスタムロールを作成
より細かい権限制御が必要な場合：

1. 「IAMと管理」→「ロール」を選択
2. 「ロールを作成」をクリック
3. 以下の権限を追加：
   - `cloudvision.images.annotate`
   - `cloudvision.images.detectText`
4. ロール名を「Cloud Vision OCR User」などに設定
5. 「作成」をクリック
6. サービスアカウントにこのカスタムロールを付与

## 確認方法

権限を付与した後、以下のコマンドで確認できます：

```bash
# 開発サーバーを再起動
npm run dev
```

その後、名刺画像をアップロードして、ターミナルに以下のログが表示されることを確認：

```
✅ Google Cloud Vision API client initialized successfully
📸 画像をGoogle Cloud Vision APIに送信します...
✅ Vision API response received
```

エラーが表示される場合は、ブラウザのコンソール（F12）とターミナルのログを確認してください。

## よくある質問

**Q: 「Cloud Vision API Client」も見つかりません**
A: まず、Cloud Vision APIが有効になっているか確認してください。「APIとサービス」→「有効なAPI」で「Cloud Vision API」が表示されているか確認します。

**Q: 権限を付与したのに、まだエラーが出ます**
A: 権限の反映には数分かかる場合があります。5-10分待ってから再度試してください。また、開発サーバーを再起動してください。

**Q: どのロールが最適ですか？**
A: 通常は「Cloud Vision API Client」が最適です。これが利用できない場合のみ、一時的に「Editor」を使用してください（開発環境のみ）。




