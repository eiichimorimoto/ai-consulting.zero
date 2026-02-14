/**
 * レポート・資料の出力依頼の判定と復唱文の生成
 * ユーザーがレポート/資料を要求した場合に復唱し、確認後にDifyで内容取得するための判定用
 */

/** レポート・資料の出力を依頼していると判断するキーワード（部分一致・大文字小文字無視） */
const REPORT_REQUEST_PATTERNS = [
  /レポート\s*(を?\s*)?(作成|作って|出力|出して|にして|ください|お願い)/i,
  /(この内容|今の回答|回答)\s*(を?\s*)?(レポート|資料)(に\s*)?(して|ください|お願い)/i,
  /資料\s*(を?\s*)?(作成|作って|出力|出して|ください|お願い)/i,
  /(作成|作って|出力|出して)\s*(して\s*)?(ください|お願い)/i,
  /(まとめて|まとめ)\s*(レポート|資料|報告)/i,
  /(報告書|提案書)\s*(を?\s*)?(作成|作って|ください)/i,
  /PDF\s*(で\s*)?(出して|ください|お願い)/i,
  /(出して|ください|お願い)\s*((レポート|資料|報告書)|PDF)/i,
]

/**
 * ユーザーメッセージがレポート・資料の出力依頼と判断されるか
 */
export function isReportRequest(message: string): boolean {
  const trimmed = message.trim()
  if (trimmed.length < 2) return false
  return REPORT_REQUEST_PATTERNS.some((re) => re.test(trimmed))
}

/** 確認として解釈する短い返答（復唱への同意） */
const CONFIRMATION_PATTERNS = [
  /^(はい|はいはい|うん|OK|ok|お願い|お願いします|お願いいたします|よろしく|よろしくお願いします|お願い)$/i,
  /^(\s*[はいうんおっけー]\s*)$/i,
  /^(かまいません|問題ありません|大丈夫|大丈夫です)$/i,
]

/**
 * ユーザーメッセージが復唱への「確認」（OK・お願い等）か
 */
export function isConfirmation(message: string): boolean {
  const trimmed = message.trim()
  if (trimmed.length > 50) return false
  return CONFIRMATION_PATTERNS.some((re) => re.test(trimmed))
}

/**
 * レポート対象の見出しを抽出（先頭行 or # 見出し、最大60字）
 * 復唱・作成完了文で「〇〇のレポート」の〇〇に使う
 */
