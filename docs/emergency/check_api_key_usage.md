# 🚨 PageSpeed API Key 使用状況の確認（緊急）

## 問題

リセット時刻を過ぎても429エラーが継続

```
リセット時刻: 太平洋時間 00:00 (日本時間 17:00)
現在時刻: 02:26 (日本時間 19:26)
エラー: 429 Too Many Requests
```

---

## 🔍 確認すべきこと

### 1. Google Cloud Consoleで実際のクォータを確認

#### Step 1: APIダッシュボードを開く
```
https://console.cloud.google.com/apis/dashboard
```

#### Step 2: PageSpeed Insights API をクリック

#### Step 3: 「指標」タブで確認
```
グラフで確認できること:
- 過去24時間のリクエスト数
- 時間別の使用状況
- エラー数
```

**チェックポイント**:
- ✅ 本当に25,000に達しているか？
- ✅ いつ急増したか？
- ✅ 最近のリクエスト数は？

---

### 2. 同じAPIキーを他のプロジェクトで使っていないか？

#### 確認方法

**Step 1**: Google Cloud Console → 「認証情報」

**Step 2**: 該当のAPIキーをクリック

**Step 3**: 「アプリケーションの制限」を確認

```
制限なし
  ↓
他のプロジェクトでも使える状態
  ↓
他のアプリケーションでクォータを消費している可能性
```

**対策**:
- 新しいAPIキーを作成（このプロジェクト専用）
- または既存のキーに制限を追加

---

### 3. クォータの設定を確認

#### Step 1: 「割り当て」ページを開く
```
https://console.cloud.google.com/apis/api/pagespeedonline.googleapis.com/quotas
```

#### Step 2: クォータを確認

```
項目                          値
───────────────────────────────
Queries per day              ?????
Queries per 100 seconds      ?????
```

**チェックポイント**:
- ✅ 本当に25,000/日か？
- ✅ 100秒あたりの制限は？
- ✅ 制限の追加はないか？

---

## 🛡️ 緊急対策

### 対策1: 新しいAPIキーを作成（推奨）

```
1. Google Cloud Console → 「認証情報」
2. 「認証情報を作成」→ 「APIキー」
3. 新しいキーをコピー
4. .env.local を更新:
   GOOGLE_PAGESPEED_API_KEY=新しいキー
5. 開発サーバー再起動
```

**効果**: 
- 別のクォータでカウント開始
- 即座に利用可能

---

### 対策2: モックデータで開発継続

```typescript
// app/api/diagnose-preview/route.ts に追加

// 開発環境ではモックデータを返す（429対策）
if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_PAGESPEED === 'true') {
  return NextResponse.json({
    score: 85,
    metrics: { /* モックデータ */ }
  })
}
```

**.env.local に追加**:
```
USE_MOCK_PAGESPEED=true
```

---

### 対策3: 別のPageSpeed API プロジェクトを作成

```
1. Google Cloud Console で新しいプロジェクトを作成
2. PageSpeed Insights API を有効化
3. 新しいAPIキーを取得
4. 新しいクォータ（25,000/日）を取得
```

**効果**: 
- 完全に独立したクォータ
- 合計 50,000リクエスト/日に拡大

---

## 📊 次のアクション

### 優先度1: Google Cloud Consoleで確認（5分）
- [ ] APIダッシュボードで実際の使用量を確認
- [ ] クォータ設定を確認
- [ ] APIキーの制限を確認

### 優先度2: 新しいAPIキーを作成（3分）
- [ ] 新しいAPIキーを作成
- [ ] .env.local を更新
- [ ] 再テスト

### 優先度3: 結果を報告
- [ ] 実際の使用量は？
- [ ] 新しいキーで解決したか？
