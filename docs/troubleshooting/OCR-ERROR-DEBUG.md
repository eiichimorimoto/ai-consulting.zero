# OCR失敗エラーのデバッグ手順

## 🔍 エラー確認手順

### ステップ1: ブラウザの開発者ツールで確認

1. **ブラウザの開発者ツールを開く**（F12）
2. **Consoleタブ**を確認
   - エラーメッセージを探す
   - `❌ OCR処理エラー` というメッセージを探す
   - エラーの詳細を確認

3. **Networkタブ**を確認
   - `/api/ocr-business-card` リクエストを探す
   - **Status Code**を確認:
     - `200`: 成功
     - `401`: 認証エラー
     - `400`: リクエストエラー
     - `500`: サーバーエラー
   - **Responseタブ**でエラーメッセージの詳細を確認

### ステップ2: 開発サーバーのログを確認

開発サーバーを起動しているターミナルで以下を確認：

```
🚀 OCR API Route called at: ...
✅ 認証成功: { userId: ..., email: ... }
=== OCR API Debug Info ===
Has ANTHROPIC_API_KEY: Yes/No
Image data length: ...
```

エラーがある場合：
```
❌ Claude API error: ...
Error name: ...
Error message: ...
```

## 🐛 よくあるエラーと対処法

### 1. 認証エラー（401）

**症状**: `認証エラーが発生しました。ログインし直してください。`

**原因**:
- セッションが切れている
- 認証トークンが無効

**対処法**:
1. ページを再読み込み
2. ログアウトして再度ログイン
3. ブラウザのCookieをクリア

### 2. APIキーエラー

**症状**: `ANTHROPIC_API_KEYが無効です`

**原因**:
- 環境変数`ANTHROPIC_API_KEY`が設定されていない
- APIキーが無効

**対処法**:
1. `.env.local`に`ANTHROPIC_API_KEY`が設定されているか確認
2. 開発サーバーを再起動
3. Vercelの環境変数を確認（本番環境の場合）

### 3. ネットワークエラー

**症状**: `ネットワークエラーが発生しました。インターネット接続を確認してください。`

**原因**:
- インターネット接続の問題
- Anthropic APIへの接続が失敗

**対処法**:
1. インターネット接続を確認
2. ファイアウォールの設定を確認
3. しばらく待ってから再度試す

### 4. 画像データエラー

**症状**: `画像データの形式が正しくありません。別の画像を試してください。`

**原因**:
- 画像ファイルが破損している
- サポートされていない形式

**対処法**:
1. JPEGまたはPNG形式の画像を使用
2. 別の画像を試す
3. 画像ファイルを再保存

### 5. APIレート制限（429）

**症状**: `APIの利用制限に達しました。しばらく待ってから再度お試しください。`

**原因**:
- Anthropic APIのレート制限に達した

**対処法**:
1. しばらく待ってから再度試す
2. APIプランを確認

### 6. サーバーエラー（500）

**症状**: `サーバーエラーが発生しました。しばらく待ってから再度お試しください。`

**原因**:
- Claude APIの内部エラー
- サーバー側の処理エラー

**対処法**:
1. 開発サーバーのログを確認
2. しばらく待ってから再度試す
3. 画像を変更して再度試す

## 📋 デバッグチェックリスト

- [ ] ブラウザのConsoleタブでエラーメッセージを確認
- [ ] Networkタブで`/api/ocr-business-card`のStatus Codeを確認
- [ ] 開発サーバーのログを確認
- [ ] `.env.local`に`ANTHROPIC_API_KEY`が設定されているか確認
- [ ] 画像ファイルの形式がJPEGまたはPNGか確認
- [ ] 画像ファイルのサイズが10MB以下か確認
- [ ] インターネット接続を確認

## 🔧 詳細なログを確認する方法

### ブラウザのConsoleタブ

以下のようなログが表示されます：

```
🚀 processOCRWithImage開始: { imageDataLength: ..., hasImageData: true }
⏳ OCR処理を開始します...
📸 ファイルデータを解析: { mimeType: 'image/jpeg', ... }
📤 OCR APIを呼び出します...
✅ 認証確認完了、OCR APIを呼び出します: { userId: ..., email: ... }
📥 OCR API応答: { status: 200, statusText: 'OK', ok: true }
✅ OCR API結果: { data: { personName: ..., companyName: ... } }
```

エラーの場合：
```
❌ OCR処理エラー: Error: ...
名刺の読み取りに失敗しました。手動で入力してください。
```

### 開発サーバーのログ

以下のようなログが表示されます：

```
🚀 OCR API Route called at: 2024-12-19T...
✅ 認証成功: { userId: ..., email: ... }
=== OCR API Debug Info ===
Has ANTHROPIC_API_KEY: Yes
Image data length: 12345
🔗 Anthropic Claude APIに接続中...
📸 画像をAnthropic Claude APIに送信します...
✅ Claude API response received
⏱️ API応答時間: 2345 ms
📋 抽出された情報: { ... }
```

エラーの場合：
```
❌ Claude API error: Error: ...
Error name: ...
Error message: ...
Error stack: ...
💡 ヒント: ...
```

## 📞 サポート

問題が解決しない場合：
1. ブラウザのConsoleタブとNetworkタブのスクリーンショットを取得
2. 開発サーバーのログをコピー
3. エラーメッセージの全文を記録