export function deriveReportTitle(content: string): string {
  const trimmed = (content || "").trim()
  const firstLine = trimmed.split("\n")[0]?.trim() || ""
  const title = firstLine.replace(/^#+\s*/, "")
  if (title.length <= 60) return title || "AIレポート"
  return title.slice(0, 57) + "..."
}

/**
 * 復唱用のAI返答文を生成
 * explicitSubject がある場合はそれを表題に使い、なければ reportTargetContent の見出しまたはユーザー発言を使用
 */
export function buildEchoReply(
  userMessage: string,
  reportTargetContent?: string | null,
  explicitSubject?: string | null
): string {
  let subject: string
  if (explicitSubject && explicitSubject.trim().length > 0) {
    const s = explicitSubject.trim().replace(/[、,]\s*$/, "")
    subject = s.endsWith("について") ? s : `${s}について`
  } else if (reportTargetContent && reportTargetContent.trim().length > 0) {
    subject = deriveReportTitle(reportTargetContent)
  } else {
    const trimmed = userMessage.trim()
    subject = trimmed.length > 40 ? `${trimmed.slice(0, 37)}…` : trimmed
  }
  const quoted = `「${subject}」`
  return `${quoted}のレポート（資料）をお作りしますね。よろしければ「はい」や「お願いします」と送信してください。`
}

// --- レポート対象の参照解決（「何々の内容をレポートに」→ 会話を遡って何々に該当するAI回答を特定）---

/** 「これ」「この内容」「今の回答」等＝直前のAI回答を指す表現（メッセージ全体がそれだけのとき）→ 参照文字列は返さない */
const IMMEDIATE_REFERENCE_PATTERNS = [
  /^(これ|この内容|この回答|今の回答|上の回答)(を?)\s*(レポート|資料)/i,
  /^(これ|この内容|この回答)(に)?して\s*(ください|お願い)$/i,
]

/**
 * 抽出した参照の末尾「、これ」「、この内容」等を除去し、実質的なテーマ（〇〇）だけ返す
 * 「長期的視点での投資判断について、これ」→「長期的視点での投資判断について」
 */
function normalizeReportTargetRef(ref: string): string {
  const t = ref.replace(/\s+$/, "").trim()
  const suffix = /[、,]?\s*(これ|この内容|この回答)\s*$/
  const normalized = t.replace(suffix, "").trim()
  return normalized.length >= 1 ? normalized : t
}

/**
 * ユーザー発言からレポート対象の参照（何々）を抽出する
 * 「〇〇の内容をレポートに」「先ほどの〇〇を」「〇〇についてのレポート」等 → 〇〇 を返す
 * 「〇〇について、これをレポートに」→ 〇〇 を返す（「、これ」は除去して会話を遡って該当AI回答を探す）
 * 「これ」「この内容」「今の回答」のみの短い依頼 → null（直前のAI回答を対象とする）
 */
export function extractReportTargetReference(userMessage: string): string | null {
  const trimmed = userMessage.trim()
  if (trimmed.length < 3) return null
  if (IMMEDIATE_REFERENCE_PATTERNS.some((re) => re.test(trimmed))) return null

  // 「〇〇について、これをレポートに」を最優先で 〇〇 だけ抽出（ユーザーが前の話題を指している）
  const mAboutKore = trimmed.match(
    /(.+?)について\s*[、,]?\s*これ(を?)\s*(レポート|資料)(に|にして)/i
  )
  if (mAboutKore && mAboutKore[1]) {
    const ref = mAboutKore[1].trim()
    if (ref.length >= 1 && ref.length <= 80) return ref
  }

  const m1 = trimmed.match(/(.+?)の内容を\s*(レポート|資料)/i)
  if (m1 && m1[1]) {
    const ref = normalizeReportTargetRef(m1[1])
    if (ref.length >= 1 && ref.length <= 80) return ref
  }
  const m2 = trimmed.match(/先ほどの\s*(.+?)(を|の内容|について)/i)
  if (m2 && m2[1]) {
    const ref = normalizeReportTargetRef(m2[1].trim())
    if (ref.length >= 1 && ref.length <= 80) return ref
  }
  const m3 = trimmed.match(/(.+?)について(の)?\s*(レポート|資料)/i)
  if (m3 && m3[1]) {
    const ref = normalizeReportTargetRef(m3[1])
    if (ref.length >= 1 && ref.length <= 80) return ref
  }
  const m4 = trimmed.match(/(.+?)(を|の)\s*(レポート|資料)(に|にして)/i)
  if (m4 && m4[1]) {
    const raw = m4[1].trim()
    if (/^(これ|この|それ|その)$/.test(raw)) return null
    const ref = normalizeReportTargetRef(raw)
    if (ref.length >= 1 && ref.length <= 80) return ref
  }
  return null
}

export interface FindByReferenceOptions {
  /** true のときは「見出しに参照が含まれる」メッセージのみ対象。本文のみの一致では返さない（ユーザーが「〇〇について、これ」と明示したとき用） */
  titleOnly?: boolean
}

/**
 * 会話履歴から、参照文字列（何々）に該当するAI回答を探す
 * 復唱・「レポートを作成しました」は対象外
 * まず「見出し（先頭行）に参照が含まれる」メッセージを直近から探し、titleOnly でなければ本文に含まれるものを返す
 */
export function findAssistantMessageByReference(
  assistantMessages: Array<{ content: string }>,
  reference: string,
  options?: FindByReferenceOptions
): { content: string } | null {
  if (!reference || !assistantMessages?.length) return null
  const ref = reference.trim()
  const refLower = ref.toLowerCase()
  const reversed = [...assistantMessages].reverse()
  const titleOnly = options?.titleOnly === true

  const isEligible = (content: string) => {
    const t = content.trim()
    return t.length > 0 && !isEchoReplyContent(t) && !isReportCreatedContent(t)
  }

  // 1) 見出しに参照が含まれるメッセージ（その話題を主に扱った回答）
  for (const msg of reversed) {
    const content = (msg.content || "").trim()
    if (!isEligible(content)) continue
    const title = deriveReportTitle(content)
    if (title.toLowerCase().includes(refLower)) return msg
  }
  // 2) titleOnly のときはここで終了（ユーザー指示と別トピックのレポートになるのを防ぐ）
  if (titleOnly) return null
  // 3) 見出しに無ければ、本文に含まれる直近1件
  for (const msg of reversed) {
    const content = (msg.content || "").trim()
    if (!isEligible(content)) continue
    if (content.toLowerCase().includes(refLower)) return msg
  }
  return null
}

// --- 議論まとめレポート（「〇〇に関する議論だけをまとめてレポートに」）---

/** 保留クエリが「議論まとめ」用であることを示すプレフィックス（DBに保存する文字列の先頭） */
export const PENDING_DISCUSSION_SUMMARY_PREFIX = "__DISCUSSION_SUMMARY__:"

/** 議論をまとめてレポートにしたい依頼かどうかを判定するパターン */
const DISCUSSION_SUMMARY_REPORT_PATTERNS = [
  /(.+?)(の話|に関する議論|についての議論|のやり取り)\s*(だけ)?\s*(を?\s*)?(まとめて|整理して|要約して)\s*(レポート|資料|報告)/i,
  /(まとめて|整理して|要約して)\s*(レポート|資料)\s*(に\s*)?(して|ください|ほしい)/i,
  /(議論|やり取り)\s*(を?\s*)?(まとめて|整理して)\s*(レポート|資料)/i,
  /(.+?)\s*(の話|について)\s*(だけ)?\s*(まとめて|レポートに)/i,
]

/**
 * ユーザーメッセージが「〇〇に関する議論をまとめてレポートに」系の依頼か
 */
export function isDiscussionSummaryReportRequest(message: string): boolean {
  const trimmed = message.trim()
  if (trimmed.length < 5) return false
  return DISCUSSION_SUMMARY_REPORT_PATTERNS.some((re) => re.test(trimmed))
}

/**
 * 議論まとめの対象テーマ（何々）を抽出する（正規表現・キーワード）
 */
export function extractDiscussionSummaryTheme(message: string): string | null {
  const trimmed = message.trim()
  // 「〇〇の話」「〇〇に関する議論」「〇〇についてのやり取り」の〇〇をキャプチャ
  const m1 = trimmed.match(
    /(.+?)(の話|に関する議論|についての議論|のやり取り)\s*(だけ)?\s*(を?\s*)?(まとめて|整理|要約|レポート)/i
  )
  if (m1 && m1[1]) {
    const theme = m1[1].replace(/\s*[、。]+\s*$/, "").trim()
    if (theme.length >= 1 && theme.length <= 80) return theme
  }
  const m2 = trimmed.match(/(.+?)\s*(について)\s*(だけ)?\s*(まとめて|レポート)/i)
  if (m2 && m2[1]) {
    const theme = m2[1].trim()
    if (theme.length >= 1 && theme.length <= 80) return theme
  }
  // フォールバック: 「まとめて」「整理して」の直前の名詞句（簡易）
  const m3 = trimmed.match(/(.+?)(まとめて|整理して|要約して)\s*(レポート|資料)/i)
  if (m3 && m3[1]) {
    const part = m3[1].trim()
    const last = part
      .split(/[、。\s]+/)
      .filter(Boolean)
      .pop()
    if (last && last.length <= 40) return last
  }
  return null
}

/**
 * 議論まとめ用の復唱文を生成（テーマが取れれば「〇〇に関する…」、取れなければ汎用）
 */
export function buildDiscussionSummaryEchoReply(userMessage: string): string {
  const theme = extractDiscussionSummaryTheme(userMessage)
  if (theme) {
    return `${theme}に関する議論をまとめてレポートにする、という事ですね。よろしければ「はい」や「お願いします」と送信してください。`
  }
  return "これまでの議論のうち、ご指定のテーマについてまとめてレポートにする、という事ですね。よろしければ「はい」や「お願いします」と送信してください。"
}

/**
 * 保留クエリが議論まとめ用かどうかを判定（プレフィックスで識別）
 */
export function isPendingDiscussionSummary(pendingQuery: string | null): boolean {
  return !!pendingQuery && pendingQuery.startsWith(PENDING_DISCUSSION_SUMMARY_PREFIX)
}

/**
 * 議論まとめ用の保留クエリから元メッセージを取得
 */
export function unwrapPendingDiscussionSummaryQuery(pendingQuery: string): string {
  if (!pendingQuery.startsWith(PENDING_DISCUSSION_SUMMARY_PREFIX)) return pendingQuery
  return pendingQuery.slice(PENDING_DISCUSSION_SUMMARY_PREFIX.length)
}

// --- ユーザー指定トピックのみ（該当AI回答が見つからない場合）---

/** 保留が「ユーザーが指定したトピックのみ」であることを示すプレフィックス（会話履歴から抽出してレポート化する） */
export const PENDING_USER_TOPIC_PREFIX = "__USER_TOPIC__:"

/**
 * 該当するAI回答が見つからなかったとき、トピックとユーザー発言をまとめて保存する
 */
export function wrapPendingUserTopic(topic: string, userMessage: string): string {
  const t = topic.trim()
  const msg = (userMessage || "").trim()
  return `${PENDING_USER_TOPIC_PREFIX}${t}\n${msg}`
}

/** 保留がユーザー指定トピック（会話履歴から抽出）用かどうか */
export function isPendingUserTopic(pendingQuery: string | null): boolean {
  return !!pendingQuery && pendingQuery.startsWith(PENDING_USER_TOPIC_PREFIX)
}

/**
 * ユーザー指定トピック用の保留からトピックと元メッセージを取得
 */
export function unwrapPendingUserTopic(
  pendingQuery: string
): { topic: string; rawMessage: string } | null {
  if (!pendingQuery.startsWith(PENDING_USER_TOPIC_PREFIX)) return null
  const rest = pendingQuery.slice(PENDING_USER_TOPIC_PREFIX.length)
  const firstNewline = rest.indexOf("\n")
  const topic = firstNewline >= 0 ? rest.slice(0, firstNewline).trim() : rest.trim()
  const rawMessage = firstNewline >= 0 ? rest.slice(firstNewline + 1).trim() : ""
  return { topic, rawMessage }
}

/** 復唱メッセージの末尾で一致判定するパターン（レポート依頼・議論まとめ） */
const ECHO_REPLY_SUFFIX_PATTERNS = [
  /のレポート\s*（資料）\s*をお作りしますね。よろしければ「はい」/,
  /に関する議論をまとめてレポートにする、という事ですね。よろしければ/,
  /ご指定のテーマについてまとめてレポートにする、という事ですね。よろしければ/,
]

/**
 * AIメッセージ本文が「復唱」（レポート依頼確認）かどうか
 * 復唱はレポートに値しないため、エクスポート対象から除外する
 */
export function isEchoReplyContent(content: string): boolean {
  const trimmed = (content || "").trim()
  if (trimmed.length < 20) return false
  return ECHO_REPLY_SUFFIX_PATTERNS.some((re) => re.test(trimmed))
}

/**
 * 確認後にレポートを作成した旨の短い返答文を生成
 * pendingQuery が直前のAI回答全文の場合は見出しだけを使う
 * __USER_TOPIC__ の場合はトピックをそのまま表題に使う
 */
export function buildReportCreatedReply(pendingQuery: string): string {
  const userTopic = unwrapPendingUserTopic(pendingQuery)
  if (userTopic) {
    const subject = userTopic.topic.endsWith("について")
      ? userTopic.topic
      : `${userTopic.topic}について`
    return `「${subject}」のレポートを作成しました。`
  }
  const raw = unwrapPendingDiscussionSummaryQuery(pendingQuery)
  const trimmed = raw.trim()
  const subject = trimmed.length > 0 ? deriveReportTitle(trimmed) : "AIレポート"
  return `「${subject}」のレポートを作成しました。`
}

/** 「〇〇のレポートを作成しました。」のパターン（エクスポート対象から除外し、直後のメッセージをレポート本文とする） */
const REPORT_CREATED_PATTERN = /^「.+」のレポートを作成しました。\.?$/

/**
 * AIメッセージ本文が「レポートを作成しました」の通知文かどうか
 * この直後のassistantメッセージがレポート本文（依頼された1件）となる
 */
export function isReportCreatedContent(content: string): boolean {
  const trimmed = (content || "").trim()
  return REPORT_CREATED_PATTERN.test(trimmed)
}
