# OCR機能のトラブルシューティング

OCR機能が動作しない場合の確認手順です。

## 1. 環境変数の確認

まず、環境変数が正しく設定されているか確認します：

```bash
node scripts/test-ocr-env.js
```

成功すると、以下のように表示されます：
```
✅ GOOGLE_CLOUD_CREDENTIALS環境変数が設定されています
✅ 環境変数の形式は正しいです
```

## 2. Google Cloud Vision APIの有効化確認

### ステップ1: Google Cloud Consoleにアクセス
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクト「aiconsultingzero」を選択

### ステップ2: Cloud Vision APIが有効か確認
1. 左側のメニューから「APIとサービス」→「有効なAPI」を選択
2. 「Cloud Vision API」がリストに表示されているか確認
3. 表示されていない場合は、「APIとサービス」→「ライブラリ」から「Cloud Vision API」を検索して有効化

## 3. サービスアカウントの権限確認

### ステップ1: サービスアカウントの詳細を開く
1. Google Cloud Consoleで「IAMと管理」→「サービスアカウント」を選択
2. `vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com` をクリック

### ステップ2: 権限（ロール）を確認
サービスアカウントに以下のロールが付与されている必要があります：

**推奨ロール（検索して選択）:**
- 「Cloud Vision」で検索すると、以下のロールが表示されます：
  - `Cloud Vision API Client` (roles/cloudvision.client) - **推奨**
  - `Cloud Vision API User` (roles/vision.user) - もしあれば

**または、より広範囲な権限:**
- `Editor` (roles/editor) - 開発・テスト用（本番環境では非推奨）

### ステップ3: 権限を付与する（必要な場合）

**方法1: IAMページから（推奨）**
1. 「IAMと管理」→「IAM」を選択
2. `vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com` を検索
3. 行の右側の鉛筆アイコン（編集）をクリック
4. 「ロールを追加」をクリック
5. 検索ボックスに「**Cloud Vision**」と入力
6. 表示されるロールから以下を選択：
   - `Cloud Vision API Client` - **これが推奨**
   - または `Cloud Vision API User`（もし表示されれば）
7. 「保存」をクリック

**方法2: サービスアカウントの詳細ページから**
1. 「IAMと管理」→「サービスアカウント」を選択
2. `vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com` をクリック
3. 「権限」タブを選択
4. 「ロールを付与」をクリック
5. 検索ボックスに「**Cloud Vision**」と入力
6. `Cloud Vision API Client` を選択
7. 「保存」をクリック

**方法3: 一時的な解決策（開発・テスト用のみ）**
もし上記のロールが見つからない場合、一時的に `Editor` ロールを付与することもできます（本番環境では非推奨）：
1. 上記の手順で「ロールを追加」をクリック
2. 検索ボックスに「**Editor**」と入力
3. `Editor` を選択して保存

## 4. 開発サーバーのログを確認

OCR機能を使用する際、ターミナル（開発サーバーを実行しているターミナル）に以下のようなログが表示されます：

### 正常な場合:
```
=== OCR API Debug Info ===
Has credentials: Yes
Credentials length: 2403
✅ Google Cloud Vision API client initialized successfully
📸 画像をGoogle Cloud Vision APIに送信します...
✅ Vision API response received
📝 検出されたテキスト（最初の100文字）: ...
```

### エラーの場合:
```
❌ Vision client initialization error: ...
❌ Vision API error: ...
```

エラーメッセージに応じて対処してください。

## 5. よくあるエラーと対処法

### エラー: `PERMISSION_DENIED`
**原因:** サービスアカウントにCloud Vision APIの権限がない

**対処法:**
1. 上記の「3. サービスアカウントの権限確認」を参照
2. `Cloud Vision API User` ロールを付与

### エラー: `API not enabled`
**原因:** Cloud Vision APIが有効になっていない

**対処法:**
1. 上記の「2. Google Cloud Vision APIの有効化確認」を参照
2. Cloud Vision APIを有効化

### エラー: `Invalid credentials`
**原因:** 環境変数のJSON形式が正しくない、またはキーが無効

**対処法:**
1. 新しいサービスアカウントキーをダウンロード
2. `node scripts/setup-google-vision-env.js <新しいJSONファイル>` を実行
3. 開発サーバーを再起動

### エラー: `モックデータを使用します`
**原因:** 環境変数が設定されていない、またはAPI呼び出しに失敗

**対処法:**
1. `node scripts/test-ocr-env.js` で環境変数を確認
2. 開発サーバーを再起動
3. ブラウザのコンソールとターミナルのログを確認

## 6. ブラウザのコンソールを確認

1. ブラウザでアプリケーションを開く（F12で開発者ツールを開く）
2. 「Console」タブを選択
3. 名刺画像をアップロード
4. 以下のようなログが表示されます：

```
OCR APIを呼び出します...
OCR API response status: 200
OCR API result: { personName: "...", companyName: "..." }
```

エラーが表示されている場合は、そのメッセージを確認してください。

## 7. サービスアカウントキーの再生成（最終手段）

問題が解決しない場合、新しいサービスアカウントキーを生成してください：

1. Google Cloud Consoleで「IAMと管理」→「サービスアカウント」を選択
2. `vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com` をクリック
3. 「キー」タブを選択
4. 「キーを追加」→「新しいキーを作成」を選択
5. 「JSON」を選択して「作成」
6. ダウンロードしたJSONファイルを使用して環境変数を再設定：
   ```bash
   node scripts/setup-google-vision-env.js ~/Downloads/新しいキーファイル.json
   ```
7. 開発サーバーを再起動

## 確認チェックリスト

- [ ] 環境変数が正しく設定されている（`node scripts/test-ocr-env.js`）
- [ ] Cloud Vision APIが有効になっている
- [ ] サービスアカウントに `Cloud Vision API User` ロールが付与されている
- [ ] 開発サーバーを再起動した
- [ ] ブラウザのコンソールとターミナルのログを確認した

すべて確認しても動作しない場合は、ターミナルとブラウザのコンソールのエラーログを確認してください。

