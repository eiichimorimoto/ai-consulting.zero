# Vercel で LP の背景画像・ロゴが表示されない場合

**対象**: トップ（LP）で `lp-bg.jpg`（背景）や `logo.png`（ロゴ）が表示されない

---

## 1. GitHub 上の確認結果（リポジトリ側）

次のファイルは **Git で追跡されており、リポジトリに含まれています**。

| パス | 用途 |
|------|------|
| `public/logo.png` | ヘッダー等のロゴ |
| `public/lp-bg.jpg` | LP ヒーロー背景（薄く表示） |

確認コマンド（ローカルで実行）:

```bash
git ls-files public/logo.png public/lp-bg.jpg
# 両方のパスが表示されればリポジトリに含まれている
```

---

## 2. Vercel で確認すること

### 2-1. デプロイ元ブランチ

- Vercel の **Settings → Git → Production Branch** で、デプロイしているブランチを確認する。
- そのブランチに `public/logo.png` と `public/lp-bg.jpg` が含まれているか、GitHub のファイル一覧で確認する。
- 別ブランチだけにコミットしている場合は、本番用ブランチにマージするか、Vercel の Production Branch をそのブランチに変更する。

### 2-2. ビルドキャッシュ

- ファイルを追加したあとデプロイしても表示されない場合は、**Vercel Dashboard → 該当デプロイ → ⋮ → Redeploy** の **「Redeploy with cleared cache」** で再デプロイする。
- これで `public/` が改めてコピーされ、静的ファイルが最新になる。

### 2-3. 環境変数（任意）

- **NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA** は Vercel が自動で付与するため、設定不要。
- キャッシュバスティング（`?v=xxx`）に利用しており、デプロイごとに変わることで CDN キャッシュのずれを防いでいる。

---

## 3. コード側の対策（済）

- **背景画像**: `LandingHero.tsx` で `lp-bg.jpg` にクエリ `?v=NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` を付与し、デプロイごとに別 URL として取得するようにしている。
- **ロゴ**: `LandingHeader.tsx` で同様のクエリを付与。さらに **読み込み失敗時**（`onError`）は「S」のプレースホルダーを表示するようにしている。

---

## 4. 表示されないときのチェックリスト

- [ ] GitHub のデプロイ元ブランチに `public/logo.png` と `public/lp-bg.jpg` がある
- [ ] Vercel で「Redeploy with cleared cache」を実行した
- [ ] ブラウザの開発者ツールの Network タブで、`/logo.png` と `/lp-bg.jpg` が 404 になっていないか確認した
- [ ] 別のブランチ・プレビュー URL だけ問題ないか確認した（本番ドメインとプレビューで挙動が違う場合がある）

以上で、LP の背景画像とロゴが Vercel で表示されない場合の確認と対処ができます。
