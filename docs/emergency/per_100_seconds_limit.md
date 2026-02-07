# 🚨 PageSpeed API の真の制限：100秒あたりの制限

## 問題の整理

```
事実:
- 1日のリクエスト数: 約5回/時間（全く少ない）
- でも429エラーが出る
```

**原因**: 1日あたりの制限ではなく、**100秒あたりの制限**に引っかかっている！

---

## 📊 PageSpeed API の2つの制限

### 制限1: Queries per day（1日あたり）
```
上限: 25,000リクエスト/日
現状: 全く達していない
結論: これは問題ではない
```

### 制限2: Queries per 100 seconds（100秒あたり）⚠️
```
上限: デフォルト 240リクエスト/100秒
意味: 短時間に大量のリクエストを送ると制限される
      
計算:
240リクエスト/100秒 = 2.4リクエスト/秒

もし一度に2つ（mobile + desktop）送ると:
2リクエスト同時 = OK
3リクエスト同時 = ギリギリ
連続で何度も = 429エラー！
```

---

## 🎯 あなたのケースでの分析

### Web サイト分析の動作

```
1回の分析 = 2リクエスト（mobile + desktop）
↓
ほぼ同時にAPI呼び出し
↓
短時間（数秒）で2リクエスト送信
↓
100秒制限に引っかかる可能性
```

### 429エラーが出る理由

```
シナリオ1: 連続で分析実行
- 1回目: OK（2リクエスト送信）
- すぐに2回目: 429エラー（制限到達）
- 100秒待つ: また使える

シナリオ2: ページリロード
- ブラウザが自動的に複数リクエスト
- 短時間に制限到達

シナリオ3: 開発中の頻繁なテスト
- 次々とリロード・テスト
- 累積で制限到達
```

---

## 🔍 クォータページで確認すべきこと

### URL
```
https://console.cloud.google.com/apis/api/pagespeedonline.googleapis.com/quotas
```

### 確認する項目

```
1. Queries per day
   現在値: _____ / 25,000
   
2. Queries per 100 seconds per user
   現在値: _____ / 240（またはそれ以下）← これを確認！
   
3. その他の制限
   - プロジェクト単位
   - ユーザー単位
   - IPアドレス単位
```

---

## 🛡️ 対策

### 対策1: リクエスト間隔を空ける（アプリ側実装）

```typescript
// app/api/diagnose-preview/route.ts

// mobile と desktop を順次実行（同時実行を避ける）
const results: Record<string, any> = {};

for (const strategy of strategies) {
  // 1つ目のリクエスト
  const response = await fetch(apiUrl);
  results[strategy] = await response.json();
  
  // 次のリクエストまで3秒待機
  if (strategy === 'mobile') {
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
```

**効果**: 100秒制限に引っかかりにくくなる

---

### 対策2: Supabaseキャッシュを活用（実装済み）

```
キャッシュがあれば:
- API呼び出しなし
- 制限に影響なし

キャッシュがない場合のみ:
- API呼び出し
- 制限に影響
```

**効果**: リピーター訪問時は制限回避

---

### 対策3: エクスポネンシャルバックオフでリトライ

```typescript
// 429エラー時に自動的に待機してリトライ
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After') || '120';
  console.log(`⏰ ${retryAfter}秒後にリトライします`);
  await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
  // リトライ
}
```

---

## 📋 今すぐ確認してほしいこと

クォータページで以下を確認:

```
https://console.cloud.google.com/apis/api/pagespeedonline.googleapis.com/quotas
```

**確認項目**:
1. Queries per 100 seconds の現在値と上限
2. その制限に達しているか
3. リセットまでの時間

スクリーンショットを撮ってください！
