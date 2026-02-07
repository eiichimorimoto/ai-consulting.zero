# 🔑 PageSpeed Insights API 専用キーの作成手順

## 📋 作成手順（5分）

### Step 1: Google Cloud Console にアクセス

```
https://console.cloud.google.com/apis/credentials
```

プロジェクト: `aiconsultingzero` が選択されているか確認

---

### Step 2: 新しいAPIキーを作成

1. **「認証情報を作成」ボタンをクリック**
2. **「APIキー」を選択**
3. 新しいAPIキーが表示される
   ```
   APIキーを作成しました
   AIzaSy... [キーをコピー]
   ```
4. **「キーをコピー」をクリック**

---

### Step 3: APIキーの制限を設定（推奨）

キーが作成されたら、すぐに制限を追加：

1. **「キーを制限」ボタンをクリック**

2. **「アプリケーションの制限」**
   ```
   ☑ HTTPリファラー（ウェブサイト）
   
   ウェブサイトの制限:
   - http://localhost:3000/*
   - https://ai-consulting-zero.vercel.app/*
   ```

3. **「APIの制限」**
   ```
   ☑ キーを制限
   
   APIを選択:
   ✓ PageSpeed Insights API ← これだけにチェック
   ```

4. **「保存」をクリック**

---

### Step 4: PageSpeed Insights API が有効か確認

もし有効になっていない場合:

```
https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com
```

1. 「有効にする」ボタンをクリック
2. 有効化完了まで数秒待つ

---

## 🔧 .env.local の更新

### 現在の .env.local

```bash
# 外部検索用（Custom Search API等）
GOOGLE_PAGESPEED_API_KEY=AIzaSy********************* # 古いキー
```

### 新しい構成

```bash
# PageSpeed Insights API 専用キー（新規作成）
GOOGLE_PAGESPEED_API_KEY=AIzaSy********************* # 新規作成したキー

# 外部検索用キー（既存）を別名で保持
GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSy********************* # 古いキー
```

---

## 🚀 反映手順

### 1. .env.local を編集

```bash
# ファイルを開く
code .env.local

# または
nano .env.local
```

### 2. GOOGLE_PAGESPEED_API_KEY を更新

```bash
# 古い（外部検索用）
GOOGLE_PAGESPEED_API_KEY=AIzaSy********************* # 削除する

# 新しい（PageSpeed専用）
GOOGLE_PAGESPEED_API_KEY=AIzaSy********************* # 新しいキーに置き換え
```

### 3. 開発サーバーを再起動

```bash
# 1. プロセスを停止
pkill -f "next"

# 2. 10秒待機
sleep 10

# 3. 再起動
npm run dev
```

### 4. 動作確認

```
http://localhost:3000/dashboard/website-analysis
```

1. 任意のURLを入力
2. 分析実行
3. 結果が表示される ✅
4. ターミナルで確認:
   ```
   📡 PageSpeed API呼び出し (mobile): ...
   📡 PageSpeed API呼び出し (desktop): ...
   💾 Supabaseキャッシュに保存完了
   ```

---

## ✅ 確認チェックリスト

- [ ] Google Cloud Console で新しいAPIキーを作成
- [ ] キーに制限を追加（HTTPリファラー + PageSpeed API）
- [ ] PageSpeed Insights API が有効になっている
- [ ] .env.local を更新
- [ ] 開発サーバー再起動
- [ ] Web サイト分析で動作確認
- [ ] エラーなく結果が表示される

---

## 🔍 トラブルシューティング

### エラー: 403 Forbidden

**原因**: PageSpeed Insights API が有効になっていない

**解決策**:
```
https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com
→ 「有効にする」をクリック
```

### エラー: 429 Too Many Requests（まだ出る場合）

**原因**: 古いキーが残っている、またはキャッシュ

**解決策**:
1. .env.local の内容を再確認
2. 開発サーバーを完全に停止
3. `rm -rf .next`（キャッシュクリア）
4. `npm run dev`（再起動）

### エラー: Invalid API key

**原因**: APIキーが間違っている

**解決策**:
1. Google Cloud Console で再度キーをコピー
2. .env.local に貼り付け直す
3. 前後に空白がないか確認
