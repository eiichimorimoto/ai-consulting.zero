#!/usr/bin/env node

/**
 * Google Cloud Vision API環境変数の確認スクリプト
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Google Cloud Vision API 環境変数の確認\n');

// .env.localファイルを読み込む
const envPath = path.join(process.cwd(), '.env.local');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ .env.localファイルが見つかりました\n');
} catch (error) {
  console.error('❌ .env.localファイルが見つかりません');
  console.error('   プロジェクトのルートディレクトリに.env.localファイルを作成してください。\n');
  process.exit(1);
}

// 環境変数を解析
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

// GOOGLE_CLOUD_CREDENTIALSを確認
const credentials = envVars.GOOGLE_CLOUD_CREDENTIALS;

console.log('📋 環境変数の確認:');
console.log('━'.repeat(50));

if (!credentials) {
  console.log('❌ GOOGLE_CLOUD_CREDENTIALS が設定されていません');
  console.log('\n💡 設定方法:');
  console.log('   1. Google Cloud Consoleからサービスアカウントキーをダウンロード');
  console.log('   2. node scripts/setup-google-vision-env.js <JSONファイル> を実行');
  console.log('   または、.env.localに手動で追加\n');
  process.exit(1);
}

console.log('✅ GOOGLE_CLOUD_CREDENTIALS が設定されています');
console.log('   長さ:', credentials.length, '文字');

// クォートの処理
let credentialsValue = credentials.trim();
if ((credentialsValue.startsWith("'") && credentialsValue.endsWith("'")) || 
    (credentialsValue.startsWith('"') && credentialsValue.endsWith('"'))) {
  credentialsValue = credentialsValue.slice(1, -1);
}

// JSONパースの確認
console.log('\n📝 JSON形式の確認:');
console.log('━'.repeat(50));

try {
  const credentialsJson = JSON.parse(credentialsValue);
  
  // 必須フィールドの確認
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  let allFieldsPresent = true;
  
  requiredFields.forEach(field => {
    if (credentialsJson[field]) {
      console.log(`✅ ${field}: 設定済み`);
      if (field === 'private_key') {
        const keyLength = credentialsJson[field].length;
        console.log(`   長さ: ${keyLength} 文字`);
      } else if (field === 'client_email') {
        console.log(`   値: ${credentialsJson[field]}`);
      } else if (field === 'project_id') {
        console.log(`   値: ${credentialsJson[field]}`);
      }
    } else {
      console.log(`❌ ${field}: 未設定`);
      allFieldsPresent = false;
    }
  });
  
  if (!allFieldsPresent) {
    console.log('\n❌ 必須フィールドが不足しています');
    process.exit(1);
  }
  
  console.log('\n✅ JSON形式は正しいです');
  console.log('\n📦 認証情報の詳細:');
  console.log('━'.repeat(50));
  console.log('Project ID:', credentialsJson.project_id);
  console.log('Client Email:', credentialsJson.client_email);
  console.log('Type:', credentialsJson.type);
  
  // private_keyの形式確認
  if (credentialsJson.private_key.includes('\\n')) {
    console.log('⚠️  private_keyにエスケープされた改行(\\n)が含まれています');
    console.log('   これが正しい形式です（問題ありません）');
  } else if (credentialsJson.private_key.includes('\n')) {
    console.log('✅ private_keyに実際の改行が含まれています');
  }
  
  console.log('\n✅ 環境変数の設定は正常です');
  console.log('\n💡 次のステップ:');
  console.log('   1. 開発サーバーを再起動: npm run dev');
  console.log('   2. プロフィール登録画面で名刺画像をアップロードしてテスト');
  console.log('   3. ターミナルのログを確認（サーバー側のログに詳細が表示されます）');
  
} catch (parseError) {
  console.log('❌ JSON形式が正しくありません');
  console.log('   エラー:', parseError.message);
  console.log('\n💡 解決方法:');
  console.log('   1. JSONファイルの内容を確認してください');
  console.log('   2. シングルクォートで囲まれているか確認してください');
  console.log('   3. node scripts/setup-google-vision-env.js <JSONファイル> を再実行してください\n');
  process.exit(1);
}





