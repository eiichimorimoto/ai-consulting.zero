import { NextResponse } from "next/server"
import OpenAI from "openai"
import { convertPdfBufferToPngBuffer } from "@/lib/ocr/pdf-to-png"

export const runtime = "nodejs"

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 20_000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
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

const fetchHtmlToText = async (url: string, timeoutMs = 15_000) => {
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
  // 例: "証券コード：4684" / "証券コード 4684"
  const m = text.match(/証券コード\s*[:：]?\s*(\d{4})/)
  return m?.[1] || ""
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
  } catch {
    return null
  }
}

interface CompanyIntelResult {
  industry?: string | null
  employeeCount?: string | null
  annualRevenue?: string | null
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
  /** 最新の売上高（売上収益）を“資料記載のまま”返す（例: 46,984百万円 / 469億8,400万円） */
  latestRevenueText?: string | null
  /** 最新の従業員数を“資料記載のまま”返す（例: 1,234名） */
  latestEmployeesText?: string | null
  /** 最新数値の出典（可能ならPDF URL） */
  latestFactsSource?: string | null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const website = (body?.website as string | undefined)?.trim()
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

    const normalizedUrl =
      website.startsWith("http://") || website.startsWith("https://")
        ? website
        : `https://${website}`

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEYが設定されていません" },
        { status: 500 }
      )
    }

    // 1. 中小企業（非上場）前提: 公式HPを直接取得して解析する（Firecrawl不要）
    let scrapedContent = ""
    let scrapeMeta: Record<string, any> = { source: normalizedUrl }
    let directFetchContent = ""
    let homepageHtml = ""

    try {
      const { ok, status, contentType, html, text } = await fetchHtmlToText(normalizedUrl, 15_000)
      homepageHtml = html
      if (ok && text) {
        directFetchContent = text
        scrapedContent = directFetchContent
        scrapeMeta = {
          ...scrapeMeta,
          method: "direct_fetch",
          directStatus: status,
          directContentType: contentType,
          scrapedCharacters: scrapedContent.length,
        }
      } else {
        scrapeMeta = {
          ...scrapeMeta,
          method: "direct_fetch_failed",
          directStatus: status,
          directContentType: contentType,
          directDetails: safeSlice(html, 800),
        }
      }
    } catch (e) {
      console.error("Direct fetch failed:", e)
      scrapeMeta = { ...scrapeMeta, method: "direct_fetch_exception", directException: String(e) }
    }

    if (!scrapedContent) {
      return NextResponse.json(
        {
          error: "Webサイトの情報を取得できませんでした",
          details: "通常fetchでコンテンツ取得に失敗しました。URLや対象サイトの制限をご確認ください。",
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
          const { ok, text } = await fetchHtmlToText(url, 12_000)
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
    const companyNameGuess = guessCompanyName(combinedOfficialText)

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
        const preferredSites = [
          // 金融/IR集約（最新年度が出やすい）
          "irbank.net",
          "kabutan.jp",
          "finance.yahoo.co.jp",
          // 採用/会社概要（従業員数が出やすい）
          "job.rikunabi.com",
          "mynavi.jp",
          "wantedly.com",
          // 企業DB/PR（補助）
          "salesnow.jp",
          "baseconnect.in",
          "prtimes.jp",
        ] as const

        const queries = [
          `${qBase} 売上高 最新 ${currentYear}`,
          `${qBase} 年商 最新 ${currentYear}`,
          `${qBase} 従業員数 最新`,
          `${qBase} 会社概要 従業員数 売上高`,
          // サイト指定（上から順に優先）
          `${qBase} 売上高 ${currentYear} site:${preferredSites[0]}`,
          `${qBase} 売上高 ${currentYear} site:${preferredSites[1]}`,
          `${qBase} 売上高 ${currentYear} site:${preferredSites[2]}`,
          `${qBase} 従業員数 site:${preferredSites[3]}`,
          `${qBase} 会社概要 site:${preferredSites[4]}`,
          `${qBase} 会社概要 従業員数 site:${preferredSites[5]}`,
        ].filter(Boolean)

        const results: BraveWebResult[] = []
        for (const q of queries.slice(0, 6)) {
          results.push(...(await braveWebSearch(q, 6)))
        }

        const origin = new URL(normalizedUrl).origin
        const uniq = new Map<string, BraveWebResult>()
        for (const r of results) {
          if (!r.url) continue
          if (r.url.startsWith(origin)) continue
          if (!uniq.has(r.url)) uniq.set(r.url, r)
        }

        const preferredDomainScore = (url: string) => {
          try {
            const host = new URL(url).hostname
            const hit = preferredSites.findIndex((d) => host === d || host.endsWith(`.${d}`))
            if (hit >= 0) return 50 - hit
            return 0
          } catch {
            return 0
          }
        }

        const keywordScore = (r: BraveWebResult) => {
          const currentYear = new Date().getFullYear()
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
            _score: preferredDomainScore(r.url) + keywordScore(r),
          }))
          .sort((a: any, b: any) => b._score - a._score)
          .slice(0, 10)

        const chunks: string[] = []
        const fetched: string[] = []
        const fetchLogs: any[] = []
        for (const r of ranked) {
          try {
            const { ok, status, contentType, html, text } = await fetchHtmlToText(r.url, 12_000)
            fetchLogs.push({
              url: r.url,
              ok,
              status,
              contentType,
              title: r.title,
              description: r.description,
              preview: safeSlice(text || stripHtmlToText(html || ""), 400),
            })
            if (!ok || !text) continue
            fetched.push(r.url)
            chunks.push(
              `(外部情報: ${r.url})\n(title: ${r.title || ""})\n(desc: ${r.description || ""})\n${safeSlice(text, 2500)}`
            )
          } catch (e) {
            fetchLogs.push({ url: r.url, ok: false, error: String(e) })
          }
        }
        externalText = chunks.join("\n\n")
        externalMeta = {
          forced: forceExternalSearch,
          braveKey: true,
          braveKeyLength: braveKey.length,
          needsEmployee,
          needsRevenue,
          needsLocations,
          queries,
          results: ranked.map((r: any) => ({ url: r.url, title: r.title, description: r.description, score: r._score })),
          externalPages: fetched,
          externalPagesCount: fetched.length,
          fetchLogs,
        }
      } else if (!hasBraveKey && forceExternalSearch) {
        // 検索APIが無い場合のフォールバック:
        // 上場企業（証券コードが取れる）なら、既知の外部サイトを確定URLで参照して突合する
        const stockCode = guessStockCodeFromText(combinedOfficialText)
        const candidates = buildKnownExternalSources(stockCode)
        const chunks: string[] = []
        const fetched: string[] = []
        const fetchLogs: any[] = []

        for (const c of candidates) {
          try {
            const { ok, status, contentType, html, text } = await fetchHtmlToText(c.url, 12_000)
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

    const prompt = `あなたは企業調査アシスタントです。入力された企業WebサイトURLおよび外部検索結果（ある場合）を根拠に、企業情報を抽出して返してください。

目的:
- フォームに自動セットする項目は「業種 / 従業員数 / 年間売上」の3つ
- これら3項目はフロント側でプルダウン選択式。下記の候補リストから「最も近いもの」を必ず選び、候補の文字列をそのまま返す（候補に合致しない場合はnull）。
- それ以外で取得できた有用情報は「取得情報」欄に流し込めるよう、箇条書き（短い1行）としてextraBulletsに入れる

制約:
- 推測は禁止。根拠がない場合は null / 空配列にする
- 取得した情報（従業員数/売上/業種など）について、サイト内の複数箇所（会社概要、IR、採用、沿革、決算/IR資料）で整合性を確認し、矛盾する場合は確度の高い根拠（IR/有価証券報告書/決算説明資料 > 会社概要 > その他）を優先する。根拠が弱い場合はnullにする。
- 上場企業の場合は、可能な範囲で公式サイト内のIR情報（決算/IRページ、有価証券報告書に相当する開示）を優先して参照する（本テキストにIR候補ページの抜粋があれば活用する）。
- 売上高（または売上収益）と従業員数は「最新のデータ」を最優先で取得すること。古い年度の情報が混在する場合は最新年度（直近の通期/直近の決算）を優先する。
- 年度が2023年以前など古い記載しか見つからない場合、「最新」であることを確認できない限り、annualRevenue/employeeCount は null にする（フォームを誤って埋めないため）。ただし extraBullets に「古い記載しか見つからない」旨を必ず出す。
- 売上/従業員数は、可能な限り「年度/期間」と「参照元URL」を添える（extraBulletsに入れる）。例: "売上高(2025年3月期): 469億8,400万円（出典: <URL>）"
- 外部サイトの情報は誤りが混ざるため、公式サイト/一次情報と矛盾する場合は採用しない（採用しない場合でも extraBullets に「矛盾検出」のメモを出す）。
- extraBullets は「入力項目以外」の情報のみ（業種/従業員数/年間売上は入れない）
- extraBullets は日本語で、1項目=1行の短文。最大12件まで
- URLが会社サイトでない/情報が薄い場合も、無理に埋めずnullを返す
- 候補から選ぶ時は、取得できた数値/表現を候補の範囲に寄せる（例: 従業員120名→「100-299名」、売上12億→「10-50億円」）
- extraBullets の先頭には、可能なら「主要製品/主要サービス/主要事業」の情報を最優先で入れる（例: "主要製品: 〜", "主要サービス: 〜"）。複数ある場合は代表的なものに絞る。

必ず下記のJSON構造で、JSONのみを返してください:
{
  "industry": string|null,
  "employeeCount": string|null,
  "annualRevenue": string|null,
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    })

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
    })
  } catch (error) {
    console.error("company-intel API error:", error)
    return NextResponse.json(
      { error: "会社情報の取得に失敗しました", details: String(error) },
      { status: 500 }
    )
  }
}










