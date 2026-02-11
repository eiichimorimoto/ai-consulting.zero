# ファクトチェック: LP ロゴ・背景画像が表示されない問題（2026-02-11）

## 1. リポジトリ・ファイルの事実確認

| 確認項目 | 結果 | 根拠 |
|----------|------|------|
| `public/logo.png` が Git 追跡されているか | ✅ 追跡されている | `git ls-files public/logo.png` でパスが表示される |
| `public/lp-bg.jpg` が Git 追跡されているか | ✅ 追跡されている | `git ls-files public/lp-bg.jpg` でパスが表示される |
| .gitignore で除外されていないか | ✅ 除外されていない | .gitignore で `public/**/*.mp4` と `public/**/*.m4a` のみ。.png / .jpg は対象外 |
| 実ファイルが存在するか | ✅ 存在する | `ls -la public/logo.png public/lp-bg.jpg` で両方存在（約 545KB / 約 889KB） |

## 2. コード上の参照の事実確認

| 箇所 | 参照内容 | 備考 |
|------|----------|------|
| LP ロゴ | `components/LandingHeader.tsx` の `LOGO_SRC` = `/logo.png?v=${NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}` | クライアントコンポーネント。ビルド時に env が埋め込まれる |
| LP 背景 | `components/LandingHero.tsx` の `backgroundImage: url(/lp-bg.jpg?v=...)` | サーバーコンポーネント。同上 |
| next.config.js | `basePath` / `assetPrefix` の設定 | なし。ルート相対パス `/logo.png` はそのまま配信想定 |

## 3. 想定される原因（Vercel で出ない場合）

1. **デプロイ対象コミットにファイルが含まれていない**  
   本番ブランチや Vercel が参照しているコミットに、`public/logo.png` と `public/lp-bg.jpg` が含まれていない可能性。
2. **背景画像の opacity が 0.07 のため視認しづらい**  
   コード上は `opacity-[0.07]` のため、画像が読み込めていても「出ていない」と感じる可能性がある。
3. **ロゴ読み込み失敗時にフォールバックの「S」のみ表示**  
   `onError` で `logoError === true` になると、画像ではなく「S」のプレースホルダーのみ表示される。

## 4. 結論

- リポジトリ・.gitignore・実ファイルのいずれも **問題なし**。
- 表示されない事象は、**Vercel のデプロイ対象コミットに上記ファイルが含まれているか** および **背景の透明度** を確認・調整する必要がある。

## 5. 実施した対応（ルール遵守・ファクトチェック後）

- **背景画像の視認性**: `LandingHero.tsx` の背景レイヤーを `opacity-[0.07]` → `opacity-[0.18]` に変更。画像が読み込まれている場合に認識しやすくする。
- **ロゴ**: 既に `LandingHeader.tsx` で読み込み失敗時にフォールバック（「S」プレースホルダー）を表示する実装済み。リポジトリに `public/logo.png` は含まれており、Vercel で 404 の場合は **デプロイ元ブランチ・コミットに該当ファイルが含まれているか** を確認すること。

## 6. Vercel で表示されない場合の確認手順

1. Vercel Dashboard → 対象プロジェクト → Deployments → 最新デプロイのコミット SHA を確認。
2. GitHub でそのコミットを開き、`public/logo.png` と `public/lp-bg.jpg` が存在するか確認。
3. 含まれていない場合: 本番ブランチにそれらが含まれるコミットをマージして再デプロイ。
4. 含まれている場合: そのデプロイで「Redeploy with cleared cache」を実行して再デプロイ。
5. ブラウザの開発者ツール → Network で `/logo.png` と `/lp-bg.jpg` のステータスが 200 か確認。
