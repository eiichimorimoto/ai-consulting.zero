# Vercelキャッシュクリア方法

## 問題: Vercelのデプロイが反映されない

Vercelにデプロイしても、ブラウザで古いバージョンが表示される場合の対処法です。

## 解決方法

### 方法1: ブラウザのキャッシュをクリア（最も簡単）

1. **Chrome/Edgeの場合**:
   - `Cmd+Shift+Delete` (Mac) または `Ctrl+Shift+Delete` (Windows/Linux)
   - 「キャッシュされた画像とファイル」を選択
   - 「データを消去」をクリック

2. **ハードリロード**:
   - `Cmd+Shift+R` (Mac) または `Ctrl+Shift+R` (Windows/Linux)
   - または `Cmd+Option+R` (Mac) または `Ctrl+F5` (Windows)

3. **シークレットモードで確認**:
   - シークレットモードで開いて確認（キャッシュなし）

### 方法2: Vercelの再デプロイをトリガー

空のコミットをプッシュして再デプロイをトリガー：

```bash
git commit --allow-empty -m "chore: trigger Vercel redeploy"
git push origin main
```

### 方法3: Vercelダッシュボードで確認

1. [Vercelダッシュボード](https://vercel.com/dashboard)にアクセス
2. プロジェクト「ai-consulting-zero」を選択
3. 「Deployments」タブで最新のデプロイを確認
4. デプロイが「Ready」になっているか確認
5. デプロイが失敗している場合は、エラーログを確認

### 方法4: Vercelのキャッシュをクリア（Vercel CLI使用）

```bash
# Vercel CLIをインストール（未インストールの場合）
npm i -g vercel

# ログイン
vercel login

# プロジェクトにリンク
vercel link

# 再デプロイ（キャッシュクリア）
vercel --prod --force
```

### 方法5: ビルドキャッシュを無効化

`vercel.json`に以下を追加：

```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "ignoreCommand": "git diff --quiet HEAD^ HEAD ./"
}
```

## 確認方法

デプロイが反映されているか確認：

1. **コミットハッシュを確認**:
   - ブラウザの開発者ツール（F12）→ Networkタブ
   - ページをリロード
   - `_next/static/chunks/` のファイルを確認
   - ファイル名に含まれるハッシュが最新のコミットと一致しているか確認

2. **ソースコードを確認**:
   - ブラウザで「ページのソースを表示」（右クリック→「ページのソースを表示」）
   - HTMLの内容が最新か確認

3. **環境変数を確認**:
   - Vercelダッシュボードで環境変数が正しく設定されているか確認

## よくある原因

1. **ブラウザのキャッシュ**: 最も一般的な原因
2. **CDNのキャッシュ**: VercelのCDNが古いバージョンをキャッシュしている
3. **デプロイの失敗**: ビルドエラーでデプロイが失敗している
4. **環境変数の問題**: 環境変数が正しく設定されていない

## 推奨手順

1. まずブラウザのキャッシュをクリア（方法1）
2. それでも解決しない場合、Vercelダッシュボードでデプロイ状況を確認（方法3）
3. デプロイが成功している場合、空のコミットで再デプロイ（方法2）
4. それでも解決しない場合、Vercel CLIで強制再デプロイ（方法4）


