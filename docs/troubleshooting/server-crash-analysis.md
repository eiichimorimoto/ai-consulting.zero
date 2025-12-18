# サーバークラッシュの原因分析と回避方法

## 発生日時
2024年12月17日

## 問題の概要
Googleフォームの実装後、開発サーバーがループ状態になり、ブラウザが立ち上がらない問題が発生。

---

## 🔍 根本原因の分析

### 1. **ミドルウェアファイルの不在**

#### 問題
- `middleware.ts`ファイルが存在しなかった
- `lib/supabase/proxy.ts`に`updateSession`関数はあったが、それを呼び出すミドルウェアが未実装
- Next.jsのルーティングでSupabaseのセッション管理が機能せず、認証周りでリダイレクトループが発生

#### 影響
```
/dashboard → 認証なし → /auth/login → セッション確認失敗 → /dashboard → ループ
```

#### 解決
```typescript
// middleware.ts を作成
import { updateSession } from '@/lib/supabase/proxy'
import { NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

### 2. **Headerコンポーネントのインポート/エクスポート不一致**

#### 問題
- `Header.tsx`: `export default function Header()`（デフォルトエクスポート）
- `ConditionalHeader.tsx`: `import { Header } from './Header'`（名前付きインポート）
- ビルド時に「Headerという名前付きエクスポートが存在しない」というエラー

#### 原因
- 複数のHeaderファイルが存在（`Header.tsx`, `Header 2.tsx`, `Header 3.tsx`）
- 開発過程でファイルが切り替わり、インポート文が更新されなかった
- `Header 3.tsx`は名前付きエクスポート`export function Header()`を使用

#### 解決
```typescript
// ConditionalHeader.tsx
// 修正前
import { Header } from './Header'  // ❌

// 修正後
import Header from './Header'      // ✅
```

---

### 3. **Next.js 16 (Turbopack) のキャッシュ問題**

#### 問題
- ファイルを修正してもエラーが消えない
- Turbopackが古いバージョンのファイルをキャッシュ
- `.next`フォルダにビルドキャッシュが残存

#### 影響
- コード修正が反映されない
- 古いエラーメッセージが表示され続ける
- 開発体験の低下

#### 解決方法
```bash
# キャッシュをクリア
rm -rf .next

# サーバーを再起動
npm run dev
```

---

### 4. **macOSのファイルアクセス権限エラー (EPERM)**

#### 問題
```
EPERM: operation not permitted, open '/Users/.../ai-consulting-zero/.env.local'
EPERM: operation not permitted, open '/Users/.../node_modules/next/...'
// NOTE: フォルダ名が異なる場合は、ご自身の環境に合わせて読み替えてください。
```

#### 原因
- macOSのセキュリティ機能（SIP: System Integrity Protection）
- Cursorのサンドボックス環境からのファイルアクセス制限
- Turbopackの高速ファイル監視が権限問題を引き起こした

#### 一時的な回避策
```json
// package.json - ホスト名を明示的に指定
{
  "scripts": {
    "dev": "next dev -H localhost"
  }
}
```

#### 根本的な解決
- 外部ターミナル（iTerm2/Terminal.app）からサーバーを起動
- Cursorのサンドボックス外で実行

---

### 5. **package.jsonの変更による副作用**

#### 問題の変遷
```json
// 初期
"dev": "next dev"

// 試行1: ホスト名指定
"dev": "next dev -H localhost"

// 試行2: Turbopack無効化（失敗）
"dev": "next dev -H localhost --no-turbo"  // ❌ オプション名が間違い

// 試行3: 環境変数追加
"dev": "NODE_OPTIONS='--no-warnings' next dev -H localhost"
```

#### 影響
- 不適切なオプションでサーバーが起動失敗
- 開発ワークフローの混乱

---

## 🎯 Googleフォーム実装との関連性

### 直接的な関連: **なし**

Googleフォーム自体はiframeで埋め込んでいるだけで、サーバーに負荷をかけない：

```tsx
// contact/page.tsx
<iframe 
  src="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
  width="100%"
  height="1400"
