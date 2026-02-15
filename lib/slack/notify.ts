/**
 * Slack通知基盤（Incoming Webhook）
 *
 * 運用イベントをSlackチャンネルに通知する。
 * lib/email/send.ts と同じ設計パターン。
 *
 * 環境変数: SLACK_WEBHOOK_URL
 *
 * @example
 * ```typescript
 * await notifySlack({
 *   text: "新規登録: user@example.com",
 *   severity: "info",
 * })
 * ```
 */

import type { SendSlackParams, SendSlackResult, SlackBlock, SlackSeverity } from "@/types/admin"

const SEVERITY_EMOJI: Record<SlackSeverity, string> = {
  info: "ℹ️",
  warning: "⚠️",
  error: "🚨",
}

const SEVERITY_COLOR: Record<SlackSeverity, string> = {
  info: "#36a64f",
  warning: "#daa038",
  error: "#cc0000",
}

/**
 * Slackにメッセージを送信する
 */
export async function notifySlack(params: SendSlackParams): Promise<SendSlackResult> {
  if (params.dryRun) {
    console.log("[Slack] Dry run:", { text: params.text, severity: params.severity })
    return { success: true }
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    // Slack未設定時はログのみ（必須ではない）
    console.log("[Slack] SLACK_WEBHOOK_URL not configured, skipping:", params.text)
    return { success: true }
  }

  try {
    const severity = params.severity || "info"
    const emoji = SEVERITY_EMOJI[severity]

    const payload: Record<string, unknown> = {
      text: `${emoji} ${params.text}`,
    }

    // Block Kit形式が指定されている場合はそちらを使用
    if (params.blocks && params.blocks.length > 0) {
      payload.blocks = params.blocks
    } else {
      // シンプルなattachment形式
      payload.attachments = [
        {
          color: SEVERITY_COLOR[severity],
          text: params.text,
          footer: "SolveWise Admin",
          ts: Math.floor(Date.now() / 1000),
        },
      ]
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Slack] Send failed (${response.status}):`, errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    console.log(`[Slack] Sent: ${params.text.substring(0, 80)}...`)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Slack] Error:", message)
    return { success: false, error: message }
  }
}

/**
 * Block Kit形式のメッセージを構築するヘルパー
 */
export function buildSlackBlocks(params: {
  title: string
  fields?: Array<{ label: string; value: string }>
  text?: string
  severity?: SlackSeverity
}): SlackBlock[] {
  const blocks: SlackBlock[] = []
  const severity = params.severity || "info"
  const emoji = SEVERITY_EMOJI[severity]

  // ヘッダー
  blocks.push({
    type: "header",
    text: { type: "plain_text", text: `${emoji} ${params.title}` },
  })

  // 本文
  if (params.text) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: params.text },
    })
  }

  // フィールド（2列表示）
  if (params.fields && params.fields.length > 0) {
    blocks.push({
      type: "section",
      fields: params.fields.map((f) => ({
        type: "mrkdwn" as const,
        text: `*${f.label}*\n${f.value}`,
      })),
    })
  }

  // タイムスタンプ
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `SolveWise Admin | ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
      },
    ],
  })

  return blocks
}
