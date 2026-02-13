/**
 * 督促メール Day 14: 【重要】サービス停止のお知らせ
 * @see stripe-payment-spec-v2.2.md §6-6
 */

export interface DunningDay14Params {
  userName: string
  updatePaymentUrl: string
}

export function dunningDay14Template(params: DunningDay14Params): {
  subject: string
  html: string
} {
  return {
    subject: '【重要】SolveWise サービス停止のお知らせ',
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #dc2626;">【重要】サービス停止のお知らせ</h2>
  <p>${params.userName} 様</p>
  <p>SolveWiseのご利用料金のお支払いが長期間確認できておりません。</p>
  <p style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;">
    <strong>🚨 3日以内にお支払いが確認できない場合、サービスを停止させていただきます。</strong><br/>
    サービス停止後も30日間はデータを保持いたしますので、お支払い後に復旧が可能です。
  </p>
  <p style="margin: 24px 0;">
    <a href="${params.updatePaymentUrl}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      今すぐお支払い方法を更新する
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
