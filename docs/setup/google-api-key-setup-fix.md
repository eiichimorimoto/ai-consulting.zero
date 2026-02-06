# Google Custom Search API キー作成手順（確実版）

## 🎯 目的
確実に動作するGoogle Custom Search APIキーを作成する

---

## 📝 手順

### Step 1: プロジェクト確認
1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. プロジェクト「**aiconsultingzero**」が選択されていることを確認
   - 画面上部のプロジェクト名で確認

---

### Step 2: Custom Search API を有効化
1. 左メニュー → 「**APIとサービス**」→「**ライブラリ**」
2. 検索バーで「**Custom Search API**」を検索
3. 「**Custom Search API**」（Google）を選択
   - 説明文に「JSON Custom Search API」と書かれているもの
4. 「**有効にする**」をクリック（すでに有効なら次へ）

---

### Step 3: 新しいAPIキーを作成
1. 左メニュー → 「**APIとサービス**」→「**認証情報**」
2. 画面上部の「**+ 認証情報を作成**」をクリック
3. 「**APIキー**」を選択
4. **新しいAPIキーが表示される**
   - 例: `AIzaSyD...`（長い文字列）
5. 「**キーをコピー**」をクリック

---

### Step 4: APIキーを制限（オプション・推奨）
1. 「**キーを制限**」をクリック
2. 「**名前**」に `Custom Search API Key` などを入力
3. 「**アプリケーションの制限**」→「**なし**」を選択（開発用）
4. 「**APIの制限**」→「**キーを制限**」を選択
5. 「**Custom Search API**」にチェック
6. 「**保存**」をクリック

---

### Step 5: .env.localを更新
1. プロジェクトの `.env.local` を開く
2. 以下の行を探す：
   ```env
   GOOGLE_CUSTOM_SEARCH_API_KEY=your_old_api_key_here
   ```
3. **新しいAPIキー**に置き換える：
   ```env
   GOOGLE_CUSTOM_SEARCH_API_KEY=your_new_api_key_here
   ```
4. 保存

**⚠️ 警告**: APIキーを直接このファイルに記載しないでください。必ず `.env.local` に保存し、`.env.local` は `.gitignore` に含まれていることを確認してください。

---

### Step 6: 動作確認
ターミナルで以下を実行：
```bash
curl "https://www.googleapis.com/customsearch/v1?key=YOUR_API_KEY_HERE&cx=d5dba422ca1d54658&q=test&num=1"
```

**成功**: JSON形式の検索結果が返ってくる
**失敗**: エラーメッセージが表示される

---

### Step 7: 開発サーバー再起動
```bash
pkill -f "next"
sleep 10
npm run dev
```

---

## ✅ 確認ポイント
- [ ] プロジェクトが `aiconsultingzero` になっている
- [ ] Custom Search API が有効化されている
- [ ] 新しいAPIキーを作成した
- [ ] .env.local を更新した
- [ ] curl で動作確認できた
- [ ] 開発サーバーを再起動した

---

## 🎉 完了
アプリで検索機能が動作するはずです！
