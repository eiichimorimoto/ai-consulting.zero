/**
 * 督促メール Day 3: お支払いの確認のお願い
 * @see stripe-payment-spec-v2.2.md §6-6
 */

export interface DunningDay3Params {
  userName: string
  updatePaymentUrl: string
}

export function dunningDay3Template(params: DunningDay3Params): {
  subject: string
  html: string
} {
  return {
    subject: '【SolveWise】お支払いの確認のお願い',
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #1e40af;">お支払いの確認のお願い</h2>
  <p>${params.userName} 様</p>
  <p>いつもSolveWiseをご利用いただきありがとうございます。</p>
  <p>先日のお支払いが正常に処理されませんでした。現在、自動で再試行を行っておりますが、お手数ですがお支払い方法をご確認ください。</p>
  <p style="margin: 24px 0;">
    <a href="${params.updatePaymentUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      お支払い方法を確認する
    </a>
  </p>
  <p style="font-size: 14px; color: #666;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">SolveWise - AI経営コンサルティング</p>
</body>
</html>
    `.trim(),
  }
}