/>
```

### 間接的な影響

1. **タイミングの偶然**
   - Googleフォーム実装作業中に他のファイルも変更
   - ミドルウェアファイルの削除や移動が発生
   - 複数の変更が同時に行われ、問題の特定が困難に

2. **開発環境の不安定性**
   - 頻繁なファイル変更
   - Turbopackのホットリロードが追いつかない
   - キャッシュと実際のファイルの不一致

---

## 🛡️ 再発防止策

### 1. **ミドルウェアの適切な管理**

#### チェックリスト
- [ ] `middleware.ts`が存在することを確認
- [ ] Supabaseのセッション管理が機能しているか確認
- [ ] 認証が必要なルートで適切にリダイレクトされるか確認

#### 推奨構成
```
project/
├── middleware.ts              ← 必須
├── lib/
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── proxy.ts          ← ミドルウェアから呼び出される
```

---

### 2. **エクスポート/インポートの統一**

#### ルール
1. **デフォルトエクスポートを優先**
   ```typescript
   // コンポーネント
   export default function MyComponent() {}
   
   // インポート
   import MyComponent from './MyComponent'
   ```

2. **複数のコンポーネントは名前付きエクスポート**
   ```typescript
   // ユーティリティ関数など
   export function helper1() {}
   export function helper2() {}
   
   // インポート
   import { helper1, helper2 } from './helpers'
   ```

3. **重複ファイルの削除**
   ```bash
   # バックアップファイルを定期的にクリーンアップ
   find . -name "*.tsx.backup" -o -name "*2.tsx" -o -name "*3.tsx"
   ```

---

### 3. **キャッシュクリアの習慣化**

#### 開発中のトラブル時
```bash
# Step 1: キャッシュクリア
rm -rf .next

# Step 2: node_modulesの再インストール（必要な場合）
rm -rf node_modules
npm install

# Step 3: サーバー再起動
npm run dev
```

#### npmスクリプトに追加
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:clean": "rm -rf .next && next dev",
    "dev:fresh": "rm -rf .next node_modules && npm install && next dev"
  }
}
```

---

### 4. **Git管理のベストプラクティス**

#### コミット前のチェック
```bash
# 1. 変更ファイルを確認
git status

# 2. 不要なファイルを除外
git add --update  # 既存ファイルの変更のみ
git add -p        # 対話的に確認しながら追加

# 3. 意図しないファイルをコミットしない
# .gitignore を適切に設定
```

#### .gitignoreの確認
```gitignore
# Next.js
.next/
out/

# バックアップファイル
*.backup
*.old
*.temp
*2.tsx
*3.tsx

# 環境変数
.env.local
.env.development.local
```

---

### 5. **段階的なテスト実施**

#### 新機能追加時のフロー

1. **ブランチを作成**
   ```bash
   git checkout -b feature/google-forms
   ```

2. **小さな変更を加える**
   - 1つの機能ずつ実装
   - 各ステップでテスト

3. **動作確認**
   ```bash
   npm run dev
   # ブラウザで確認
   ```

4. **コミット**
   ```bash
   git add app/contact/page.tsx
   git commit -m "feat: Add Google Forms iframe to contact page"
   ```

5. **問題が起きても戻せる**
   ```bash
   git log --oneline -5
   git reset --hard <commit-hash>
   ```

---

### 6. **開発環境の安定化**

#### 推奨設定

1. **外部ターミナルの使用**
   - Cursorの内蔵ターミナルではなく、iTerm2やTerminal.appを使用
   - サンドボックス制限を回避

2. **Node.jsバージョンの固定**
   ```json
   // package.json
   {
     "engines": {
       "node": ">=18.0.0 <21.0.0",
       "npm": ">=9.0.0"
     }
   }
   ```

3. **依存関係の定期更新**
   ```bash
   # 週に1回程度
   npm outdated
   npm update
   ```

---

### 7. **エラーログの保存**

#### トラブル時の記録
```bash
# ログをファイルに保存
npm run dev 2>&1 | tee dev-server.log

# エラー発生時に後から確認可能
grep -i "error\|warning" dev-server.log
```

---

## 📝 チェックリスト: サーバー起動前の確認

- [ ] `middleware.ts`が存在する
- [ ] `.env.local`が正しく設定されている
- [ ] `node_modules`が最新の状態
- [ ] 重複ファイル（*.backup、*2.tsx等）を削除済み
- [ ] `.next`キャッシュをクリア（問題がある場合）
- [ ] Gitの変更内容を確認（`git status`）
- [ ] 最新のコミットをプル（`git pull origin main`）

---

## 🚨 緊急時の復旧手順

### サーバーが起動しない場合

```bash
# Step 1: すべてのNext.jsプロセスを停止
pkill -f "next dev"
lsof -ti:3000 | xargs kill -9

# Step 2: Gitの最新版に戻す
git status
git restore .

# Step 3: キャッシュをクリア
rm -rf .next

# Step 4: 依存関係を再インストール（必要な場合）
rm -rf node_modules package-lock.json
npm install

# Step 5: サーバーを起動
npm run dev
```

---

## 📚 参考資料

- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Next.js Turbopack](https://nextjs.org/docs/architecture/turbopack)
- [Git Best Practices](https://git-scm.com/book/en/v2)

---

## 結論

**Googleフォームの実装自体は問題なかった。**

サーバークラッシュの真の原因は：
1. ミドルウェアファイルの不在
2. コンポーネントのインポート/エクスポート不一致
3. Next.js Turbopackのキャッシュ問題
4. 開発中の複数の変更が重なったこと

これらは**Googleフォームとは無関係**で、開発環境の管理とコード整理の問題でした。

上記の予防策を実施することで、同様の問題を回避できます。



