# Cloud Vision API 権限設定 - 詳細ステップバイステップ

## 現在の状況
サービスアカウントの一覧ページにいて、編集アイコンが見つからない場合の手順です。

## 方法1: IAMページから設定（推奨）

### ステップ1: IAMページに移動
1. Google Cloud Consoleの左側メニューから「**IAMと管理**」をクリック
2. 「**IAM**」をクリック（「サービスアカウント」ではありません）

### ステップ2: サービスアカウントを検索
1. ページ上部の検索ボックスに以下を入力：
   ```
   vision-ocr-service-80
   ```
   または
   ```
   vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com
   ```

### ステップ3: ロールを追加
1. 検索結果でサービスアカウントが表示されます
2. その行の**右端**に「**ロールを追加**」ボタンまたは「**編集**」アイコンがあります
3. クリックします
4. 「**ロールを追加**」をクリック
5. 検索ボックスに「**Cloud Vision**」と入力
6. 「**Cloud Vision API Client**」を選択（もし表示されれば）
7. 「**保存**」をクリック

---

## 方法2: サービスアカウントの詳細ページから設定

### ステップ1: サービスアカウントの詳細を開く
1. 「IAMと管理」→「**サービスアカウント**」を選択
2. `vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com` を**クリック**（行全体をクリック）

### ステップ2: 権限タブを選択
1. サービスアカウントの詳細ページが開きます
2. 上部のタブから「**権限**」タブをクリック

### ステップ3: ロールを付与
1. 「**ロールを付与**」ボタンをクリック
2. 「プリンシパル」欄に、サービスアカウントのメールアドレスが自動入力されていることを確認：
   ```
   vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com
   ```
3. 「ロールを選択」の検索ボックスに「**Cloud Vision**」と入力
4. 「**Cloud Vision API Client**」を選択
5. 「**保存**」をクリック

---

## 方法3: プロジェクトレベルでAPIを有効化（最も簡単）

### ステップ1: APIライブラリに移動
1. 左側メニューから「**APIとサービス**」→「**ライブラリ**」を選択

### ステップ2: Cloud Vision APIを検索
1. 検索ボックスに「**Cloud Vision API**」と入力
2. 「**Cloud Vision API**」をクリック

### ステップ3: APIを有効化
1. 「**有効にする**」ボタンをクリック
2. 数分待ちます（有効化処理が完了するまで）

### ステップ4: サービスアカウントにEditorロールを付与（開発用）
1. 「IAMと管理」→「IAM」を選択
2. ページ上部の「**プリンシパルを追加**」ボタンをクリック
3. 「新しいプリンシパル」欄に以下を入力：
   ```
   vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com
   ```
4. 「ロールを選択」で「**Editor**」を検索して選択
5. 「**保存**」をクリック

**注意**: Editorロールは広範囲な権限を持ちます。開発・テスト環境でのみ使用してください。

---

## 方法4: gcloudコマンドを使用（ターミナルから）

ターミナルから直接設定する方法です。

### ステップ1: gcloud CLIがインストールされているか確認
```bash
gcloud --version
```

インストールされていない場合は、[Google Cloud SDK](https://cloud.google.com/sdk/docs/install)をインストールしてください。

### ステップ2: 認証とプロジェクト設定
```bash
gcloud auth login
gcloud config set project aiconsultingzero
```

### ステップ3: サービスアカウントにロールを付与
```bash
# Cloud Vision API Clientロールを付与
gcloud projects add-iam-policy-binding aiconsultingzero \
  --member="serviceAccount:vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com" \
  --role="roles/cloudvision.client"
```

もし上記のロールが見つからない場合：
```bash
# Editorロールを付与（開発用）
gcloud projects add-iam-policy-binding aiconsultingzero \
  --member="serviceAccount:vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com" \
  --role="roles/editor"
```

---

## 確認方法

どの方法を使用しても、設定後は以下を確認してください：

1. **5-10分待つ**（権限の反映に時間がかかる場合があります）

2. **開発サーバーを再起動**：
   ```bash
   npm run dev
   ```

3. **名刺画像をアップロードしてテスト**

4. **ターミナルのログを確認**：
   ```
   ✅ Google Cloud Vision API client initialized successfully
   📸 画像をGoogle Cloud Vision APIに送信します...
   ✅ Vision API response received
   ```

---

## トラブルシューティング

### Q: どの方法を選べばいいですか？
A: 
- **方法1（IAMページ）**が最も標準的です
- **方法3（API有効化 + Editorロール）**が最も簡単です（開発環境の場合）
- **方法4（gcloudコマンド）**は自動化したい場合に便利です

### Q: ロールが見つかりません
A: まず「方法3」でCloud Vision APIを有効化してください。その後、再度ロールを検索してください。

### Q: 権限を付与したのにエラーが出ます
A: 
1. 5-10分待ってから再度試してください
2. 開発サーバーを再起動してください
3. ブラウザのキャッシュをクリアしてください

### Q: Editorロールは安全ですか？
A: Editorロールは広範囲な権限を持ちます。開発・テスト環境でのみ使用し、本番環境では使用しないでください。本番環境では、より限定的なロール（Cloud Vision API Clientなど）を使用してください。




