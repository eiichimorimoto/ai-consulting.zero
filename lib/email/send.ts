/**
 * メール送信基盤（Resend APIラッパー）
 *
 * 督促・解約通知・サービス復旧メールの送信に使用。
 * Stripe自動メール（初回決済失敗・請求書発行）とは別系統。
 *
 * 環境変数: RESEND_API_KEY
 *
 * @see stripe-payment-spec-v2.2.md §6-7
 */

import { Resend } from 'resend'

let resendInstance: Resend | null = null

function getResend(): Resend {
  if (resendInstance) return resendInstance

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY が設定されていません')
  }

  resendInstance = new Resend(apiKey)
  return resendInstance
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  /** テスト用: 送信をスキップする */
  dryRun?: boolean
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * メールを送信する
 *
 * @param params - 送信パラメータ
 * @returns 送信結果
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (params.dryRun) {
    console.log('[Email] Dry run:', { to: params.to, subject: params.subject })
    return { success: true, id: 'dry-run' }
  }

  try {
    const resend = getResend()
    const fromAddress = process.env.EMAIL_FROM || 'SolveWise <noreply@solvewise.jp>'

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })

    if (error) {
      console.error('[Email] Send failed:', error)
      return { success: false, error: error.message }
    }

    console.log(`[Email] Sent: ${params.subject} to ${params.to} (id: ${data?.id})`)
    return { success: true, id: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Email] Error:', message)
    return { success: false, error: message }
  }
}
