# Google Custom Search API設定手順

**目的**: Web検索機能でGoogle Custom Search APIを使用

**所要時間**: 約10分

---

## Step 1: Google Cloud Consoleでプロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. ログイン（既存のGoogleアカウント）
3. プロジェクト選択 → 既存プロジェクトがあればそれを使用、なければ新規作成

---

## Step 2: Custom Search API有効化

1. 左メニュー「APIとサービス」→「ライブラリ」
2. 検索バーに「Custom Search API」と入力
3. 「Custom Search API」をクリック
4. 「有効にする」ボタンをクリック

---

## Step 3: APIキー取得

1. 左メニュー「APIとサービス」→「認証情報」
2. 「認証情報を作成」→「APIキー」をクリック
3. APIキーが生成される（例: `AIzaSyD...`）
4. **コピーして保存**

### セキュリティ設定（推奨）

1. 生成されたAPIキーの右側「編集」をクリック
2. 「アプリケーションの制限」→「HTTPリファラー」を選択
3. 「ウェブサイトの制限」に以下を追加:
   ```
   localhost:3000
   https://your-domain.vercel.app/*
   ```
4. 「APIの制限」→「キーを制限」を選択
5. 「Custom Search API」にチェック
6. 「保存」

---

## Step 4: Programmable Search Engine作成

1. [Programmable Search Engine](https://programmablesearchengine.google.com/)にアクセス
2. 「新しい検索エンジン」または「追加」をクリック

### 基本設定

| 項目 | 設定値 |
|------|--------|
| **検索エンジンの名前** | AI Consulting Search |
| **検索対象** | ウェブ全体を検索 |
| **検索の範囲** | 「すべてのサイトを検索する」を選択 |
| **言語** | 日本語 |
| **SafeSearch** | オン（推奨） |

3. 「作成」ボタンをクリック

### Search Engine ID取得

1. 作成した検索エンジンをクリック
2. 「概要」タブを開く
3. **Search Engine ID（検索エンジンID）** をコピー
   - 形式: `012345678901234567890:abcdefghijk`
   - または「CX」で始まる場合もあり

---

## Step 5: .env.localに追加

`.env.local`ファイルに以下を追加：

```env
# Google Custom Search API
GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSyD...（Step 3で取得したAPIキー）
GOOGLE_SEARCH_ENGINE_ID=012345678901234567890:abcdefghijk（Step 4で取得したSearch Engine ID）
```

**注意**: 
- APIキーとSearch Engine IDは機密情報です
- Gitにコミットしないでください（.gitignoreで除外済み）

---

## Step 6: 動作確認

1. 開発サーバーを再起動
   ```bash
   # 既存のサーバーを停止
   pkill -f "next"
   
   # 再起動
   npm run dev
   ```

2. ブラウザで確認
   ```
   http://localhost:3000/consulting/start
   ```

3. 右パネル「検索」タブで検索実行

---

## トラブルシューティング

### エラー: "API key not valid"
→ APIキーが正しくコピーされているか確認
→ Custom Search APIが有効化されているか確認

### エラー: "Invalid search engine ID"
→ Search Engine IDが正しくコピーされているか確認
→ 形式: `012345678901234567890:abcdefghijk`

### エラー: "Quota exceeded"
→ 1日100クエリの制限に達しました
→ Brave Search APIにフォールバック（自動）
→ 翌日にリセット

### 検索結果が0件
→ Search Engine設定で「ウェブ全体を検索」になっているか確認
→ 「特定のサイトのみ検索」になっていないか確認

---

## 料金について

### 無料枠
- **1日100クエリまで無料**
- クォータは毎日0:00 UTC（日本時間9:00）にリセット

### 有料プラン
- 100クエリ以降: **$5 / 1,000クエリ**
- 自動課金（クレジットカード登録必要）

### ハイブリッド実装の効果
- 1日100クエリまではGoogle使用
- 超過後はBrave Search APIに自動切り替え
- **実質無料で運用可能**

---

## セキュリティ注意事項

### ⚠️ 必ず実施
1. APIキーの制限設定（Step 3）
2. `.env.local`をGitにコミットしない
3. 本番環境では環境変数を別途設定

### 推奨
- API使用状況を定期的に確認
- 不審なアクセスがないかモニタリング
- 必要に応じてAPIキーを再生成

---

## 完了！

設定が完了したら、AIアシスタントに以下を伝えてください：

```
Google Custom Search APIの設定が完了しました。
APIキーとSearch Engine IDを.env.localに追加しました。
```

その後、ハイブリッド実装を開始します。
