import { NextResponse } from "next/server"
import OpenAI from "openai"
import { convertPdfBufferToPngBuffer } from "@/lib/ocr/pdf-to-png"
import { checkAIResult, checkSearchResult } from "@/lib/fact-checker"

export const runtime = "nodejs"
export const maxDuration = 120 // Vercelの関数実行時間制限（2分）

// リトライロジック付きfetch（指数バックオフ）
const fetchWithRetry = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 30_000,
  maxRetries = 3
): Promise<Response> => {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    
  try {
      const response = await fetch(input, { ...init, signal: controller.signal })
    clearTimeout(timeoutId)
      
      // 成功した場合は即座に返す
      if (response.ok || attempt === maxRetries) {
        return response
      }
      
      // 5xxエラーの場合はリトライ
      if (response.status >= 500 && attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000) // 最大5秒
        console.log(`⚠️ サーバーエラー (${response.status})、${backoffMs}ms後にリトライ (${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
        continue
      }
      
      return response
    } catch (error: any) {
      clearTimeout(timeoutId)
      lastError = error
      
      // AbortError（タイムアウト）の場合はリトライ
      if ((error?.name === 'AbortError' || error?.message?.includes('aborted')) && attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000) // 最大5秒
        console.log(`⚠️ タイムアウト、${backoffMs}ms後にリトライ (${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
        continue
      }
      
      // 最後の試行でエラーが発生した場合はエラーを投げる
      if (attempt === maxRetries) {
        throw error
      }
    }
  }
  
  throw lastError || new Error('リトライが失敗しました')
}

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 30_000) => {
  return fetchWithRetry(input, init, timeoutMs, 3)
}

const stripHtmlToText = (html: string) => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const safeSlice = (text: string, maxChars: number) => {
  if (!text) return ""
  return text.length > maxChars ? text.slice(0, maxChars) : text
}

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

const fetchHtmlToText = async (url: string, timeoutMs = 30_000): Promise<{
  ok: boolean
  status: number
  contentType: string
  html: string
  text: string
  error?: string
  errorType?: string
}> => {
  try {
  const resp = await fetchWithTimeout(
    url,
    {
      method: "GET",
      headers: {
        "User-Agent": DEFAULT_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    },
    timeoutMs
  )
  const ct = resp.headers.get("content-type") || ""
  const html = await resp.text()
  const text = resp.ok && ct.includes("text/html") ? stripHtmlToText(html) : ""
  return { ok: resp.ok, status: resp.status, contentType: ct, html, text }
  } catch (error: any) {
    // エラーの詳細を返す
    let errorMessage = error?.message || String(error)
    let errorType = error?.name || "UnknownError"
    
    // AbortError（タイムアウト）の場合は特別なメッセージ
    if (error?.name === 'AbortError' || errorMessage.includes('aborted') || errorMessage.includes('AbortError')) {
      errorMessage = `サイトへの接続がタイムアウトしました（${timeoutMs / 1000}秒、最大3回リトライ済み）。サイトの応答が遅いか、アクセス制限がある可能性があります。しばらく時間をおいてから再度お試しください。`
      errorType = 'TimeoutError'
    }
    
    return {
      ok: false,
      status: 0,
      contentType: "",
      html: "",
      text: "",
      error: errorMessage,
      errorType: errorType,
    }
  }
}

const extractInternalLinksFromHtml = (html: string, baseUrl: string) => {
  const base = new URL(baseUrl)
  const origin = base.origin
  const links = new Set<string>()
  const re = /href\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const href = m[1]
    if (!href) continue
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) continue
    const abs = toAbsoluteUrl(origin, href)
    try {
      const u = new URL(abs)
      if (u.origin !== origin) continue
      links.add(u.toString())
    } catch {
      // ignore
    }
  }

  const keywordScore = (url: string) => {
    const p = url.toLowerCase()
    const keywords = [
      ["ir", 6],
      ["investor", 6],
      ["investors", 6],
      ["company", 5],
      ["corporate", 5],
      ["about", 4],
      ["profile", 4],
      ["overview", 4],
      ["outline", 4],
      ["service", 4],
      ["product", 4],
      ["business", 3],
      ["recruit", 2],
      ["office", 3],
      ["access", 2],
      ["factory", 3],
      ["shop", 3],
      ["store", 3],
      ["location", 2],
      ["history", 2],
    ] as const
    let score = 0
    for (const [k, w] of keywords) if (p.includes(k)) score += w
    return score
  }

  return Array.from(links)
    .sort((a, b) => keywordScore(b) - keywordScore(a))
    .slice(0, 10)
}

type BraveWebResult = { url: string; title?: string; description?: string }

