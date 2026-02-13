/**
 * 解約確認通知メール
 * @see stripe-payment-spec-v2.2.md §6-6
 */

export interface CancellationConfirmedParams {
  userName: string
  cancelType: 'end_of_period' | 'immediate'
  periodEndDate?: string // YYYY-MM-DD
  pricingUrl: string
}

export function cancellationConfirmedTemplate(params: CancellationConfirmedParams): {
  subject: string
  html: string
} {
  const isEndOfPeriod = params.cancelType === 'end_of_period'

  return {
    subject: '【SolveWise】サブスクリプション解約のご連絡',
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #6b7280;">サブスクリプション解約のご連絡</h2>
  <p>${params.userName} 様</p>
  <p>SolveWiseのサブスクリプション解約手続きが完了しました。</p>
  ${isEndOfPeriod ? `
  <p style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
    現在の請求期間終了日（${params.periodEndDate || '—'}）までサービスをご利用いただけます。<br/>
    期間終了後、Freeプランに移行されます。
  </p>
  ` : `
  <p style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
    即時解約が完了しました。Freeプランに移行されました。<br/>
    データは30日間保持されます。
  </p>
  `}
  <p>再度ご利用をご検討の際は、いつでもプランをご契約いただけます。</p>
  <p style="margin: 24px 0;">
    <a href="${params.pricingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #6b7280; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">
      プランを確認する
    </a>
  </p>
  <p style="font-size: 14px; color: #666;">SolveWiseをご利用いただきありがとうございました。</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af;">SolveWise - AI経営コンサルティング</p>
</body>
</html>
    `.trim(),
  }
}
