# Lighthouse 直接実行による実装案

## 概要
PageSpeed APIを使わず、サーバーサイドでLighthouseを直接実行することで、レート制限を完全に回避。

---

## メリット
- ✅ **APIキー不要** - Google APIのレート制限を完全回避
- ✅ **コスト削減** - 無料で無制限に使用可能
- ✅ **カスタマイズ可能** - 監査項目を自由に設定
- ✅ **高速化** - API往復通信が不要

## デメリット
- ❌ サーバーリソース消費（CPU、メモリ）
- ❌ Chrome/Chromiumのインストール必要
- ❌ Vercelでは制約あり（実行時間制限）

---

## 実装方法

### 1. パッケージインストール
```bash
npm install lighthouse chrome-launcher puppeteer
```

### 2. Lighthouse実行関数
```typescript
// lib/lighthouse-runner.ts
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

export async function runLighthouse(url: string, strategy: 'mobile' | 'desktop') {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
  });
  
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
    emulatedFormFactor: strategy,
  };
  
  try {
    const runnerResult = await lighthouse(url, options);
    return runnerResult.lhr; // Lighthouse Result
  } finally {
    await chrome.kill();
  }
}
```

### 3. API Route実装
```typescript
// app/api/lighthouse-direct/route.ts
export async function POST(request: Request) {
  const { url } = await request.json();
  
  // キャッシュチェック
  const cached = await getCachedLighthouse(url);
  if (cached) return NextResponse.json(cached);
  
  // Lighthouse実行
  const mobile = await runLighthouse(url, 'mobile');
  const desktop = await runLighthouse(url, 'desktop');
  
  const result = { mobile, desktop };
  
  // キャッシュ保存
  await saveLighthouseCache(url, result);
  
  return NextResponse.json(result);
}
```

---

## Vercel環境での注意点

### 制約
- **実行時間制限**: 10秒（Hobby）、60秒（Pro）
- **メモリ制限**: 1GB（Hobby）、3GB（Pro）
- **Chrome起動**: `puppeteer`の`@sparticuz/chromium`パッケージが必要

### 対策
```bash
# Vercel用の軽量Chromium
npm install @sparticuz/chromium puppeteer-core
```

```typescript
// Vercel環境判定
const isVercel = !!process.env.VERCEL;

const chrome = isVercel
  ? await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
    })
  : await chromeLauncher.launch();
```

---

## 推奨: ハイブリッドアプローチ

```typescript
// 1. Supabaseキャッシュをチェック（24時間有効）
// 2. キャッシュミス → 複数APIキーでPageSpeed API呼び出し
// 3. 全てのキーで429エラー → Lighthouse直接実行（フォールバック）
// 4. 結果をSupabaseにキャッシュ
```

これなら、ほとんどのケースでキャッシュから返せます。
