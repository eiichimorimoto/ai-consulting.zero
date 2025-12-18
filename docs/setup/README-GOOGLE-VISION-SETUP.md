# Google Cloud Vision API セットアップガイド

## 1. Google Cloud プロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. プロジェクト名を記録しておく

## 2. Cloud Vision API の有効化

1. Google Cloud Console で「APIとサービス」→「ライブラリ」を開く
2. 「Cloud Vision API」を検索
3. 「有効にする」をクリック

## 3. サービスアカウントの作成

1. 「IAMと管理」→「サービスアカウント」を開く
2. 「サービスアカウントを作成」をクリック
3. 以下の情報を入力：
   - **サービスアカウント名**: `vision-ocr-service`
   - **説明**: `名刺OCR用のサービスアカウント`
4. 「作成して続行」をクリック
5. ロールを選択：
   - **Cloud Vision API User** を追加
6. 「完了」をクリック

## 4. サービスアカウントキーの作成

1. 作成したサービスアカウントをクリック
2. 「キー」タブを開く
3. 「キーを追加」→「新しいキーを作成」を選択
4. キーのタイプ: **JSON** を選択
5. 「作成」をクリック
6. JSONファイルがダウンロードされる（`xxxxx-xxxxx-xxxxx.json`）

## 5. 環境変数の設定

### 開発環境（`.env.local`）

#### ステップ1: ダウンロードしたJSONファイルを開く

1. ダウンロードフォルダ（通常は `~/Downloads`）を開く
2. ダウンロードしたJSONファイルを見つける（例: `ai-consulting-ocr-xxxxx-xxxxx.json`）
3. テキストエディタ（メモ帳、VS Code、TextEditなど）で開く

#### ステップ2: JSONファイルの内容を確認

JSONファイルを開くと、以下のような形式の内容が表示されます：

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "vision-ocr-service@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/vision-ocr-service%40your-project-id.iam.gserviceaccount.com"
}
```

#### ステップ3: JSONファイルの内容をコピー

1. **すべての内容を選択**（`Cmd+A` または `Ctrl+A`）
2. **コピー**（`Cmd+C` または `Ctrl+C`）

#### ステップ4: `.env.local` ファイルを開く

1. プロジェクトのルートディレクトリ（`ai-consulting-zero`）に移動
2. `.env.local` ファイルをテキストエディタで開く
   - ファイルが見つからない場合は、新規作成してください

#### ステップ5: 環境変数を追加

`.env.local` ファイルの最後に、以下の形式で追加します：

```env
# Google Cloud Vision API (名刺OCR用)
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"your-project-id","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"vision-ocr-service@your-project-id.iam.gserviceaccount.com","client_id":"123456789012345678901","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/vision-ocr-service%40your-project-id.iam.gserviceaccount.com"}'
```

#### ステップ6: 正しい形式で設定する方法（重要）

**方法A: 手動で設定する場合**

1. `.env.local` に以下を入力：
   ```env
   GOOGLE_CLOUD_CREDENTIALS='
   ```

2. コピーしたJSONファイルの内容をそのまま貼り付け（改行を含む）
   ```env
   GOOGLE_CLOUD_CREDENTIALS='{
     "type": "service_account",
     "project_id": "your-project-id",
     ...
   }'
   ```

3. 最後にシングルクォート `'` を追加

**方法B: 1行形式で設定する場合（推奨）**

1. コピーしたJSONファイルの内容を、**改行を削除して1行にする**
   - オンラインツールを使用: https://jsonformatter.org/json-minify
   - または、手動で改行を削除

2. `.env.local` に以下を追加：
   ```env
   GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"your-project-id",...}'
   ```

#### ステップ7: 設定の確認

最終的な `.env.local` ファイルの例：

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Cloud Vision API (名刺OCR用)
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"your-project-id","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"vision-ocr-service@your-project-id.iam.gserviceaccount.com","client_id":"123456789012345678901","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/vision-ocr-service%40your-project-id.iam.gserviceaccount.com"}'
```

#### ⚠️ 重要な注意事項

1. **シングルクォートで囲む**: JSON全体を `'...'` で囲んでください
2. **ダブルクォートはエスケープしない**: JSON内の `"` はそのまま使用してください
3. **改行文字（\n）は保持**: `private_key` 内の `\n` は削除しないでください
4. **ファイルを保存**: 変更後は必ず保存してください

#### ステップ8: 設定の検証

1. 開発サーバーを再起動：
   ```bash
   npm run dev
   ```

2. ブラウザのコンソールでエラーが出ていないか確認
3. プロフィール登録画面で名刺画像をアップロードしてテスト

---

### 📝 簡単な設定方法（スクリプトを使用）

手動での設定が難しい場合は、以下のスクリプトを使用できます：

**推奨: Node.jsスクリプト（より確実）**

#### 📍 スクリプトの実行場所

**ターミナル（コマンドライン）で実行します**

#### 方法A: Node.jsスクリプトを使用（推奨）

1. ターミナルでプロジェクトのディレクトリに移動
2. 以下のコマンドを実行：
   ```bash
   node scripts/setup-google-vision-env.js ~/Downloads/your-json-file.json
   ```
