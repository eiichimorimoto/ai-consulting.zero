/**
 * Supabaseデータベーススキーマを適用するスクリプト
 * 
 * 使用方法:
 * 1. Supabaseダッシュボードで「Settings」→「Database」から接続文字列を取得
 * 2. .env.localに以下を追加:
 *    SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.fwruumlkxzfihlmygrww.supabase.co:5432/postgres
 * 3. npm run setup-db を実行
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function setupDatabase() {
  console.log('🚀 Supabaseデータベーススキーマの適用を開始します...\n')

  // スキーマファイルを読み込む
  const schemaPath = join(process.cwd(), 'supabase', 'schema.sql')
  const schemaSQL = readFileSync(schemaPath, 'utf-8')

  // Supabaseクライアントを作成（Service Role Keyが必要）
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // SQLを実行（SupabaseのREST API経由では直接SQLを実行できないため、
    // このスクリプトは主にスキーマファイルの内容を表示するためのものです）
    console.log('📋 スキーマファイルの内容:\n')
    console.log(schemaSQL.substring(0, 500) + '...\n')
    
    console.log('⚠️  注意: SupabaseのREST API経由では直接SQLを実行できません。')
    console.log('以下のいずれかの方法でスキーマを適用してください:\n')
    console.log('方法1: Supabaseダッシュボードを使用')
    console.log('  1. https://supabase.com/dashboard にアクセス')
    console.log('  2. プロジェクト「ai^consulting-zero」を選択')
    console.log('  3. 「SQL Editor」を開く')
    console.log('  4. supabase/schema.sql の内容をコピー＆ペースト')
    console.log('  5. 「Run」をクリック\n')
    
    console.log('方法2: Supabase CLIを使用')
    console.log('  1. supabase login を実行')
    console.log('  2. supabase link --project-ref fwruumlkxzfihlmygrww')
    console.log('  3. supabase db push または supabase db execute < schema.sql\n')

    // テーブル一覧を取得して確認
    console.log('📊 現在のテーブル一覧を確認中...\n')
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(20)

    if (error) {
      console.log('⚠️  テーブル一覧の取得に失敗しました（これは正常です。まだテーブルが作成されていない可能性があります）')
      console.log('エラー:', error.message, '\n')
    } else if (tables && tables.length > 0) {
      console.log('既存のテーブル:')
      tables.forEach(table => {
        console.log(`  - ${table.table_name}`)
      })
      console.log('')
    } else {
      console.log('テーブルが見つかりませんでした。スキーマを適用してください。\n')
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message)
    process.exit(1)
  }

  console.log('✅ スクリプトの実行が完了しました。')
  console.log('上記の手順に従ってスキーマを適用してください。')
}

setupDatabase()


