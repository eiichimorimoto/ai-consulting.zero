/**
 * 督促メール Day 7: お支払いの確認のお願い（再送）+ サービス停止予告
 * @see stripe-payment-spec-v2.2.md §6-6
 */

export interface DunningDay7Params {
  userName: string
  updatePaymentUrl: string
}

export function dunningDay7Template(params: DunningDay7Params): {
  subject: string
  html: string
} {
  return {
    subject: "【SolveWise】お支払いの確認のお願い（再送）",
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #d97706;">お支払いの確認のお願い</h2>
  <p>${params.userName} 様</p>
  <p>SolveWiseのご利用料金のお支払いが確認できておりません。</p>
  <p style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #d97706;">
    <strong>⚠️ お支払いが確認できない場合、サービスが停止される場合があります。</strong><br/>
    お手数ですが、お支払い方法をご確認・更新ください。
  </p>
  <p style="margin: 24px 0;">
    <a href="${params.updatePaymentUrl}" style="display: inline-block; padding: 12px 24px; background-color: #d97706; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      お支払い方法を更新する
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
