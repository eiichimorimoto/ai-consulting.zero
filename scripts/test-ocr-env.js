#!/usr/bin/env node

// OCR環境変数のテストスクリプト
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

console.log('🔍 OCR環境変数の確認\n');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.localファイルが見つかりません');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

let found = false;
let credentialsLine = '';

for (const line of lines) {
  if (line.trim().startsWith('GOOGLE_CLOUD_CREDENTIALS=')) {
    found = true;
    credentialsLine = line;
    break;
  }
}

if (!found) {
  console.error('❌ GOOGLE_CLOUD_CREDENTIALS環境変数が見つかりません');
  console.log('\n設定方法:');
  console.log('1. Google Cloud Consoleでサービスアカウントキー（JSON）をダウンロード');
  console.log('2. 以下のコマンドを実行:');
  console.log('   ./scripts/setup-google-vision-env.sh ~/Downloads/your-json-file.json');
  process.exit(1);
}

// 環境変数の値を取得（シングルクォートを除去）
let credentials = credentialsLine.split('=').slice(1).join('='); // =が複数ある場合に対応
credentials = credentials.trim();

// シングルクォートまたはダブルクォートで囲まれている場合
if ((credentials.startsWith("'") && credentials.endsWith("'")) || 
    (credentials.startsWith('"') && credentials.endsWith('"'))) {
  credentials = credentials.slice(1, -1);
}

// エスケープされたシングルクォートを元に戻す
credentials = credentials.replace(/\\'/g, "'");

try {
  const credentialsJson = JSON.parse(credentials);
  
  console.log('✅ GOOGLE_CLOUD_CREDENTIALS環境変数が設定されています\n');
  console.log('📋 設定内容:');
  console.log(`   Project ID: ${credentialsJson.project_id || 'N/A'}`);
  console.log(`   Client Email: ${credentialsJson.client_email || 'N/A'}`);
  console.log(`   Private Key: ${credentialsJson.private_key ? '設定済み' : '未設定'}`);
  console.log('\n✅ 環境変数の形式は正しいです');
  console.log('\n💡 次のステップ:');
  console.log('1. 開発サーバーを再起動: npm run dev');
  console.log('2. プロフィール登録画面で名刺画像をアップロード');
  console.log('3. ブラウザのコンソールでログを確認');
  
} catch (error) {
  console.error('❌ JSON形式が正しくありません');
  console.error('エラー:', error.message);
  console.log('\n修正方法:');
  console.log('1. スクリプトを使用して再設定:');
  console.log('   ./scripts/setup-google-vision-env.sh ~/Downloads/your-json-file.json');
  process.exit(1);
}

