import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

// Service roleキーを使用してRLSをバイパス
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function addColumns() {
  console.log('🔧 companiesテーブルにカラムを追加中...')

  // PostgreSQL経由で直接ALTER TABLEを実行
  // Supabase JS clientではDDLを直接実行できないため、
  // rpc経由でSQL実行関数を呼び出す必要がある

  // 代わりに、各カラムが存在するかテスト挿入で確認
  const testData = {
    name: '__TEST_COLUMN_CHECK__',
    fiscal_year_end: 3,
    retrieved_info: { test: true },
    documents_urls: ['test']
  }

  const { error: testError } = await supabase
    .from('companies')
    .insert(testData)

  if (testError) {
    console.log('❌ カラムが不足しています:', testError.message)
    console.log('')
    console.log('📋 Supabaseダッシュボードで以下のSQLを実行してください:')
    console.log('─'.repeat(60))
    console.log(`
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_year_end INTEGER CHECK (fiscal_year_end >= 1 AND fiscal_year_end <= 12);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS retrieved_info JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS documents_urls TEXT[];
`)
    console.log('─'.repeat(60))
    return
  }

  // テストデータを削除
  await supabase
    .from('companies')
    .delete()
    .eq('name', '__TEST_COLUMN_CHECK__')

  console.log('✅ 全てのカラムが存在します')
}

addColumns()
