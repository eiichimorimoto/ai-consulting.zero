# Dify × Supabase 連携セットアップチェックリスト

## 📋 概要

このチェックリストに従って、DifyとSupabaseの連携を構築します。
**所要時間**: 約2〜3時間

---

## ✅ Phase 1: 事前準備（30分）

### 1.1 必要なツール・アカウント確認

- [ ] Difyアカウント作成済み（https://dify.ai）
- [ ] Supabaseプロジェクト稼働中
- [ ] Next.jsアプリがデプロイ済み（Vercel推奨）
- [ ] OpenAI APIキー取得済み（GPT-4使用の場合）

### 1.2 ドキュメント確認

- [ ] `docs/guides/dify-supabase-integration.md` を読了
- [ ] `supabase/schema.sql` でDB構造を確認
- [ ] `docs/guides/dify-workflow-example.json` を確認

---

## ✅ Phase 2: Next.js側の実装（1時間）

### 2.1 APIエンドポイント作成

- [ ] `app/api/dify/context/route.ts` を作成
  ```bash
  # ファイルは既に作成済みです
  ls -la app/api/dify/context/route.ts
  ```

### 2.2 環境変数設定

- [ ] APIキー生成
  ```bash
  openssl rand -base64 32
  ```

- [ ] `.env.local` に追加
  ```bash
  DIFY_API_KEY=<生成したキー>
  NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
  ```

- [ ] Vercelの環境変数に設定
  1. Vercel Dashboard → Settings → Environment Variables
  2. `DIFY_API_KEY` を追加（Production/Preview/Development）

### 2.3 デプロイ

- [ ] ローカルでビルド確認
  ```bash
  npm run build
  ```

- [ ] Vercelへデプロイ
  ```bash
  git add .
  git commit -m "feat: Add Dify context API"
  git push
  ```

- [ ] デプロイ完了確認
  ```bash
  curl https://your-domain.vercel.app/api/dify/context
  # レスポンス: {"status":"ok","endpoint":"Dify Context API","version":"1.0.0"}
  ```

---

## ✅ Phase 3: Dify側の設定（1時間）

### 3.1 ワークフロー作成

- [ ] Dify管理画面 → Studio → Create Workflow
- [ ] 名前: "AIコンサルティング - 新規案件対応"
- [ ] タイプ: "Chatflow" または "Workflow"

### 3.2 環境変数設定

- [ ] Settings → Environment Variables
- [ ] 追加:
  - Key: `DIFY_API_KEY`
  - Value: <.env.localと同じ値>

### 3.3 ノード設定

#### 開始ノード（Start）

- [ ] 変数追加:
  | 変数名 | 型 | 必須 | デフォルト |
  |--------|-----|------|-----------|
  | user_id | text | ✓ | - |
  | is_new_case | boolean | ✓ | true |
  | user_question | text | ✓ | - |

#### HTTP Requestノード

- [ ] ノード追加: HTTP Request
- [ ] 設定:
  - Method: `POST`
  - URL: `https://your-domain.vercel.app/api/dify/context`
  - Headers:
    ```json
    {
      "Content-Type": "application/json",
      "x-api-key": "{{#sys.env.DIFY_API_KEY#}}"
    }
    ```
  - Body:
    ```json
    {
      "userId": "{{#start.user_id#}}",
      "isNewCase": {{#start.is_new_case#}}
    }
    ```
  - Output Variable: `context`

#### Codeノード（データ整形）

- [ ] ノード追加: Code
- [ ] 言語: JavaScript
- [ ] コード: `dify-workflow-example.json` の code_1 を参照
- [ ] Output Variables:
  - `formatted_context`
  - `company_name`
  - `user_name`
  - `has_history`

#### LLMノード

- [ ] ノード追加: LLM
- [ ] Model: GPT-4 または GPT-3.5-turbo
- [ ] System Prompt: `dify-workflow-example.json` を参照
- [ ] User Prompt:
  ```
  {{#code_1.formatted_context#}}
  
  【ユーザーの質問】
  {{#start.user_question#}}
  ```