const braveWebSearch = async (query: string, count = 5): Promise<BraveWebResult[]> => {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (!key) return []
  const endpoint = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`
  const resp = await fetchWithTimeout(
    endpoint,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": key,
        "User-Agent": DEFAULT_UA,
      },
    },
    12_000
  )
  if (!resp.ok) return []
  const json: any = await resp.json()
  const items: any[] = json?.web?.results || []
  return items
    .map((r) => ({ url: r?.url, title: r?.title, description: r?.description }))
    .filter((r) => typeof r.url === "string" && r.url.length > 0)
}

const guessCompanyName = (text: string) => {
  const m = text.match(/(株式会社|有限会社|合同会社)\s*([^\s、。]{2,40})/)
  if (m) return `${m[1]}${m[2]}`.replace(/\s+/g, "")
  return ""
}

/**
 * 会社名から法人格（株式会社、有限会社等）を除去して、カナ変換用の名称を取得
 */
const stripCorporateSuffix = (name: string): string => {
  if (!name) return ""
  // 法人格を除去
  return name
    .replace(/^(株式会社|有限会社|合同会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|医療法人|学校法人|社会福祉法人|宗教法人|特定非営利活動法人|NPO法人)\s*/g, "")
    .replace(/\s*(株式会社|有限会社|合同会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|医療法人|学校法人|社会福祉法人|宗教法人|特定非営利活動法人|NPO法人)$/g, "")
    .replace(/（株）|㈱|\(株\)/g, "")
    .replace(/（有）|㈲|\(有\)/g, "")
    .replace(/（合）|\(合\)/g, "")
    .trim()
}

const extractPdfLinksFromHtml = (html: string) => {
  // href="...pdf" を雑に抽出（IRページのE-IRリンクから決算短信/有報PDFを拾う用途）
  const links = new Set<string>()
  const re = /href\s*=\s*["']([^"']+\.pdf[^"']*)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const url = m[1]
    if (!url) continue
    links.add(url)
  }
  return Array.from(links)
}

const toAbsoluteUrl = (base: string, href: string) => {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

const parseEmployeesNumber = (text: string): number | null => {
  // 例: "従業員数 1,234名" / "従業員：1234人"
  const m = text.replace(/,/g, "").match(/(\d{1,7})\s*(?:名|人)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

const parseOkuYen = (text: string): number | null => {
  // 例: "469億8,400万円" / "46,984百万円"
  const normalized = text.replace(/,/g, "")

  // 百万円 → 億円（百万円×1,000,000円 / 100,000,000円 = 百万円 / 100）
  const hyakuMan = normalized.match(/(\d{1,10})\s*百万円/)
  if (hyakuMan) {
    const v = Number(hyakuMan[1])
    if (Number.isFinite(v)) return v / 100
  }

  const oku = normalized.match(/(\d+(?:\.\d+)?)\s*億/)
  if (oku) {
    const okuVal = Number(oku[1])
    if (!Number.isFinite(okuVal)) return null
    const man = normalized.match(/億\s*(\d+(?:\.\d+)?)\s*万/)
    const manVal = man ? Number(man[1]) : 0
    if (man && !Number.isFinite(manVal)) return okuVal
    return okuVal + manVal / 10000
  }

  // 円単位だけがある場合は扱わない（誤爆しやすい）
  return null
}

const extractRecentYears = (text: string) => {
  const years = new Set<number>()
  const re = /(20\d{2})\s*年/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const y = Number(m[1])
    if (Number.isFinite(y)) years.add(y)
  }
  return Array.from(years).sort((a, b) => b - a)
}

const shouldTreatAsStale = (text: string, maxAgeYears = 2) => {
  const nowY = new Date().getFullYear()
  const years = extractRecentYears(text)
  if (years.length === 0) return false
  const newest = years[0]
  return newest <= nowY - maxAgeYears
}

const guessStockCodeFromText = (text: string) => {
  // 例: "証券コード：4684" / "証券コード 4684" / "コード: 4684"
  const patterns = [
    /証券コード\s*[:：]?\s*(\d{4})/,
    /銘柄コード\s*[:：]?\s*(\d{4})/,
    /コード\s*[:：]\s*(\d{4})(?!\d)/, // 4桁のみ
    /(?:東証|TSE|プライム|スタンダード|グロース)\s*[:：]?\s*(\d{4})/,
  ]
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m) return m[1]
  }
  return ""
}

/**
 * 上場企業かどうかを厳密に判定
 * @returns { isListed: boolean, stockCode: string, confidence: string, reasons: string[] }
 */
const detectListedCompany = (
  text: string, 
  internalLinks: string[]
): { isListed: boolean; stockCode: string; confidence: 'high' | 'medium' | 'low'; reasons: string[] } => {
  const reasons: string[] = []
  let score = 0
  
  // 1. 証券コードの検出（高信頼度）
  const stockCode = guessStockCodeFromText(text)
  if (stockCode) {
    score += 50
    reasons.push(`証券コード検出: ${stockCode}`)
  }
  
  // 2. 上場市場の記載確認（高信頼度）
  const marketPatterns = [
    { pattern: /東京証券取引所/, name: '東京証券取引所' },
    { pattern: /東証(?:プライム|スタンダード|グロース|一部|二部|マザーズ|JASDAQ)/, name: '東証市場' },
    { pattern: /(?:プライム|スタンダード|グロース)市場/, name: '市場区分' },
    { pattern: /上場企業/, name: '上場企業記載' },
    { pattern: /上場会社/, name: '上場会社記載' },
    { pattern: /(?:名証|札証|福証)/, name: '地方証券取引所' },
  ]
  for (const { pattern, name } of marketPatterns) {
    if (pattern.test(text)) {
      score += 30
      reasons.push(`市場記載: ${name}`)
    }
  }
  
  // 3. IRページの存在確認（高信頼度）
  const irPatterns = [
    /\/ir\//i,
    /\/investor/i,
    /\/stockholder/i,
    /\/kabunushi/i,
    /IR情報/,
    /投資家情報/,
    /株主・投資家/,
  ]
  const hasIrPage = internalLinks.some(link => 
    irPatterns.some(pattern => pattern.test(link))
  ) || irPatterns.some(pattern => pattern.test(text))
  
  if (hasIrPage) {
    score += 40
    reasons.push('IRページ検出')
  }
  
  // 4. 有価証券報告書・決算短信の記載確認（高信頼度）
  const irDocPatterns = [
    { pattern: /有価証券報告書/, name: '有価証券報告書' },
    { pattern: /決算短信/, name: '決算短信' },
    { pattern: /四半期報告書/, name: '四半期報告書' },
    { pattern: /株主総会/, name: '株主総会' },
    { pattern: /配当/, name: '配当情報' },
    { pattern: /株価/, name: '株価情報' },
    { pattern: /EDINET/, name: 'EDINET' },
    { pattern: /TDnet/, name: 'TDnet' },
  ]
  for (const { pattern, name } of irDocPatterns) {
    if (pattern.test(text)) {
      score += 15
      reasons.push(`IR関連記載: ${name}`)
    }
  }
  
  // 5. 資本金の規模（参考情報）
  const capitalMatch = text.match(/資本金\s*[:：]?\s*([\d,]+)\s*(百万円|億円|万円|円)/)
  if (capitalMatch) {
    const amount = parseInt(capitalMatch[1].replace(/,/g, ''))
    const unit = capitalMatch[2]
    let capitalYen = amount
    if (unit === '億円') capitalYen = amount * 100000000
    else if (unit === '百万円') capitalYen = amount * 1000000
    else if (unit === '万円') capitalYen = amount * 10000
    
    // 資本金1億円以上は上場企業の可能性が高い
    if (capitalYen >= 100000000) {
      score += 10
      reasons.push(`資本金: ${capitalMatch[0]}`)
    }
  }
  
  // 6. 従業員数の規模（参考情報）
  const employeeMatch = text.match(/従業員(?:数)?\s*[:：]?\s*([\d,]+)\s*(?:名|人)/)
  if (employeeMatch) {
    const employees = parseInt(employeeMatch[1].replace(/,/g, ''))
    // 従業員1000人以上は上場企業の可能性が高い
    if (employees >= 1000) {
      score += 5
      reasons.push(`従業員数: ${employees}名`)
    }
  }
  
  // 判定
  let confidence: 'high' | 'medium' | 'low' = 'low'
  let isListed = false
  
  if (score >= 70) {
    confidence = 'high'
    isListed = true
  } else if (score >= 40) {
    confidence = 'medium'
    isListed = true
  } else if (score >= 20) {
    confidence = 'low'
    isListed = true
  }
  
  return { isListed, stockCode, confidence, reasons }
}

/**
 * テキストから都道府県を抽出（住所パターンから抽出）
 */
const extractPrefectureFromText = (text: string): string | null => {
  const prefectures = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
  ]
  
  // 住所パターンで抽出（〒の後や、住所:の後など）
  // 例: 〒460-0002 愛知県名古屋市... / 住所：東京都渋谷区...
  const addressPattern = /(?:〒[\d\-]+\s*|住所[:：]\s*|所在地[:：]\s*|本社[:：]\s*)([^\s]{2,4}(?:都|道|府|県))/
  const match = text.match(addressPattern)
  if (match) {
    const found = prefectures.find(p => match[1].includes(p.replace(/都|道|府|県$/, "")))
    if (found) return found
  }
  
  // フォールバック: 単純な都道府県名の検索（ただし住所文脈で出現するもののみ）
  for (const pref of prefectures) {
    // 住所らしい文脈で出現しているか確認
    const prefPattern = new RegExp(`(?:〒|住所|所在地|本社)[^]*?${pref.replace(/都|道|府|県$/, "")}(?:都|道|府|県)`)
    if (prefPattern.test(text)) return pref
  }
  
  return null
}

/**
 * テキストから市区町村を抽出
 */
const extractCityFromText = (text: string): string | null => {
  // 「〜市」「〜区」「〜町」「〜村」を抽出
  const m = text.match(/([^\s]{1,10}(?:市|区|町|村))/)
  return m?.[1] || null
}

/**
 * 住所の一致度をチェック（同名他社の排除用）
 * @returns 0-100のスコア（高いほど一致）
 */
const checkAddressMatch = (
  text: string,
  targetPrefecture: string,
  targetCity: string,
  targetAddress: string
): { score: number; matchedPrefecture: boolean; matchedCity: boolean; reason: string } => {
  const normalizedText = text.replace(/\s+/g, "")
  let score = 0
  let matchedPrefecture = false
  let matchedCity = false
  const reasons: string[] = []
  
  // 都道府県の一致チェック
  if (targetPrefecture) {
    const prefInText = extractPrefectureFromText(normalizedText)
    if (prefInText === targetPrefecture) {
      score += 40
      matchedPrefecture = true
      reasons.push(`都道府県一致: ${targetPrefecture}`)
    } else if (prefInText && prefInText !== targetPrefecture) {
      // 異なる都道府県が明示されている場合はマイナス
      score -= 50
      reasons.push(`都道府県不一致: ${prefInText} != ${targetPrefecture}`)
    }
  }
  
  // 市区町村の一致チェック
  if (targetCity) {
    const cityInText = extractCityFromText(normalizedText)
    // 完全一致または部分一致
    if (cityInText && (cityInText === targetCity || normalizedText.includes(targetCity))) {
      score += 30
      matchedCity = true
      reasons.push(`市区町村一致: ${targetCity}`)
    } else if (cityInText && targetCity && !normalizedText.includes(targetCity.replace(/市|区|町|村/g, ""))) {
      // 異なる市区町村が明示されている場合
      score -= 30
      reasons.push(`市区町村不一致: ${cityInText}`)
    }
  }
  
  // 詳細住所の部分一致チェック
  if (targetAddress) {
    // 番地や建物名の一部が含まれているか
    const addressParts = targetAddress.replace(/[〒\-ー−]/g, "").split(/[\s,、]/).filter(p => p.length > 1)
    for (const part of addressParts) {
      if (normalizedText.includes(part)) {
        score += 10
        reasons.push(`住所部分一致: ${part}`)
        break
      }
    }
  }
  
  return { score, matchedPrefecture, matchedCity, reason: reasons.join(", ") }
}

const buildKnownExternalSources = (stockCode: string) => {
  // Brave等の検索APIが無い環境でも、上場企業なら証券コードから外部サイトを“確定URL”で参照できる
  // 4684.T のように市場サフィックスが必要なものは一旦 .T を付与（東証想定）
  const code = stockCode.trim()
  if (!/^\d{4}$/.test(code)) return []
  return [
    { url: `https://irbank.net/${code}`, label: "IRBANK" },
    { url: `https://kabutan.jp/stock/finance?code=${code}`, label: "Kabutan" },
    { url: `https://finance.yahoo.co.jp/quote/${code}.T`, label: "YahooFinance" },
  ]
}

