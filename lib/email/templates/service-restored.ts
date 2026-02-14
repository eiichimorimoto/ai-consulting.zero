/**
 * サービス復旧通知メール
 * @see stripe-payment-spec-v2.2.md §6-6
 */

export interface ServiceRestoredParams {
  userName: string
  dashboardUrl: string
}

export function serviceRestoredTemplate(params: ServiceRestoredParams): {
  subject: string
  html: string
} {
  return {
    subject: "【SolveWise】サービス復旧のご連絡",
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #16a34a;">サービス復旧のご連絡</h2>
  <p>${params.userName} 様</p>
  <p>お支払いが確認でき、SolveWiseのサービスが復旧されました。</p>
  <p style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #16a34a;">
    ✅ サービスは正常にご利用いただける状態です。<br/>
    引き続きSolveWiseをご活用ください。
  </p>
  <p style="margin: 24px 0;">
    <a href="${params.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      ダッシュボードへ
    </a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">SolveWise - AI経営コンサルティング</p>
</body>
</html>
    `.trim(),
  }
}