3. 設定が完了したら、開発サーバーを再起動

#### 方法B: Bashスクリプトを使用

#### ステップ1: ターミナルを開く

**Macの場合:**
- `Cmd + Space` を押してSpotlight検索を開く
- 「ターミナル」または「Terminal」と入力してEnter
- または、アプリケーション → ユーティリティ → ターミナル

**Windowsの場合:**
- `Win + R` を押して「cmd」と入力してEnter
- または、PowerShellを開く
- または、Git Bashを使用（インストール済みの場合）

#### ステップ2: プロジェクトのディレクトリに移動

ターミナルで以下のコマンドを実行：

```bash
cd /Users/eiichi/Documents/ai-consulting-zero
```

**または、Finder（Mac）で:**
1. プロジェクトフォルダ（`ai-consulting-zero`）をFinderで開く
2. フォルダ内で右クリック
3. 「ターミナルで開く」または「サービス」→「ターミナルで開く」を選択

**現在のディレクトリを確認:**
```bash
pwd
```

以下のように表示されればOK：
```
/Users/eiichi/Documents/ai-consulting-zero
```

#### ステップ3: JSONファイルの場所を確認

ダウンロードしたJSONファイルのパスを確認します。

**Mac:**
```bash
ls ~/Downloads/*.json
```

**Windows:**
```bash
dir %USERPROFILE%\Downloads\*.json
```

#### ステップ4: スクリプトを実行

以下のコマンドを実行（`your-json-file.json` を実際のファイル名に置き換えてください）：

**Mac/Linux:**
```bash
./scripts/setup-google-vision-env.sh ~/Downloads/your-json-file.json
```

**Windows (PowerShell):**
```powershell
bash scripts/setup-google-vision-env.sh $env:USERPROFILE\Downloads\your-json-file.json
```

**実際の例（ファイル名が `ai-consulting-ocr-12345-67890.json` の場合）:**
```bash
./scripts/setup-google-vision-env.sh ~/Downloads/ai-consulting-ocr-12345-67890.json
```

#### ステップ5: 実行結果を確認

成功すると、以下のメッセージが表示されます：

```
✅ 環境変数を設定しました: .env.local

次のステップ:
1. 開発サーバーを再起動: npm run dev
2. プロフィール登録画面で名刺画像をアップロードしてテスト
```

#### ⚠️ トラブルシューティング

**エラー: "Permission denied" が表示される場合:**

```bash
chmod +x scripts/setup-google-vision-env.sh
```

を実行してから、再度スクリプトを実行してください。

**エラー: "ファイルが見つかりません" が表示される場合:**

- JSONファイルのパスが正しいか確認
- ファイル名にスペースが含まれている場合は、パス全体を `"` で囲む：
  ```bash
  ./scripts/setup-google-vision-env.sh "~/Downloads/my file name.json"
  ```

**Windowsでスクリプトが実行できない場合:**

Git BashまたはWSLを使用するか、手動設定方法（上記のステップ1-8）を使用してください。

### 本番環境（Vercel）

1. Vercelダッシュボードでプロジェクトを開く
2. 「Settings」→「Environment Variables」を開く
3. 以下の環境変数を追加：
   - **Name**: `GOOGLE_CLOUD_CREDENTIALS`
   - **Value**: JSONファイルの内容全体（シングルクォートで囲む）
4. 環境を選択（Production, Preview, Development）
5. 「Save」をクリック

## 6. 料金について

Google Cloud Vision APIの料金（2024年時点）：
- **最初の1,000リクエスト/月**: 無料
- **1,001リクエスト以降**: $1.50 per 1,000 requests

詳細: https://cloud.google.com/vision/pricing

## 7. テスト

1. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. プロフィール登録画面で名刺画像をアップロード
3. OCR処理が正常に動作することを確認

## トラブルシューティング

### エラー: "GOOGLE_CLOUD_CREDENTIALS環境変数が設定されていません"

- `.env.local` ファイルが正しく作成されているか確認
- 環境変数名が `GOOGLE_CLOUD_CREDENTIALS` であることを確認
- サーバーを再起動

### エラー: "GOOGLE_CLOUD_CREDENTIALSのJSON形式が正しくありません"

- JSONの形式が正しいか確認
- シングルクォートで囲まれているか確認
- エスケープが必要な文字がないか確認

### エラー: "Permission denied" または "Authentication failed"

- サービスアカウントに `Cloud Vision API User` ロールが付与されているか確認
- Cloud Vision APIが有効になっているか確認
- サービスアカウントキーが正しいか確認

### OCR結果が不正確

- 画像の解像度が十分か確認（推奨: 300 DPI以上）
- 画像が鮮明か確認（ぼやけていないか、光の反射がないか）
- 名刺の向きが正しいか確認

## セキュリティ注意事項

⚠️ **重要**: サービスアカウントキーは機密情報です。以下の点に注意してください：

1. **Gitにコミットしない**: `.gitignore` に `.env.local` が含まれていることを確認
2. **公開リポジトリにプッシュしない**: JSONファイルを直接コミットしない
3. **環境変数として管理**: 本番環境では環境変数として設定
4. **定期的にローテーション**: 定期的にキーを再生成することを推奨

