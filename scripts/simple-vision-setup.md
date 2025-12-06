# Cloud Vision API 設定 - シンプル手順

## 前提条件の確認

✅ 以下は既に完了しているはずです：
- 環境変数（GOOGLE_CLOUD_CREDENTIALS）の設定
- Cloud Vision APIの有効化
- サービスアカウントの作成

## 最も簡単な方法：プロジェクトのオーナーに依頼

もしプロジェクトのオーナー権限がない場合、**オーナーに依頼するのが最も確実**です。

### 依頼内容

以下のメッセージをプロジェクトのオーナーに送ってください：

```
【依頼内容】
サービスアカウントにCloud Vision APIの権限を付与してください。

サービスアカウント: vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com
ロール: roles/cloudvision.user （または roles/editor）

実行コマンド（gcloud CLI使用時）:
gcloud projects add-iam-policy-binding aiconsultingzero \
  --member="serviceAccount:vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com" \
  --role="roles/cloudvision.user"
```

---

## 自分で設定する場合（オーナー権限がある場合）

### 方法A: Google Cloud Consoleから（推奨）

1. **IAMページに移動**
   - [Google Cloud Console](https://console.cloud.google.com/) にアクセス
   - プロジェクト「aiconsultingzero」を選択
   - 左側メニューから「IAMと管理」→「IAM」を選択

2. **プリンシパルを追加**
   - ページ上部の「**プリンシパルを追加**」ボタンをクリック
   - 「新しいプリンシパル」欄に以下を入力：
     ```
     vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com
     ```

3. **ロールを選択**
   - 「ロールを選択」の検索ボックスに「**vision**」と入力
   - 表示されるロールから以下を選択（見つかる場合）：
     - 「Cloud Vision API ユーザー」
     - 「Cloud Vision API Client」
   - **見つからない場合**は「**Editor**」を検索して選択（開発・テスト用）

4. **保存**
   - 「保存」ボタンをクリック

### 方法B: gcloudコマンドから（ターミナル使用）

```bash
# Cloud Vision API ユーザーロールを付与
gcloud projects add-iam-policy-binding aiconsultingzero \
  --member="serviceAccount:vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com" \
  --role="roles/cloudvision.user"
```

もし上記のロールが見つからない場合：
```bash
# Editorロールを付与（開発・テスト用）
gcloud projects add-iam-policy-binding aiconsultingzero \
  --member="serviceAccount:vision-ocr-service-80@aiconsultingzero.iam.gserviceaccount.com" \
  --role="roles/editor"
```

---

## 設定後の確認

1. **5-10分待つ**（権限の反映に時間がかかる場合があります）

2. **開発サーバーを再起動**
   ```bash
   npm run dev
   ```

3. **名刺画像をアップロードしてテスト**

4. **ターミナルのログを確認**
   ```
   ✅ Google Cloud Vision API client initialized successfully
   📸 画像をGoogle Cloud Vision APIに送信します...
   ✅ Vision API response received
   ```

---

## トラブルシューティング

### ロールが見つからない場合
- プロジェクトのオーナーに依頼するのが最も確実です
- または、gcloudコマンドを使用（オーナー権限が必要）

### 権限を付与したのにエラーが出る場合
- 5-10分待ってから再度試す
- 開発サーバーを再起動
- ブラウザのキャッシュをクリア

---

## まとめ

**最も簡単な方法**: プロジェクトのオーナーに依頼する

**自分で設定する場合**: IAMページから「プリンシパルを追加」→「vision」で検索→ロールを選択→保存



