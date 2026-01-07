# Vercelデプロイ手順

## 📋 概要

このガイドでは、変更したコードをVercelにデプロイして動作確認する方法を説明します。

---

## 🚀 方法1: GitHub経由で自動デプロイ（推奨）

VercelはGitHubリポジトリと連携している場合、自動的にデプロイされます。

### ステップ1: 変更をコミット

```bash
# 変更されたファイルを確認
git status

# 変更をステージング
git add .

# コミット
git commit -m "fix: PDF読み取りのVercel環境対応（pdfjs-distフォールバック追加）"

# GitHubにプッシュ
git push origin main
```

### ステップ2: Vercelで自動デプロイを確認

1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. プロジェクト「ai-consulting-zero」を選択
3. 「Deployments」タブで最新のデプロイを確認
4. デプロイが「Building」→「Ready」になるまで待機（通常2-5分）

### ステップ3: デプロイ完了を確認

デプロイが完了したら、以下のURLで確認：
- 本番環境: `https://ai-consulting-zero.vercel.app`
- デプロイログ: Vercelダッシュボードの「Deployments」タブ

---

## 🔧 方法2: Vercel CLIで直接デプロイ

GitHubにプッシュせずに直接デプロイする場合：

### ステップ1: Vercel CLIをインストール（未インストールの場合）

```bash
npm i -g vercel
```

### ステップ2: Vercelにログイン

```bash
vercel login
```

ブラウザが開くので、Vercelアカウントでログインしてください。

### ステップ3: プロジェクトにリンク（初回のみ）

```bash
cd /Users/eiichi/Documents/ai-consulting-zero
vercel link
```

既存のプロジェクトを選択するか、新規プロジェクトを作成します。

### ステップ4: 本番環境にデプロイ

```bash
vercel --prod
```

または、プレビュー環境にデプロイ：

```bash
vercel
```

---

## ✅ デプロイ後の動作確認

### 1. PDF読み取り機能のテスト

1. `https://ai-consulting-zero.vercel.app/auth/complete-profile` にアクセス
2. 名刺PDFをアップロード
3. エラーなく読み取れるか確認

### 2. ログの確認

Vercelダッシュボードで：
1. 「Deployments」タブ → 最新のデプロイを選択
2. 「Functions」タブ → `/api/ocr-business-card` を選択
3. 「Logs」タブでエラーログを確認

期待されるログ：
```
🔍 Vercel環境を検出、pdfjs-dist + canvasを使用します
📄 pdfjs-dist + canvasを使用してPDFを変換します...
✅ pdfjs-dist を読み込みました
✅ canvas を読み込みました
```

### 3. エラーが発生した場合

エラーログを確認して、以下をチェック：

- **`canvas`モジュールが見つからない**
  → `package.json`に`canvas`が含まれているか確認
  → Vercelのビルドログで`canvas`のインストールエラーがないか確認

- **`pdfjs-dist`のインポートエラー**
  → ビルドログで`pdfjs-dist`のインストールエラーがないか確認

- **メモリ不足エラー**
  → Vercelの関数メモリ制限を確認（デフォルト1024MB）

---

## 🔍 トラブルシューティング

### デプロイが失敗する場合

1. **ビルドエラーの確認**
   ```bash
   # ローカルでビルド確認
   npm run build
   ```

2. **環境変数の確認**
   - Vercelダッシュボード → Settings → Environment Variables
   - 必要な環境変数が設定されているか確認

3. **キャッシュのクリア**
   ```bash
   # Vercel CLI使用時
   vercel --prod --force
   ```

### デプロイは成功したが動作しない場合

1. **ブラウザのキャッシュをクリア**
   - `Cmd+Shift+R` (Mac) または `Ctrl+Shift+R` (Windows)

2. **シークレットモードで確認**
   - キャッシュなしで動作確認

3. **Vercelのログを確認**
   - Functions → Logs でエラーを確認

---

## 📝 注意事項

- **デプロイには2-5分かかります**
- **初回デプロイは特に時間がかかります**（依存関係のインストール）
- **デプロイ中はアプリが一時的に利用できなくなる場合があります**

---

## 🎯 次のステップ

デプロイが完了したら：

1. PDF読み取り機能をテスト
2. エラーログを確認
3. 問題があれば、ログを共有してください
