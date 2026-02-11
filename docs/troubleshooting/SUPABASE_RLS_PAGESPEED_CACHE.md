# Supabase Security Advisor 対応: pagespeed_cache の RLS 有効化

**対象**: 「RLS Disabled in Public」エラー（`public.pagespeed_cache`）  
**日付**: 2026-02-11

---

## 問題

Supabase の週次セキュリティアドバイザーで以下が検出されました。

- **Issue type**: RLS Disabled in Public
- **Entity**: `public.pagespeed_cache`
- **内容**: PostgREST に公開されているスキーマのテーブルで、Row Level Security (RLS) が有効になっていない。

RLS が無効だと、anon key で誰でもテーブルを読み書きできる可能性があり、データの不正アクセス・改ざんのリスクがあります。

---

## 対応内容

1. **`public.pagespeed_cache` で RLS を有効化**
2. **ポリシー**: 認証済みユーザー（`auth.role() = 'authenticated'`）のみ SELECT / INSERT / UPDATE / DELETE を許可
3. **有効期限切れ削除**: `cleanup_expired_pagespeed_cache()` を `SECURITY DEFINER` に変更し、RLS をバイパスして削除可能に（pg_cron や手動実行で確実に動作）

---

## 適用手順

### 方法 A: Supabase Dashboard の SQL Editor で実行（推奨）

1. [Supabase Dashboard](https://supabase.com/dashboard) を開く
2. プロジェクト **ai-consulting-zero** を選択
3. 左メニュー **SQL Editor** を開く
4. **New query** で新規クエリを作成
5. リポジトリの `supabase/20260211_enable_rls_pagespeed_cache.sql` の内容をコピーして貼り付け
6. **Run** をクリックして実行
7. 成功後、**Advisors → Security Advisor** で「RLS Disabled in Public」のエラーが 0 件になっていることを確認
8. 必要に応じて **Rerun linter** で再分析

### 方法 B: ローカルで Supabase CLI を使う場合

```bash
# マイグレーションを適用（リモート DB に反映する場合）
supabase db push
```

または、`supabase link` 済みの状態で該当 SQL を実行する方法を利用してください。

---

## 動作確認

- **診断プレビュー（PageSpeed キャッシュ利用）**: ログイン済みユーザーで診断プレビューを開き、キャッシュの取得・保存が行われる操作を実行してエラーが出ないことを確認する。
- **Security Advisor**: 上記のとおり Errors が 0 件になることを確認する。

---

## 参照

- マイグレーション: `supabase/20260211_enable_rls_pagespeed_cache.sql`
- キャッシュ利用箇所: `lib/pagespeed-cache.ts`, `app/api/diagnose-preview/route.ts`
- 既存 RLS 一覧: `supabase/20251230_enable_rls_all_tables.sql`