- [ ] Temperature: 0.7
- [ ] Max Tokens: 2000

#### Answerノード

- [ ] ノード追加: Answer
- [ ] Answer: `{{#llm_1.text#}}`

### 3.4 ノード接続

- [ ] Start → HTTP Request
- [ ] HTTP Request → Code
- [ ] Code → LLM
- [ ] LLM → Answer

---

## ✅ Phase 4: テスト（30分）

### 4.1 新規案件テスト

- [ ] Dify Debug画面で実行
- [ ] 入力値:
  ```json
  {
    "user_id": "実際のSupabase auth.users の ID",
    "is_new_case": true,
    "user_question": "AIを活用した業務効率化について相談したいです"
  }
  ```
- [ ] 期待結果:
  - [ ] 会社情報が正しく取得されている
  - [ ] プロフィール情報が表示されている
  - [ ] 適切なコンサルティング回答が生成される

### 4.2 継続案件テスト

- [ ] 入力値:
  ```json
  {
    "user_id": "同じユーザーID",
    "is_new_case": false,
    "user_question": "前回提案いただいた内容について進捗を報告します"
  }
  ```
- [ ] 期待結果:
  - [ ] 過去の会話履歴が含まれている
  - [ ] 前回のセッション情報が表示される
  - [ ] 継続的な文脈を踏まえた回答

### 4.3 エラーハンドリングテスト

- [ ] 存在しないuser_idでテスト → 404エラー
- [ ] 不正なAPIキーでテスト → 401エラー
- [ ] タイムアウトテスト（30秒以上かかる場合）

---

## ✅ Phase 5: 本番適用（30分）

### 5.1 パフォーマンス確認

- [ ] レスポンスタイム確認（目標: 3秒以内）
- [ ] 大量データでのテスト（会話履歴100件以上）
- [ ] 同時アクセステスト

### 5.2 セキュリティ確認

- [ ] APIキーが外部に漏れていないか確認
- [ ] Supabase RLSが有効になっているか確認
  ```sql
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public';
  ```
- [ ] ユーザーID検証が機能しているか確認

### 5.3 モニタリング設定

- [ ] Vercel Analytics有効化
- [ ] Vercel Logs確認
  ```bash
  vercel logs
  ```
- [ ] Difyのログ確認
  - Settings → Logs → API Logs

### 5.4 ドキュメント更新

- [ ] 本番URLを記録
- [ ] チーム共有ドキュメント更新
- [ ] トラブルシューティングログ作成

---

## ✅ Phase 6: 運用開始

### 6.1 ユーザーへの展開

- [ ] 社内テストユーザーで検証
- [ ] フィードバック収集
- [ ] 必要に応じてプロンプト調整

### 6.2 継続的改善

- [ ] 週次でログレビュー
- [ ] ユーザーフィードバックを反映
- [ ] プロンプトの改善

---

## 🚨 トラブルシューティング

### よくあるエラー

| エラー | 原因 | 解決策 |
|--------|------|--------|
| 401 Unauthorized | APIキー不一致 | `.env.local` と Dify環境変数を確認 |
| 404 User not found | 存在しないuser_id | Supabaseでuser_idを確認 |
| 500 Server Error | SQL構文エラー | Vercel Logsで詳細確認 |
| タイムアウト | データ量多すぎ | LIMIT句を追加してデータ制限 |

### デバッグ方法

```bash
# Vercelログ確認
vercel logs --follow

# ローカルでテスト
npm run dev
curl -X POST http://localhost:3000/api/dify/context \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"userId":"test-user-id","isNewCase":true}'
```

---

## 📞 サポート

- Dify公式ドキュメント: https://docs.dify.ai
- Supabase公式ドキュメント: https://supabase.com/docs
- プロジェクト内ドキュメント: `docs/guides/`

---

**作成日**: 2026-01-05
**バージョン**: 1.0.0
