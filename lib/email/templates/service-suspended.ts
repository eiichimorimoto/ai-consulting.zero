/**
 * サービス停止通知メール
 * @see stripe-payment-spec-v2.2.md §6-6
 */

export interface ServiceSuspendedParams {
  userName: string
  updatePaymentUrl: string
}

export function serviceSuspendedTemplate(params: ServiceSuspendedParams): {
  subject: string
  html: string
} {
  return {
    subject: '【SolveWise】サービス停止のご連絡',
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #dc2626;">サービス停止のご連絡</h2>
  <p>${params.userName} 様</p>
  <p>お支払いが確認できなかったため、SolveWiseのサービスを停止させていただきました。</p>
  <p style="background: #fef2f2; padding: 16px; border-radius: 8px;">
    <strong>サービスの復旧方法:</strong><br/>
    お支払い方法を更新いただくと、サービスが自動的に復旧されます。<br/>
    <strong>30日以内にお支払いが確認できない場合、データが削除されます。</strong>
  </p>
  <p style="margin: 24px 0;">
    <a href="${params.updatePaymentUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      お支払い方法を更新してサービスを復旧する
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