const mapEmployeesToRange = (n: number, ranges: string[]) => {
  // 既定のレンジ表記に合わせる（UI側の配列が渡される前提）
  // ranges例: ['1-9名','10-29名',...,'1000名以上']
  if (n <= 9) return ranges.find((r) => r.includes("1-9")) ?? ""
  if (n <= 29) return ranges.find((r) => r.includes("10-29")) ?? ""
  if (n <= 49) return ranges.find((r) => r.includes("30-49")) ?? ""
  if (n <= 99) return ranges.find((r) => r.includes("50-99")) ?? ""
  if (n <= 299) return ranges.find((r) => r.includes("100-299")) ?? ""
  if (n <= 499) return ranges.find((r) => r.includes("300-499")) ?? ""
  if (n <= 999) return ranges.find((r) => r.includes("500-999")) ?? ""
  return ranges.find((r) => r.includes("1000")) ?? ""
}

const mapRevenueOkuToRange = (oku: number, ranges: string[]) => {
  // ranges例: ['1億円未満','1-5億円','5-10億円','10-50億円','50-100億円','100-500億円','500億円以上']
  if (oku < 1) return ranges.find((r) => r.includes("1億円未満")) ?? ""
  if (oku < 5) return ranges.find((r) => r.includes("1-5億")) ?? ""
  if (oku < 10) return ranges.find((r) => r.includes("5-10億")) ?? ""
  if (oku < 50) return ranges.find((r) => r.includes("10-50億")) ?? ""
  if (oku < 100) return ranges.find((r) => r.includes("50-100億")) ?? ""
  if (oku < 500) return ranges.find((r) => r.includes("100-500億")) ?? ""
  return ranges.find((r) => r.includes("500億円以上")) ?? ""
}

type FinancialFacts = {
  revenueText?: string | null
  employeesText?: string | null
  evidenceLines?: string[]
}

