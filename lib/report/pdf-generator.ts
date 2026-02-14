/**
 * PDF生成ユーティリティ（Puppeteer使用）
 */

import puppeteer from "puppeteer-core"
import type {
  PDFGenerateOptions,
  PDFGenerateResult,
  ReportSection,
  ChatData,
  TableData,
  ListData,
} from "./types"

const DEFAULT_AUTHOR_LABEL = "AI参謀 - AI経営コンサルティング"
const COPYRIGHT = "© 2026 SOLVE WISE"

/**
 * レポートのHTMLを生成（サンプル report-form-sample.html に準拠）
 * 表紙・セクションのみ。ヘッダー・フッターは Puppeteer displayHeaderFooter で付与。
 */
function generateReportHTML(options: PDFGenerateOptions): string {
  const { sections, metadata, orientation, baseUrl } = options
  const isPortrait = orientation === "portrait"
  const authorLabel = options.authorLabel ?? DEFAULT_AUTHOR_LABEL

  const sectionsHTML = sections.map((section) => generateSectionHTML(section)).join("\n\n")

  const coverLogo = baseUrl
    ? `<div class="cover-logo"><img src="${escapeHtml(baseUrl)}/logo.png" alt="SOLVE WISE"><span>SOLVE WISE</span></div>`
    : '<div class="cover-logo"><span>SOLVE WISE</span></div>'

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metadata.title)}</title>
  <style>
    @page {
      size: A4 ${isPortrait ? "portrait" : "landscape"};
      margin: 20mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Meiryo', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 0;
    }

    .cover-page {
      min-height: 140mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 20px 0;
      position: relative;
      page-break-after: always;
    }
    .cover-page .cover-logo {
      position: absolute;
      top: 16px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #4f46e5;
      font-size: 9pt;
      font-weight: 600;
      letter-spacing: 0.06em;
    }
    .cover-page .cover-logo img { height: 22px; width: auto; }
    .cover-title {
      font-size: 28pt;
      font-weight: bold;
      color: #1e293b;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    .cover-subtitle {
      font-size: 14pt;
      color: #64748b;
      margin-bottom: 32px;
    }
    .cover-meta {
      font-size: 11pt;
      color: #475569;
      text-align: center;
      line-height: 1.8;
    }
    .cover-meta .created { margin-bottom: 8px; }
    .cover-meta .author { margin-top: 16px; font-size: 10pt; color: #64748b; }

    .section {
      margin-top: 24px;
      padding-bottom: 32px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 16pt;
      font-weight: bold;
      color: #334155;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .section-meta {
      font-size: 10pt;
      color: #64748b;
      margin-bottom: 16px;
    }
    .section-body {
      font-size: 11pt;
      line-height: 1.7;
      color: #334155;
    }
    .section-body p { margin: 0 0 12px 0; }
    .section-body ol { padding-left: 24px; margin: 0 0 12px 0; }
    .section-body li { margin-bottom: 6px; }

    .report-table-wrap {
      overflow-x: auto;
      margin: 16px 0;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5pt;
    }
    .report-table th, .report-table td {
      border: 1px solid #e2e8f0;
      padding: 12px 14px;
      text-align: left;
      vertical-align: top;
    }
    .report-table th {
      background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
      color: #fff;
      font-weight: 600;
    }
    .report-table tr:nth-child(even) td { background: #f8fafc; }

    .chat-message { margin-bottom: 20px; padding: 12px; border-radius: 4px; }
    .chat-user { background-color: #f1f5f9; border-left: 4px solid #6366f1; }
    .chat-assistant { background-color: #fef3c7; border-left: 4px solid #f59e0b; }
    .chat-role { font-weight: bold; font-size: 10pt; color: #64748b; margin-bottom: 4px; }
    .chat-content { font-size: 11pt; white-space: pre-wrap; }

    .list-item { margin-bottom: 10px; padding-left: 20px; position: relative; }
    .list-item:before { content: "•"; position: absolute; left: 0; color: #6366f1; font-weight: bold; }

    .report-section .report-body { font-size: 11pt; line-height: 1.7; color: #334155; }
    .report-body .report-heading { color: #1e293b; margin: 20px 0 10px 0; font-size: 14pt; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .report-body .report-para { margin: 0 0 14px 0; }
    .report-body .report-list { margin: 0 0 14px 0; padding-left: 24px; }
    .report-body .report-list li { margin-bottom: 6px; }
    .report-body ul { list-style-type: disc; }
    .report-body ol { list-style-type: decimal; padding-left: 24px; }
  </style>
</head>
<body>
  <div class="cover-page">
    ${coverLogo}
    <div class="cover-title">${escapeHtml(metadata.title)}</div>
    <div class="cover-subtitle">${escapeHtml(metadata.sessionName)}</div>
    <div class="cover-meta">
      <div class="created">作成日時: ${escapeHtml(metadata.createdAt)}</div>
      ${metadata.userName ? `担当: ${escapeHtml(metadata.userName)}<br>` : ""}
      <div class="author">文責: ${escapeHtml(authorLabel)}</div>
    </div>
  </div>

  ${sectionsHTML}
</body>
</html>
  `.trim()
}

/**
 * セクションのHTMLを生成
 */
function generateSectionHTML(section: ReportSection): string {
  switch (section.type) {
    case "chat":
      return generateChatHTML(section)
    case "table":
      return generateTableHTML(section)
    case "list":
      return generateListHTML(section)
    case "text":
      return generateTextHTML(section)
    case "html":
      return generateReportHTMLSection(section)
    default:
      return ""
  }
}

/**
 * レポート用HTMLセクション（AI回答を成型済みHTMLで表示）
 * content は既にHTMLのためエスケープしない
 */
function generateReportHTMLSection(section: ReportSection): string {
  const htmlContent = section.content as string
  const createdAt = section.metadata?.createdAt
    ? new Date(section.metadata.createdAt).toLocaleString("ja-JP", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""
  return `
    <div class="section report-section">
      <h2 class="section-title">${escapeHtml(section.title)}</h2>
      ${createdAt ? `<p class="section-meta">作成日時: ${escapeHtml(createdAt)}</p>` : ""}
      <div class="section-body report-body">${htmlContent}</div>
    </div>
  `
}

/**
 * 会話履歴のHTML生成
 */
function generateChatHTML(section: ReportSection): string {
  const chatData = section.content as ChatData

  const messagesHTML = chatData.messages
    .map((msg) => {
      const roleClass = msg.role === "user" ? "chat-user" : "chat-assistant"
      const roleLabel = msg.role === "user" ? "ユーザー" : "AI"

      return `
        <div class="chat-message ${roleClass}">
          <div class="chat-role">${roleLabel}</div>
          <div class="chat-content">${escapeHtml(msg.content)}</div>
        </div>
      `
    })
    .join("\n")

  return `
    <div class="section">
      <h2 class="section-title">${section.title}</h2>
      ${messagesHTML}
    </div>
  `
}

/**
 * テーブルのHTML生成（サンプル準拠 .report-table）
 */
function generateTableHTML(section: ReportSection): string {
  const tableData = section.content as TableData

  const headersHTML = tableData.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")

  const rowsHTML = tableData.rows
    .map((row) => {
      const cellsHTML = row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")
      return `<tr>${cellsHTML}</tr>`
    })
    .join("\n")

  return `
    <div class="section">
      <h2 class="section-title">${escapeHtml(section.title)}</h2>
      <div class="report-table-wrap">
        <table class="report-table">
          <thead>
            <tr>${headersHTML}</tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    </div>
  `
}

/**
 * リストのHTML生成
 */
function generateListHTML(section: ReportSection): string {
  const listData = section.content as ListData

  const itemsHTML = listData.items
    .map((item) => `<div class="list-item">${escapeHtml(item)}</div>`)
    .join("\n")

  return `
    <div class="section">
      <h2 class="section-title">${section.title}</h2>
      ${itemsHTML}
    </div>
  `
}

/**
 * テキストのHTML生成
 */
function generateTextHTML(section: ReportSection): string {
  const content = section.content as string

  return `
    <div class="section">
      <h2 class="section-title">${section.title}</h2>
      <p>${escapeHtml(content)}</p>
    </div>
  `
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>")
}

/**
 * PuppeteerでPDF生成
 */
export async function generatePDFReport(options: PDFGenerateOptions): Promise<PDFGenerateResult> {
  let browser

  try {
    // HTML生成
    const html = generateReportHTML(options)

    console.log("🚀 PDF生成: ブラウザ起動準備")

    const isProduction = process.env.NODE_ENV === "production"

    // 本番のみ @sparticuz/chromium を動的読み込み（開発環境での競合を防ぐ）
    let executablePath: string
    let launchOptions: Parameters<typeof puppeteer.launch>[0]

    if (isProduction) {
      const chromium = await import("@sparticuz/chromium")
      executablePath = await chromium.default.executablePath()
      launchOptions = {
        args: chromium.default.args,
        defaultViewport: chromium.default.defaultViewport,
        executablePath,
        headless: true,
      }
    } else {
      executablePath =
        process.platform === "darwin"
          ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          : process.platform === "win32"
            ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            : "/usr/bin/google-chrome"
      launchOptions = {
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--no-zygote",
          "--disable-software-rasterizer",
        ],
        executablePath,
        headless: true,
        defaultViewport: { width: 800, height: 600 },
      }
    }

    console.log("📍 実行パス:", executablePath)

    // ブラウザ起動
    browser = await puppeteer.launch(launchOptions)
    console.log("✅ ブラウザ起動成功")

    const page = await browser.newPage()
    console.log("📄 新規ページ作成成功")

    // HTMLを設定
    console.log("📝 HTMLコンテンツ設定中...")
    await page.setContent(html, {
      waitUntil: "load",
      timeout: 30000,
    })
    console.log("✅ HTMLコンテンツ設定完了")

    // レンダリング安定化のため短く待機
    await new Promise((resolve) => setTimeout(resolve, 500))

    const isLandscape = options.orientation !== "portrait"
    const authorLabel = options.authorLabel ?? DEFAULT_AUTHOR_LABEL
    const headerLogo = options.baseUrl
      ? `<img src="${options.baseUrl}/logo.png" alt="" class="brand-logo" style="height:20px;width:auto;vertical-align:middle">`
      : ""
    const headerTemplate = `
      <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:12px 20px;background:linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%);color:#fff;font-size:9.5pt;font-weight:600;letter-spacing:0.08em;width:100%;box-sizing:border-box;">
        <span>SOLVE WISE</span>
        ${headerLogo}
      </div>
    `
    const footerTemplate = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:linear-gradient(135deg, #3730a3 0%, #4f46e5 100%);color:rgba(255,255,255,0.95);font-size:9pt;width:100%;box-sizing:border-box;flex-wrap:wrap;gap:8px;">
        <span class="pageNumber" style="font-weight:600"></span> / <span class="totalPages" style="font-weight:600"></span>
        <span style="opacity:0.9">${authorLabel.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
        <span style="font-size:8pt;opacity:0.85">${COPYRIGHT}</span>
      </div>
    `

    // PDF生成
    console.log("🖨️ PDF生成中...", { landscape: isLandscape })
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: isLandscape,
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
    })
    console.log("✅ PDF生成完了:", `${(pdfBuffer.length / 1024).toFixed(2)} KB`)

    // ファイル名生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const fileName = `AI_Consulting_Report_${timestamp}.pdf`

    return {
      buffer: Buffer.from(pdfBuffer),
      fileName,
      mimeType: "application/pdf",
    }
  } catch (error) {
    console.error("❌ PDF生成処理でエラー:", error)
    throw error
  } finally {
    // ブラウザを閉じる
    if (browser) {
      console.log("🔒 ブラウザをクローズ中...")
      try {
        await browser.close()
        console.log("✅ ブラウザクローズ完了")
      } catch (closeError) {
        console.error("⚠️ ブラウザクローズでエラー:", closeError)
      }
    }
  }
}
