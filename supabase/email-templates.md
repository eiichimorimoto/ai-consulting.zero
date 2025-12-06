# SolveWise メールテンプレート設定

## Supabaseダッシュボードでの設定方法

1. Supabaseダッシュボードにアクセス: https://supabase.com/dashboard
2. プロジェクト「ai^consulting-zero」を選択
3. 左メニューから「Authentication」→「Email Templates」を開く
4. 「Confirm signup」テンプレートを選択
5. 以下のテンプレートをコピー＆ペースト

---

## 登録確認メールテンプレート

### 件名（Subject）
```
SolveWiseへのご登録ありがとうございます - メールアドレスの確認
```

### HTMLテンプレート

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Noto Sans JP', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 30px 30px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; text-align: center;">
                SolveWiseへのご登録ありがとうございます
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 20px 0;">
                この度は、SolveWiseのAIコンサルティングサービスにご登録いただき、誠にありがとうございます。
              </p>
              
              <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 30px 0;">
                以下のボタンをクリックして、メールアドレスを確認してください：
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #2563eb; border-radius: 8px;">
                          <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                            メールアドレスを確認する
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 30px 0 20px 0;">
                ボタンがクリックできない場合は、以下のリンクをコピーしてブラウザに貼り付けてください：
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 6px; padding: 12px; margin: 20px 0;">
                <tr>
                  <td>
                    <p style="word-break: break-all; color: #2563eb; font-size: 14px; margin: 0;">
                      {{ .ConfirmationURL }}
                    </p>
                  </td>
                </tr>
              </table>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              
              <h3 style="font-size: 18px; font-weight: 600; color: #1e40af; margin: 0 0 16px 0;">SolveWiseについて</h3>
              <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 12px 0;">
                SolveWiseは、AIを活用した24時間365日の経営支援サービスです。以下の機能をご利用いただけます：
              </p>
              <ul style="font-size: 14px; line-height: 1.8; color: #374151; margin: 0 0 20px 0; padding-left: 20px;">
                <li>AIによる経営課題の分析とアドバイス</li>
                <li>名刺スキャンによる自動情報管理</li>
                <li>企業情報の自動取得と分析</li>
                <li>コンサルティングセッションの記録とレポート生成</li>
              </ul>
              
              <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 30px 0;">
                メールアドレスの確認後、すぐにサービスをご利用いただけます。
              </p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              
              <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 0 0 12px 0;">
                このメールに心当たりがない場合は、無視していただいて構いません。<br>
                このメールの配信を停止したい場合は、<a href="{{ .SiteURL }}/auth/unsubscribe" style="color: #2563eb; text-decoration: underline;">こちら</a>から配信停止できます。
              </p>
              
              <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 16px 0 0 0;">
                SolveWise運営チーム<br>
                <a href="https://solvewise.com" style="color: #2563eb; text-decoration: underline;">https://solvewise.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### プレーンテキストテンプレート（フォールバック用）

```
SolveWiseへのご登録ありがとうございます

この度は、SolveWiseのAIコンサルティングサービスにご登録いただき、誠にありがとうございます。

以下のリンクをクリックして、メールアドレスを確認してください：

{{ .ConfirmationURL }}

---

SolveWiseについて
SolveWiseは、AIを活用した24時間365日の経営支援サービスです。以下の機能をご利用いただけます：

・AIによる経営課題の分析とアドバイス
・名刺スキャンによる自動情報管理
・企業情報の自動取得と分析
・コンサルティングセッションの記録とレポート生成

メールアドレスの確認後、すぐにサービスをご利用いただけます。

---

このメールに心当たりがない場合は、無視していただいて構いません。
このメールの配信を停止したい場合は、{{ .SiteURL }}/auth/unsubscribe から配信停止できます。

SolveWise運営チーム
https://solvewise.com
```

---

## パスワードリセットメールテンプレート

### 件名（Subject）
```
SolveWise - パスワードリセットのご案内
```

### HTMLテンプレート

```html
<h2>パスワードリセットのご案内</h2>

<p>SolveWiseのパスワードリセットリクエストを受け付けました。</p>

<p>以下のボタンをクリックして、新しいパスワードを設定してください：</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">パスワードをリセットする</a></p>

<p>ボタンがクリックできない場合は、以下のリンクをコピーしてブラウザに貼り付けてください：</p>
<p style="word-break: break-all; color: #2563eb;">{{ .ConfirmationURL }}</p>

<p style="color: #dc2626; font-weight: 600;">※ このリンクは24時間有効です。</p>
<p style="color: #dc2626;">※ このリクエストをしていない場合は、このメールを無視してください。アカウントのセキュリティに影響はありません。</p>

<hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">

<p style="color: #6b7280; font-size: 12px;">
  SolveWise運営チーム<br>
  <a href="https://solvewise.com">https://solvewise.com</a>
</p>
```

---

## メール変更確認メールテンプレート

### 件名（Subject）
```
SolveWise - メールアドレス変更の確認
```

### HTMLテンプレート

```html
<h2>メールアドレス変更の確認</h2>

<p>SolveWiseアカウントのメールアドレス変更リクエストを受け付けました。</p>

<p>新しいメールアドレス（{{ .Email }}）を確認するため、以下のボタンをクリックしてください：</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">メールアドレスを確認する</a></p>

<p>ボタンがクリックできない場合は、以下のリンクをコピーしてブラウザに貼り付けてください：</p>
<p style="word-break: break-all; color: #2563eb;">{{ .ConfirmationURL }}</p>

<p style="color: #dc2626;">※ このリクエストをしていない場合は、このメールを無視してください。アカウントのセキュリティに影響はありません。</p>

<hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">

<p style="color: #6b7280; font-size: 12px;">
  SolveWise運営チーム<br>
  <a href="https://solvewise.com">https://solvewise.com</a>
</p>
```

---

## 設定手順

1. Supabaseダッシュボードにアクセス
2. 「Authentication」→「Email Templates」を開く
3. 各テンプレート（Confirm signup、Reset password、Change email address）を選択
4. 上記のテンプレートをコピー＆ペースト
5. 「Save」をクリック

## 利用可能な変数

- `{{ .ConfirmationURL }}` - 確認リンクのURL
- `{{ .Email }}` - ユーザーのメールアドレス
- `{{ .SiteURL }}` - サイトのURL
- `{{ .Token }}` - 確認トークン（通常は使用しない）
- `{{ .TokenHash }}` - トークンのハッシュ（通常は使用しない）

## カスタマイズのポイント

- ブランドカラー（#2563eb）を使用
- 日本語で丁寧な表現を使用
- SolveWiseのサービス内容を簡潔に説明
- セキュリティに関する注意事項を明記