const extractFinancialFactsFromPdf = async (openai: OpenAI, pdfUrl: string): Promise<FinancialFacts | null> => {
  try {
    const pdfResp = await fetchWithTimeout(pdfUrl, { method: "GET" }, 25_000)
    if (!pdfResp.ok) return null
    const buf = Buffer.from(await pdfResp.arrayBuffer())
    const png = await convertPdfBufferToPngBuffer(buf, { page: 1, scaleTo: 2048 })
    const imageBase64 = png.toString("base64")

    const prompt = `あなたは上場企業のIR資料（決算短信/有報）の読み取り担当です。
以下の画像はPDFの1ページ目です。このページから「売上高（または売上収益）」と「従業員数」を読み取り、最新の数値を返してください。

ルール:
- 推測は禁止。ページ内に明記がない場合はnull
- 数値はページにある表記をそのまま（例: "46,984百万円" や "469億8,400万円"）
- 可能なら年度/期間もevidenceLinesに含める
- evidenceLinesは短い箇条書き（根拠の抜粋を日本語で）

JSONのみで返してください:
{
  "revenueText": string|null,
  "employeesText": string|null,
  "evidenceLines": string[]
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      temperature: 0.0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
          ] as any,
        },
      ],
    })

    const textContent = completion.choices[0]?.message?.content?.trim()
    if (!textContent) return null
    const match = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonText = match ? match[1] : textContent
    const parsed = JSON.parse(jsonText) as FinancialFacts
    return parsed
  } catch (error: any) {
    // 429エラー（クォータ超過）の場合はnullを返す（メイン処理で適切にハンドリングされる）
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
      console.error('OpenAI API quota exceeded in extractFinancialFactsFromPdf')
    }
    return null
  }
}

interface CompanyIntelResult {
  industry?: string | null
  employeeCount?: string | null
  annualRevenue?: string | null
  /** 会社名（カナ）- 株式会社等を除いた形式 */
  companyNameKana?: string | null
  /** 設立日（YYYY-MM-DD形式） */
  establishedDate?: string | null
  /** 代表者名 */
  representativeName?: string | null
  /** 会社電話番号 */
  phone?: string | null
  /** FAX番号 */
  fax?: string | null
  /** 事業内容（主要な事業/製品/サービスの説明） */
  businessDescription?: string | null
  /** 資本金（例: "1億円", "5,000万円"） */
  capital?: string | null
  /** 決算月（1-12の数値、例: 3月決算なら "3"） */
  fiscalYearEnd?: string | null
  products?: string[]
  services?: string[]
  branches?: string[]
  offices?: string[]
  factories?: string[]
  otherLocations?: string[]
  summary?: string
  rawNotes?: string
  /**
   * フォーム入力項目以外で取得した情報を、取得情報欄にそのまま箇条書きで流し込める形で返す
   * 例: ["主要サービス: ...", "拠点: 東京/大阪", ...]
   */
  extraBullets?: string[]
  /** 最新の売上高（売上収益）を"資料記載のまま"返す（例: 46,984百万円 / 469億8,400万円） */
  latestRevenueText?: string | null
  /** 最新の従業員数を"資料記載のまま"返す（例: 1,234名） */
  latestEmployeesText?: string | null
  /** 最新数値の出典（可能ならPDF URL） */
  latestFactsSource?: string | null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const website = (body?.website as string | undefined)?.trim()
    const companyName = (body?.companyName as string | undefined)?.trim() || ""
    // 住所情報（同名他社の排除に使用）
    const companyAddress = (body?.companyAddress as string | undefined)?.trim() || ""
    const companyPrefecture = (body?.companyPrefecture as string | undefined)?.trim() || ""
    const companyCity = (body?.companyCity as string | undefined)?.trim() || ""
    const forceExternalSearch = Boolean(body?.forceExternalSearch)
    const options = body?.options as
      | {
          industries?: string[]
          employeeRanges?: string[]
          revenueRanges?: string[]
        }
      | undefined

    if (!website) {
      return NextResponse.json(
        { error: "websiteは必須です" },
        { status: 400 }
      )
    }

    // URLを正規化（HTTPサイトの場合はHTTPSを試行）
    let normalizedUrl =
      website.startsWith("http://") || website.startsWith("https://")
        ? website
        : `https://${website}`
    
    // HTTPサイトの場合はHTTPS版を試行
    const originalUrl = normalizedUrl
    if (normalizedUrl.startsWith("http://")) {
      normalizedUrl = normalizedUrl.replace("http://", "https://")
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEYが設定されていません" },
        { status: 500 }
      )
    }

    // 1. 中小企業（非上場）前提: 公式HPを直接取得して解析する（Firecrawl不要）
    let scrapedContent = ""
    let scrapeMeta: Record<string, any> = { source: normalizedUrl, originalUrl }
    let directFetchContent = ""
    let homepageHtml = ""

    try {
      let fetchResult = await fetchHtmlToText(normalizedUrl, 30_000)
      
      // HTTPSが失敗して、元のURLがHTTPの場合はHTTP版を試行
      if (!fetchResult.ok && normalizedUrl.startsWith("https://") && originalUrl.startsWith("http://")) {
        console.log(`⚠️ HTTPS failed, trying HTTP: ${originalUrl}`)
        fetchResult = await fetchHtmlToText(originalUrl, 30_000)
        normalizedUrl = originalUrl
        scrapeMeta.source = originalUrl
      }
      
      homepageHtml = fetchResult.html || ""
      if (fetchResult.ok && fetchResult.text) {
        directFetchContent = fetchResult.text
        scrapedContent = directFetchContent
        scrapeMeta = {
          ...scrapeMeta,
          method: "direct_fetch",
          directStatus: fetchResult.status,
          directContentType: fetchResult.contentType,
          scrapedCharacters: scrapedContent.length,
        }
      } else {
        const errorDetails = fetchResult.error 
          ? `エラー: ${fetchResult.error} (${fetchResult.errorType || "Unknown"})`
          : `HTTPステータス: ${fetchResult.status}`
        
        scrapeMeta = {
          ...scrapeMeta,
          method: "direct_fetch_failed",
          directStatus: fetchResult.status,
          directContentType: fetchResult.contentType,
          directError: fetchResult.error,
          directErrorType: fetchResult.errorType,
          directDetails: safeSlice(fetchResult.html, 800),
          errorDetails,
        }
      }
    } catch (e: any) {
      console.error("Direct fetch failed:", e)
      scrapeMeta = {
        ...scrapeMeta,
        method: "direct_fetch_exception",
        directException: String(e),
        directErrorType: e?.name || "Exception",
        directErrorMessage: e?.message || String(e),
      }
    }

    if (!scrapedContent) {
      // エラーの詳細を構築
      let errorDetails = "通常fetchでコンテンツ取得に失敗しました。"
      
      if (scrapeMeta.directError) {
        errorDetails = `ネットワークエラー: ${scrapeMeta.directError}`
        if (scrapeMeta.directError.includes("fetch failed") || scrapeMeta.directError.includes("ECONNREFUSED")) {
          errorDetails = "サイトに接続できませんでした。URLが正しいか、サイトがアクセス可能かご確認ください。"
        } else if (scrapeMeta.directError.includes("ENOTFOUND") || scrapeMeta.directError.includes("DNS")) {
          errorDetails = "ドメイン名が解決できませんでした。URLが正しいかご確認ください。"
        } else if (scrapeMeta.directError.includes("timeout") || scrapeMeta.directError.includes("TIMEOUT") || scrapeMeta.directError.includes("aborted") || scrapeMeta.directError.includes("AbortError")) {
          errorDetails = "サイトへの接続がタイムアウトしました（30秒、最大3回リトライ済み）。サイトの応答が遅いか、アクセス制限がある可能性があります。しばらく時間をおいてから再度お試しください。"
        } else if (scrapeMeta.directErrorType === 'TimeoutError') {
          errorDetails = scrapeMeta.directError // 既に適切なメッセージが設定されている
        }
      } else if (scrapeMeta.directStatus) {
        if (scrapeMeta.directStatus === 403) {
          errorDetails = "サイトへのアクセスが拒否されました（403 Forbidden）。サイトのアクセス制限をご確認ください。"
        } else if (scrapeMeta.directStatus === 404) {
          errorDetails = "ページが見つかりませんでした（404 Not Found）。URLが正しいかご確認ください。"
        } else if (scrapeMeta.directStatus >= 500) {
          errorDetails = "サイト側でエラーが発生しています。しばらく時間をおいてから再度お試しください。"
        } else {
          errorDetails = `HTTPステータス ${scrapeMeta.directStatus} が返されました。`
        }
      }
      
      return NextResponse.json(
        {
          error: "Webサイトの情報を取得できませんでした",
          details: errorDetails,
          meta: scrapeMeta,
        },
        { status: 422 }
      )
    }

    // 1b. 公式HP内を巡回して情報を補完（会社概要/事業/製品/拠点/工場/店舗等）
    let internalCrawlText = ""
    let internalCrawlMeta: any = null
    try {
      const links = homepageHtml ? extractInternalLinksFromHtml(homepageHtml, normalizedUrl) : []
      const chunks: string[] = []
      const fetched: string[] = []
      for (const url of links) {
        try {
          const { ok, text } = await fetchHtmlToText(url, 20_000)
          if (!ok || !text) continue
          fetched.push(url)
          chunks.push(`(公式HP: ${url})\n${safeSlice(text, 2500)}`)
        } catch {
          // ignore
        }
      }
      internalCrawlText = chunks.join("\n\n")
      internalCrawlMeta = { internalPages: fetched, internalPagesCount: fetched.length }
    } catch {
      // ignore
    }

    const combinedOfficialText = `${safeSlice(scrapedContent, 9000)}\n\n${safeSlice(internalCrawlText, 9000)}`
    // フロントから渡された会社名を優先、なければテキストから推測
    const companyNameGuess = companyName || guessCompanyName(combinedOfficialText)
    
    // 内部リンクのリストを取得（上場判定に使用）
    const internalLinks = homepageHtml ? extractInternalLinksFromHtml(homepageHtml, normalizedUrl) : []
    
    // 上場企業かどうかを厳密に判定
    const listedDetection = detectListedCompany(combinedOfficialText, internalLinks)
    const stockCode = listedDetection.stockCode
    const isListedCompany = listedDetection.isListed
    
    console.log("📊 上場判定（詳細）:", {
      isListed: listedDetection.isListed,
      stockCode: listedDetection.stockCode,
      confidence: listedDetection.confidence,
      reasons: listedDetection.reasons,
    })
    
    // 住所情報を取得（フロントから渡された情報を優先）
    // 市区町村から都道府県を推測するマッピング（主要都市）
    const cityToPrefecture: Record<string, string> = {
      "名古屋市": "愛知県", "豊田市": "愛知県", "岡崎市": "愛知県", "一宮市": "愛知県",
      "横浜市": "神奈川県", "川崎市": "神奈川県", "相模原市": "神奈川県",
      "大阪市": "大阪府", "堺市": "大阪府", "東大阪市": "大阪府",
      "神戸市": "兵庫県", "姫路市": "兵庫県", "西宮市": "兵庫県",
      "京都市": "京都府", "福岡市": "福岡県", "北九州市": "福岡県",
      "札幌市": "北海道", "仙台市": "宮城県", "広島市": "広島県",
      "さいたま市": "埼玉県", "川口市": "埼玉県",
      "千葉市": "千葉県", "船橋市": "千葉県", "松戸市": "千葉県",
      "新潟市": "新潟県", "静岡市": "静岡県", "浜松市": "静岡県",
      "岐阜市": "岐阜県", "四日市市": "三重県", "津市": "三重県",
    }
    
    // 市区町村から都道府県を推測
    const inferPrefectureFromCity = (city: string): string | null => {
      if (!city) return null
      // 完全一致
      if (cityToPrefecture[city]) return cityToPrefecture[city]
      // 部分一致（「名古屋市中川区」→「名古屋市」）
      for (const [c, p] of Object.entries(cityToPrefecture)) {
        if (city.startsWith(c) || city.includes(c)) return p
      }
      return null
    }
    
    const officialCity = companyCity || extractCityFromText(combinedOfficialText) || ""
    // 都道府県: フロントから渡された値 > 市区町村から推測 > 公式HPから抽出
    const officialPrefecture = companyPrefecture || inferPrefectureFromCity(officialCity) || extractPrefectureFromText(combinedOfficialText) || ""
    const officialAddress = companyAddress || ""
    
    console.log("📍 住所情報:", { 
      officialPrefecture, 
      officialCity, 
      officialAddress: officialAddress.slice(0, 30),
      source: companyPrefecture ? "フロント" : inferPrefectureFromCity(officialCity) ? "市区町村から推測" : "公式HP"
    })

    // 1c. 公式HPだけで不足しそうなら、外部企業情報サイト等も検索（BRAVE_SEARCH_API_KEYがある場合のみ）
    let externalText = ""
    let externalMeta: any = null
    try {
      const needsEmployee = !/従業員/.test(combinedOfficialText)
      const needsRevenue = !/売上|売上高|売上収益|年商/.test(combinedOfficialText)
      const needsLocations = !/支店|営業所|工場|店舗/.test(combinedOfficialText)
      const braveKey = process.env.BRAVE_SEARCH_API_KEY?.trim() || ""
      const hasBraveKey = braveKey.length > 0
      const shouldSearch = hasBraveKey && (forceExternalSearch || needsEmployee || needsRevenue || needsLocations)

      if (shouldSearch) {
        const qBase = companyNameGuess ? companyNameGuess : new URL(normalizedUrl).hostname
        const currentYear = new Date().getFullYear()
        const origin = new URL(normalizedUrl).origin
        const officialDomain = new URL(normalizedUrl).hostname
        
        // 上場企業と非上場企業で検索戦略を分ける
        const preferredSitesListed = [
          // 上場企業向け: 金融/IR集約サイト（信頼性が高い）
          "irbank.net",
          "kabutan.jp",
          "finance.yahoo.co.jp",
          "ullet.com",
          "buffett-code.com",
        ] as const
        
        const preferredSitesUnlisted = [
          // 非上場企業向け: 採用サイト（会社名+ドメインで特定しやすい）
          "job.rikunabi.com",
          "mynavi.jp",
          "wantedly.com",
          "en-japan.com",
          // 企業DB（ただし同名他社混入リスクあり）
          "baseconnect.in",
        ] as const
        
        const preferredSites = isListedCompany ? preferredSitesListed : preferredSitesUnlisted

        // 検索クエリを上場・非上場で分ける
        let queries: string[]
        if (isListedCompany) {
          // 上場企業: 証券コードを使って精度を上げる
          queries = [
            `${stockCode} ${qBase} 売上高 ${currentYear}`,
            `${stockCode} 従業員数`,
            `${qBase} 売上高 最新 ${currentYear}`,
            `${qBase} 会社概要 従業員数 売上高`,
            `${stockCode} site:${preferredSites[0]}`,
            `${stockCode} site:${preferredSites[1]}`,
          ].filter(Boolean)
        } else {
          // 非上場企業: 公式ドメインを含めて精度を上げる（同名他社を除外）
          queries = [
            `"${qBase}" "${officialDomain}" 会社概要`,
            `"${qBase}" 従業員数 "${officialDomain}"`,
            `"${qBase}" site:${preferredSites[0]}`,
            `"${qBase}" site:${preferredSites[1]}`,
            `"${qBase}" site:${preferredSites[2]}`,
          ].filter(Boolean)
        }
        
        console.log("🔍 外部検索クエリ:", { isListedCompany, queries: queries.slice(0, 3) })

        const results: BraveWebResult[] = []
        for (const q of queries.slice(0, 5)) {
          results.push(...(await braveWebSearch(q, 5)))
        }

        const uniq = new Map<string, BraveWebResult>()
        for (const r of results) {
          if (!r.url) continue
          if (r.url.startsWith(origin)) continue
          if (!uniq.has(r.url)) uniq.set(r.url, r)
        }

        const preferredDomainScore = (url: string) => {
          try {
            const host = new URL(url).hostname
            const hit = (preferredSites as readonly string[]).findIndex((d) => host === d || host.endsWith(`.${d}`))
            if (hit >= 0) return 50 - hit
            return 0
          } catch {
            return 0
          }
        }

        // 非上場企業の場合、会社名が含まれているかで信頼性を判定
        const companyNameMatchScore = (r: BraveWebResult) => {
          if (isListedCompany) return 0 // 上場企業は証券コードで特定できるので不要
          
          const text = `${r.title || ""} ${r.description || ""}`.toLowerCase()
          const nameToCheck = companyNameGuess.replace(/株式会社|有限会社|合同会社/g, "").trim().toLowerCase()
          
          // 会社名が完全に含まれている場合は高スコア
          if (text.includes(nameToCheck)) return 20
          
          // 公式ドメインが含まれている場合も信頼性が高い
          if (text.includes(officialDomain)) return 15
          
          return 0
        }

        const keywordScore = (r: BraveWebResult) => {
          const text = `${r.title || ""} ${r.description || ""}`.toLowerCase()
          let score = 0
          if (text.includes("売上")) score += 5
          if (text.includes("年商")) score += 4
          if (text.includes("従業員")) score += 5
          if (text.includes("会社概要")) score += 3
          if (text.includes(String(currentYear))) score += 4
          if (text.includes(String(currentYear - 1))) score += 2
          return score
        }

        const ranked = Array.from(uniq.values())
          .map((r: any) => ({
            ...r,
            _score: preferredDomainScore(r.url) + keywordScore(r) + companyNameMatchScore(r),
            _companyNameMatch: companyNameMatchScore(r),
          }))
          // 非上場企業の場合、会社名マッチスコアが0のものは除外（同名他社の可能性が高い）
          .filter((r: any) => isListedCompany || r._companyNameMatch > 0 || preferredDomainScore(r.url) > 0)
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, isListedCompany ? 10 : 5) // 非上場は絞り込む

        console.log("📋 外部検索結果:", { 
          isListedCompany, 
          totalResults: uniq.size, 
          filteredResults: ranked.length,
          topResults: ranked.slice(0, 3).map((r: any) => ({ url: r.url, score: r._score, nameMatch: r._companyNameMatch }))
        })

        const chunks: string[] = []
        const fetched: string[] = []
        const fetchLogs: any[] = []
        for (const r of ranked) {
          try {
            const { ok, status, contentType, html, text } = await fetchHtmlToText(r.url, 20_000)
            
            // 非上場企業の場合、取得したテキストにも会社名が含まれているか確認
            const nameToCheck = companyNameGuess.replace(/株式会社|有限会社|合同会社/g, "").trim()
            const textContainsCompanyName = isListedCompany || 
              (text && (text.includes(nameToCheck) || text.includes(officialDomain)))
            
            // 非上場企業の場合、住所マッチングで同名他社を排除
            let addressMatch = { score: 0, matchedPrefecture: false, matchedCity: false, reason: "" }
            let isAddressConflict = false
            // 住所情報が十分にある場合のみ住所マッチングを実施
            const hasValidAddress = officialPrefecture && officialPrefecture.length > 0
            if (!isListedCompany && text && hasValidAddress) {
              addressMatch = checkAddressMatch(text, officialPrefecture, officialCity, officialAddress)
              // 住所が明確に異なる場合（都道府県が違う）は同名他社と判断
              // ただし、都道府県が一致している場合や、住所情報が見つからない場合は除外しない
              if (addressMatch.score < -30 && addressMatch.reason.includes("都道府県不一致")) {
                isAddressConflict = true
                console.log("⚠️ 住所不一致で除外:", { url: r.url, addressMatch })
              }
            }
            
            fetchLogs.push({
              url: r.url,
              ok,
              status,
              contentType,
              title: (r as any).title,
              description: (r as any).description,
              preview: safeSlice(text || stripHtmlToText(html || ""), 400),
              companyNameVerified: textContainsCompanyName,
              addressMatch: addressMatch,
              isAddressConflict,
            })
            
            if (!ok || !text) continue
            
            // 非上場企業で会社名が含まれていない場合はスキップ（誤情報防止）
            if (!isListedCompany && !textContainsCompanyName) {
              console.log("⚠️ 外部情報スキップ（会社名不一致）:", r.url)
              continue
            }
            
            // 住所が明確に異なる場合はスキップ（同名他社）
            if (isAddressConflict) {
              console.log("⚠️ 外部情報スキップ（住所不一致、同名他社の可能性）:", r.url, addressMatch.reason)
              continue
            }
            
            fetched.push(r.url)
            chunks.push(
              `(外部情報: ${r.url})\n(title: ${(r as any).title || ""})\n(desc: ${(r as any).description || ""})\n${safeSlice(text, 2500)}`
            )
          } catch (e) {
            fetchLogs.push({ url: r.url, ok: false, error: String(e) })
          }
        }
        externalText = chunks.join("\n\n")
        externalMeta = {
          forced: forceExternalSearch,
          isListedCompany,
          listedDetection: {
            stockCode: listedDetection.stockCode || null,
            confidence: listedDetection.confidence,
            reasons: listedDetection.reasons,
          },
          officialAddress: { prefecture: officialPrefecture, city: officialCity, address: officialAddress.slice(0, 30) },
          braveKey: true,
          braveKeyLength: braveKey.length,
          needsEmployee,
          needsRevenue,
          needsLocations,
          queries,
          results: ranked.map((r: any) => ({ 
            url: r.url, 
            title: r.title, 
            description: r.description, 
            score: r._score,
            companyNameMatch: r._companyNameMatch,
          })),
          externalPages: fetched,
          externalPagesCount: fetched.length,
          fetchLogs,
        }
      } else if (!hasBraveKey && forceExternalSearch) {
        // 検索APIが無い場合のフォールバック:
        // 上場企業（証券コードが取れる）なら、既知の外部サイトを確定URLで参照して突合する
        // stockCodeは既に上で取得済み
        const candidates = buildKnownExternalSources(stockCode)
        const chunks: string[] = []
        const fetched: string[] = []
        const fetchLogs: any[] = []

        for (const c of candidates) {
          try {
            const { ok, status, contentType, html, text } = await fetchHtmlToText(c.url, 20_000)
            fetchLogs.push({
              url: c.url,
              label: c.label,
              ok,
              status,
              contentType,
              preview: safeSlice(text || stripHtmlToText(html || ""), 500),
            })
            if (!ok || !text) continue
            fetched.push(c.url)
            chunks.push(`(外部情報:${c.label}: ${c.url})\n${safeSlice(text, 3500)}`)
          } catch (e) {
            fetchLogs.push({ url: c.url, label: c.label, ok: false, error: String(e) })
          }
        }

        externalText = chunks.join("\n\n")
        externalMeta = {
          forced: true,
          method: "known_sources_no_search_api",
          braveKey: false,
          braveKeyLength: braveKey.length,
          stockCode: stockCode || null,
          candidates,
          externalPages: fetched,
          externalPagesCount: fetched.length,
          fetchLogs,
        }

        if (!candidates.length) {
          externalMeta.error =
            "BRAVE_SEARCH_API_KEY が未設定で検索できません。また公式サイトから証券コードを特定できず、外部サイト参照のフォールバックも実行できません。"
        }
      }
    } catch {
      // ignore
    }

    // 追加: 同一ドメイン内のIR/有報系ページも可能な範囲で補助取得（上場企業の一次情報を優先するため）
    // ※外部サイト（EDINET等）まで追いかけると不確実性が増えるため、まずは公式ドメイン内に限定
    let supplementalContent = ""
    const discoveredPdfLinks: string[] = []
    try {
      const u = new URL(normalizedUrl)
      const origin = u.origin
      const irCandidates = [
        "/ir",
        "/ir/",
        "/investor",
        "/investors",
        "/investor-relations",
        "/investor_relations",
        "/ir/library",
        "/ir/library/result/",
        "/ir/library/securities/",
        "/ir/financial/",
        "/ir/financial/highlight/",
        "/ir/financial/report/",
        "/ir/ir-library",
        "/ir/finance",
        "/ir/financial",
        "/ir/yuho",
        "/ir/disclosure",
        "/company/ir",
      ].map((p) => new URL(p, origin).toString())

      const texts: string[] = []
      for (const url of irCandidates.slice(0, 12)) {
        try {
          const resp = await fetchWithTimeout(
            url,
            {
              method: "GET",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              },
            },
            12_000
          )
          if (!resp.ok) continue
          const ct = resp.headers.get("content-type") || ""
          if (!ct.includes("text/html")) continue
          const html = await resp.text()
          // PDFリンク探索（決算短信/有報の一次情報を拾う）
          const rawLinks = extractPdfLinksFromHtml(html)
          for (const href of rawLinks) {
            const abs = toAbsoluteUrl(origin, href)
            if (!abs.toLowerCase().includes(".pdf")) continue
            // E-IRの決算短信/有報っぽいリンクを優先的に収集
            if (abs.includes("eir-parts.net/doc/") || abs.includes("/tdnet/") || abs.includes("/yuho_pdf/")) {
              discoveredPdfLinks.push(abs)
            }
          }

          const text = stripHtmlToText(html)
          if (text && text.length > 400) {
            texts.push(`(IR候補ページ: ${url})\n${safeSlice(text, 4000)}`)
          }
        } catch {
          // ignore
        }
      }
      supplementalContent = texts.join("\n\n")
      if (supplementalContent) {
        scrapeMeta = { ...scrapeMeta, supplemental: "ir_candidates", supplementalChars: supplementalContent.length }
      }
    } catch {
      // ignore
    }

    // 2. OpenAIで構造化データを抽出
    const openai = new OpenAI({ apiKey: openaiKey })
    const industries = Array.isArray(options?.industries) ? options!.industries : []
    const employeeRanges = Array.isArray(options?.employeeRanges) ? options!.employeeRanges : []
    const revenueRanges = Array.isArray(options?.revenueRanges) ? options!.revenueRanges : []

    // 上場企業の一次情報（決算短信/有報PDF）を見つけた場合は、先に売上/従業員数の最新を抽出して強い根拠として渡す
    let financialFacts: FinancialFacts | null = null
    let financialFactsSource: string | null = null
    const pdfCandidates = discoveredPdfLinks
      .filter((u) => u.includes("eir-parts.net/doc/") || u.includes("/tdnet/") || u.includes("/yuho_pdf/"))
      .slice(0, 5)
    for (const pdfUrl of pdfCandidates) {
      financialFacts = await extractFinancialFactsFromPdf(openai, pdfUrl)
      if (financialFacts?.revenueText || financialFacts?.employeesText) {
        scrapeMeta = { ...scrapeMeta, financialPdf: pdfUrl }
        financialFactsSource = pdfUrl
        break
      }
    }

    // 会社名から法人格を除去した名称を取得（カナ変換用）
    const companyNameWithoutCorp = stripCorporateSuffix(companyNameGuess)

    const prompt = `あなたは企業調査アシスタントです。入力された企業WebサイトURLおよび外部検索結果（ある場合）を根拠に、企業情報を抽出して返してください。

目的:
- フォームに自動セットする項目は「業種 / 従業員数 / 年間売上 / 会社名（カナ） / 設立日 / 代表者名 / 電話番号 / FAX / 事業内容 / 資本金 / 決算月」
- 業種/従業員数/年間売上の3項目はフロント側でプルダウン選択式。下記の候補リストから「最も近いもの」を必ず選び、候補の文字列をそのまま返す（候補に合致しない場合はnull）。
- 会社名（カナ）は、法人格（株式会社、有限会社等）を除いた会社名をカタカナで返す。英語名がある場合は英語名をそのまま返す。
- 設立日は「YYYY-MM-DD」形式（例: "1990-04-01"）で返す。月/日が不明な場合は「YYYY-01-01」形式で年のみ返す。
- 代表者名は「代表取締役社長」「代表取締役」「CEO」等の役職を除いた氏名のみを返す。
- 電話番号/FAXは「03-1234-5678」のような形式で返す。
- 事業内容は、主要な事業/製品/サービスを簡潔に説明した文章（100〜200文字程度）で返す。
- 資本金は「1億円」「5,000万円」「10百万円」などサイトに記載されている表記のまま返す。
- 決算月は1〜12の数値文字列で返す（例: 3月決算なら "3"、12月決算なら "12"）。「○月期」「○月決算」「事業年度末○月」などの記載から抽出する。
- それ以外で取得できた有用情報は「取得情報」欄に流し込めるよう、箇条書き（短い1行）としてextraBulletsに入れる

制約:
- 推測は禁止。根拠がない場合は null / 空配列にする
- 取得した情報（従業員数/売上/業種など）について、サイト内の複数箇所（会社概要、IR、採用、沿革、決算/IR資料）で整合性を確認し、矛盾する場合は確度の高い根拠（IR/有価証券報告書/決算説明資料 > 会社概要 > その他）を優先する。根拠が弱い場合はnullにする。
- 上場企業の場合は、可能な範囲で公式サイト内のIR情報（決算/IRページ、有価証券報告書に相当する開示）を優先して参照する（本テキストにIR候補ページの抜粋があれば活用する）。
- 売上高（または売上収益）と従業員数は「最新のデータ」を最優先で取得すること。古い年度の情報が混在する場合は最新年度（直近の通期/直近の決算）を優先する。
- 年度が2023年以前など古い記載しか見つからない場合、「最新」であることを確認できない限り、annualRevenue/employeeCount は null にする（フォームを誤って埋めないため）。ただし extraBullets に「古い記載しか見つからない」旨を必ず出す。
- 売上/従業員数は、可能な限り「年度/期間」と「参照元URL」を添える（extraBulletsに入れる）。例: "売上高(2025年3月期): 469億8,400万円（出典: <URL>）"
- 外部サイトの情報は誤りが混ざるため、公式サイト/一次情報と矛盾する場合は採用しない（採用しない場合でも extraBullets に「矛盾検出」のメモを出す）。
- extraBullets は「入力項目以外」の情報のみ（業種/従業員数/年間売上/設立日/代表者名/電話番号/FAX/事業内容/資本金/決算月は入れない）
- extraBullets は日本語で、1項目=1行の短文。最大12件まで
- URLが会社サイトでない/情報が薄い場合も、無理に埋めずnullを返す
- 候補から選ぶ時は、取得できた数値/表現を候補の範囲に寄せる（例: 従業員120名→「100-299名」、売上12億→「10-50億円」）
- extraBullets の先頭には、可能なら「主要製品/主要サービス/主要事業」の情報を最優先で入れる（例: "主要製品: 〜", "主要サービス: 〜"）。複数ある場合は代表的なものに絞る。
- companyNameKana（会社名カナ）は、法人格を除いた会社名をカタカナに変換して返す。英語名がある場合は英語名をそのまま返す（例: "ピーシーエー" または "PCA"）。

必ず下記のJSON構造で、JSONのみを返してください:
{
  "industry": string|null,
  "employeeCount": string|null,
  "annualRevenue": string|null,
  "companyNameKana": string|null,
  "establishedDate": string|null,
  "representativeName": string|null,
  "phone": string|null,
  "fax": string|null,
  "businessDescription": string|null,
  "capital": string|null,
  "fiscalYearEnd": string|null,
  "products": string[],
  "services": string[],
  "branches": string[],
  "offices": string[],
  "factories": string[],
  "otherLocations": string[],
  "extraBullets": string[],
  "summary": string|null,
  "rawNotes": string|null
}

WebサイトURL:
${normalizedUrl}

会社名（フォームから入力済み）:
${companyNameGuess || "(未入力)"}

会社名（法人格除去後、カナ変換の参考）:
${companyNameWithoutCorp || "(未入力)"}

プルダウン候補（この文字列から選択して返す）:
- 業種候補: ${industries.length ? industries.join(" / ") : "(未提供)"}
- 従業員数候補: ${employeeRanges.length ? employeeRanges.join(" / ") : "(未提供)"}
- 年間売上候補: ${revenueRanges.length ? revenueRanges.join(" / ") : "(未提供)"}

Webサイトから取得したテキスト:
${combinedOfficialText.slice(0, 9000)}

外部企業情報サイト等から取得したテキスト（取得できた場合）:
${externalText ? externalText.slice(0, 6000) : "(なし)"}

IR/開示っぽい追加テキスト（取得できた場合）:
${supplementalContent ? supplementalContent.slice(0, 4000) : "(なし)"}

決算短信/有報PDFから抽出した強い根拠（取得できた場合）:
${financialFacts ? JSON.stringify(financialFacts) : "(なし)"}`

    let completion
    try {
      completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    })
    } catch (error: any) {
      // エラーの詳細をログに出力（デバッグ用）
      console.error('❌ OpenAI API Error:', {
        status: error?.status,
        statusCode: error?.statusCode,
        code: error?.code,
        message: error?.message,
        type: error?.type,
        error: error,
      })
      
      // 429エラー（クォータ超過）の場合は適切なエラーメッセージを返す
      const isQuotaError = 
        error?.status === 429 || 
        error?.statusCode === 429 ||
        error?.code === 'insufficient_quota' ||
        error?.message?.includes('429') || 
        error?.message?.includes('quota') || 
        error?.message?.includes('exceeded') ||
        error?.message?.includes('rate_limit')
      
      if (isQuotaError) {
        console.error('❌ OpenAI API quota exceeded - Full error:', JSON.stringify(error, null, 2))
        return NextResponse.json(
          {
            error: "OpenAI APIの利用制限に達しました",
            details: `現在、OpenAI APIの利用制限（クォータ）に達しています。エラー詳細: ${error?.message || '不明'}`,
            originalError: error?.message || error?.code || 'Unknown error',
          },
          { status: 429 }
        )
      }
      // その他のエラー
      console.error('❌ OpenAI API error (non-quota):', error)
      return NextResponse.json(
        {
          error: "OpenAI APIの呼び出しに失敗しました",
          details: error?.message || "不明なエラーが発生しました",
          originalError: error?.message || error?.code || 'Unknown error',
        },
        { status: 500 }
      )
    }

    const textContent = completion.choices[0]?.message?.content?.trim()
    if (!textContent) {
      return NextResponse.json(
        { error: "OpenAIから有効なレスポンスが得られませんでした" },
        { status: 500 }
      )
    }

    let parsed: CompanyIntelResult
    try {
      const match = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      const jsonText = match ? match[1] : textContent
      parsed = JSON.parse(jsonText)
    } catch (error) {
      console.error("JSON parse error:", error, textContent)
      return NextResponse.json(
        { error: "AIレスポンスの解析に失敗しました" },
        { status: 500 }
      )
    }

    // 3. 売上/従業員数の「最新」一次情報が取れている場合は、(a) dataにも格納 (b) 取得情報に出す (c) プルダウン値を確実に上書きする
    const revenueOku = financialFacts?.revenueText ? parseOkuYen(financialFacts.revenueText) : null
    const employeesN = financialFacts?.employeesText ? parseEmployeesNumber(financialFacts.employeesText) : null
    if (financialFacts?.revenueText) {
      parsed.latestRevenueText = financialFacts.revenueText
    }
    if (financialFacts?.employeesText) {
      parsed.latestEmployeesText = financialFacts.employeesText
    }
    if (financialFactsSource) {
      parsed.latestFactsSource = financialFactsSource
    }

    // 取得情報に必ず見える形で入れる（ユーザーが確認できるように）
    const factBullets: string[] = []
    if (financialFacts?.revenueText) {
      factBullets.push(`売上高(最新): ${financialFacts.revenueText}${financialFactsSource ? "（決算短信/有報）" : ""}`)
    }
    if (financialFacts?.employeesText) {
      factBullets.push(`従業員数(最新): ${financialFacts.employeesText}${financialFactsSource ? "（決算短信/有報）" : ""}`)
    }

    if (revenueOku != null && revenueRanges.length > 0) {
      const mapped = mapRevenueOkuToRange(revenueOku, revenueRanges)
      if (mapped) parsed.annualRevenue = mapped
    }
    if (employeesN != null && employeeRanges.length > 0) {
      const mapped = mapEmployeesToRange(employeesN, employeeRanges)
      if (mapped) parsed.employeeCount = mapped
    }

    // 3b. 外部情報由来で「古い年度」しか見えない場合は、フォーム値を誤って埋めない（nullに戻して注意喚起）
    // - IR PDF等の強い根拠がある場合は除外
    const staleByExternal = !!externalText && shouldTreatAsStale(externalText, 2)
    if (!financialFactsSource && staleByExternal) {
      const y = extractRecentYears(externalText)[0]
      // 既に埋めてしまったプルダウン値は消す（誤入力防止）
      if (parsed.annualRevenue) parsed.annualRevenue = null
      if (parsed.employeeCount) parsed.employeeCount = null
      const warn = y
        ? `外部情報の数値は${y}年の記載が中心で、最新であることを確認できないためフォーム入力は未設定にしました（要確認）`
        : `外部情報の数値が最新であることを確認できないためフォーム入力は未設定にしました（要確認）`
      parsed.extraBullets = [warn, ...(parsed.extraBullets || [])].slice(0, 12)
    }

    // PDFが取れなかった場合でも、取得済みテキストから最低限の数値を拾う（誤爆回避のため“テキスト表記”だけ採用）
    if (!financialFacts?.revenueText || !financialFacts?.employeesText) {
      const combined = `${scrapedContent}\n${supplementalContent}`
      // 売上候補（百万円/億万表記の断片）
      if (!financialFacts?.revenueText) {
        const m = combined.match(/(\d[\d,]{2,8})\s*百万円/)
        if (m) parsed.latestRevenueText = `${m[1]}百万円`
      }
      if (!financialFacts?.employeesText) {
        const m = combined.match(/(\d[\d,]{1,7})\s*(?:名|人)/)
        if (m) parsed.latestEmployeesText = `${m[1]}名`
      }
      if (parsed.latestRevenueText) factBullets.push(`売上高(参考): ${parsed.latestRevenueText}`)
      if (parsed.latestEmployeesText) factBullets.push(`従業員数(参考): ${parsed.latestEmployeesText}`)
    }

    const evidence = (financialFacts?.evidenceLines || []).map((l) => l.trim()).filter(Boolean)
    parsed.extraBullets = [
      ...factBullets,
      ...evidence,
      ...(parsed.extraBullets || []),
    ].filter(Boolean).slice(0, 12)

    // ファクトチェックを実行（AI結果 + 検索結果）
    const aiFactCheck = checkAIResult({
      content: JSON.stringify(parsed),
      issues: (parsed.extraBullets || []).map((bullet: string) => ({
        severity: 'info',
        issue: bullet,
        category: 'company-intel'
      })),
    })

    // 検索結果のソース情報を収集
    const searchSources: { url: string; title: string }[] = []
    if (externalMeta?.sources) {
      externalMeta.sources.forEach((s: any) => {
        if (s.url) searchSources.push({ url: s.url, title: s.title || '' })
      })
    }
    
    const searchFactCheck = checkSearchResult({
      sources: searchSources,
      query: companyNameGuess || normalizedUrl
    })

    // 総合ファクトチェック結果
    const factCheckResult = {
      ai: aiFactCheck,
      search: searchFactCheck,
      overall: {
        passed: aiFactCheck.passed && searchFactCheck.passed,
        confidence: Math.round((aiFactCheck.confidence + searchFactCheck.confidence) / 2),
        level: aiFactCheck.confidence >= 75 && searchFactCheck.confidence >= 75 ? 'high' :
               aiFactCheck.confidence >= 50 && searchFactCheck.confidence >= 50 ? 'medium' : 'low',
        summary: `AI結果: ${aiFactCheck.summary}, 検索結果: ${searchFactCheck.summary}`
      },
      timestamp: new Date().toISOString()
    }

    console.log("📋 企業情報ファクトチェック:", JSON.stringify(factCheckResult.overall, null, 2))

    return NextResponse.json({
      data: parsed,
      meta: {
        ...scrapeMeta,
        // デバッグ用: 公式HP/外部情報サイトの取得テキストプレビュー（長文は抑制）
        officialPreview: directFetchContent ? safeSlice(directFetchContent, 1800) : "",
        internalCrawlMeta,
        externalMeta,
        externalPreview: externalText ? safeSlice(externalText, 1800) : "",
        companyNameGuess,
        discoveredPdfLinks: pdfCandidates,
        revenueOku,
        employeesN,
      },
      factCheck: factCheckResult,
    })
  } catch (error) {
    console.error("company-intel API error:", error)
    return NextResponse.json(
      { error: "会社情報の取得に失敗しました", details: String(error) },
      { status: 500 }
    )
  }
}










