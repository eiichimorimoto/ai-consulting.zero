/**
 * PDF生成ユーティリティ（Puppeteer使用）
 */

import puppeteer from 'puppeteer-core';
import type { PDFGenerateOptions, PDFGenerateResult, ReportSection, ChatData, TableData, ListData } from './types';

/**
 * レポートのHTMLを生成
 */
function generateReportHTML(options: PDFGenerateOptions): string {
  const { sections, metadata } = options;

  const sectionsHTML = sections
    .map(section => generateSectionHTML(section))
    .join('\n\n');

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.title}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 20mm;
    }
    
    body {
      font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Meiryo', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 0;
    }

    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
    }

    .cover-title {
      font-size: 32pt;
      font-weight: bold;
      color: #6366f1;
      margin-bottom: 20px;
    }

    .cover-subtitle {
      font-size: 18pt;
      color: #64748b;
      margin-bottom: 40px;
    }

    .cover-meta {
      font-size: 12pt;
      color: #64748b;
    }

    .section {
      page-break-inside: avoid;
      margin-bottom: 40px;
    }

    .section-title {
      font-size: 18pt;
      font-weight: bold;
      color: #6366f1;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 8px;
      margin-bottom: 20px;
    }

    .chat-message {
      margin-bottom: 20px;
      padding: 12px;
      border-radius: 4px;
    }

    .chat-user {
      background-color: #f1f5f9;
      border-left: 4px solid #6366f1;
    }

    .chat-assistant {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
    }

    .chat-role {
      font-weight: bold;
      font-size: 10pt;
      color: #64748b;
      margin-bottom: 4px;
    }

    .chat-content {
      font-size: 11pt;
      white-space: pre-wrap;
    }

    .swot-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    .swot-table th,
    .swot-table td {
      border: 1px solid #cbd5e1;
      padding: 12px;
      vertical-align: top;
    }

    .swot-table th {
      background-color: #6366f1;
      color: white;
      font-weight: bold;
      text-align: center;
    }

    .swot-table td {
      background-color: #f8fafc;
    }

    .list-item {
      margin-bottom: 10px;
      padding-left: 20px;
      position: relative;
    }

    .list-item:before {
      content: "•";
      position: absolute;
      left: 0;
      color: #6366f1;
      font-weight: bold;
    }

    .report-section .report-body { font-size: 11pt; line-height: 1.7; color: #334155; }
    .report-body .report-heading { color: #1e293b; margin: 20px 0 10px 0; font-size: 14pt; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .report-body .report-para { margin: 0 0 14px 0; }
    .report-body .report-list { margin: 0 0 14px 0; padding-left: 24px; }
    .report-body .report-list li { margin-bottom: 6px; }
    .report-body ul { list-style-type: disc; }
    .report-body ol { list-style-type: decimal; padding-left: 24px; }

    .footer {
      position: fixed;
      bottom: 10mm;
      right: 10mm;
      font-size: 9pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <!-- 表紙 -->
  <div class="cover-page">
    <div class="cover-title">${metadata.title}</div>
    <div class="cover-subtitle">${metadata.sessionName}</div>
    <div class="cover-meta">
      ${metadata.companyName ? `${metadata.companyName}<br>` : ''}
      ${metadata.userName ? `担当: ${metadata.userName}<br>` : ''}
      作成日: ${metadata.createdAt}
    </div>
  </div>

  <!-- セクション -->
  ${sectionsHTML}

  <div class="footer">AI参謀 - AI経営コンサルティング</div>
</body>
</html>
  `.trim();
}

/**
 * セクションのHTMLを生成
 */
function generateSectionHTML(section: ReportSection): string {
  switch (section.type) {
    case 'chat':
      return generateChatHTML(section);
    case 'table':
      return generateTableHTML(section);
    case 'list':
      return generateListHTML(section);
    case 'text':
      return generateTextHTML(section);
    case 'html':
      return generateReportHTMLSection(section);
    default:
      return '';
  }
}

/**
 * レポート用HTMLセクション（AI回答を成型済みHTMLで表示）
 * content は既にHTMLのためエスケープしない
 */
function generateReportHTMLSection(section: ReportSection): string {
  const htmlContent = section.content as string;
  return `
    <div class="section report-section">
      <h2 class="section-title">${escapeHtml(section.title)}</h2>
      <div class="report-body">${htmlContent}</div>
    </div>
  `;
}

/**
 * 会話履歴のHTML生成
 */
function generateChatHTML(section: ReportSection): string {
  const chatData = section.content as ChatData;
  
  const messagesHTML = chatData.messages
    .map(msg => {
      const roleClass = msg.role === 'user' ? 'chat-user' : 'chat-assistant';
      const roleLabel = msg.role === 'user' ? 'ユーザー' : 'AI';
      
      return `
        <div class="chat-message ${roleClass}">
          <div class="chat-role">${roleLabel}</div>
          <div class="chat-content">${escapeHtml(msg.content)}</div>
        </div>
      `;
    })
    .join('\n');

  return `
    <div class="section">
      <h2 class="section-title">${section.title}</h2>
      ${messagesHTML}
    </div>
  `;
}

/**
 * テーブルのHTML生成（SWOT用）
 */
function generateTableHTML(section: ReportSection): string {
  const tableData = section.content as TableData;
  
  const headersHTML = tableData.headers
    .map(h => `<th>${escapeHtml(h)}</th>`)
    .join('');
  
  const rowsHTML = tableData.rows
    .map(row => {
      const cellsHTML = row
        .map(cell => `<td>${escapeHtml(cell)}</td>`)
        .join('');
      return `<tr>${cellsHTML}</tr>`;
    })
    .join('\n');

  return `
    <div class="section">
      <h2 class="section-title">${section.title}</h2>
      <table class="swot-table">
        <thead>
          <tr>${headersHTML}</tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * リストのHTML生成
 */
function generateListHTML(section: ReportSection): string {
  const listData = section.content as ListData;
  
  const itemsHTML = listData.items
    .map(item => `<div class="list-item">${escapeHtml(item)}</div>`)
    .join('\n');

  return `
    <div class="section">
      <h2 class="section-title">${section.title}</h2>
      ${itemsHTML}
    </div>
  `;
}

/**
 * テキストのHTML生成
 */
function generateTextHTML(section: ReportSection): string {
  const content = section.content as string;
  
  return `
    <div class="section">
      <h2 class="section-title">${section.title}</h2>
      <p>${escapeHtml(content)}</p>
    </div>
  `;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

/**
 * PuppeteerでPDF生成
 */
export async function generatePDFReport(options: PDFGenerateOptions): Promise<PDFGenerateResult> {
  let browser;

  try {
    // HTML生成
    const html = generateReportHTML(options);

    console.log('🚀 PDF生成: ブラウザ起動準備');

    const isProduction = process.env.NODE_ENV === 'production';

    // 本番のみ @sparticuz/chromium を動的読み込み（開発環境での競合を防ぐ）
    let executablePath: string;
    let launchOptions: Parameters<typeof puppeteer.launch>[0];

    if (isProduction) {
      const chromium = await import('@sparticuz/chromium');
      executablePath = await chromium.default.executablePath();
      launchOptions = {
        args: chromium.default.args,
        defaultViewport: chromium.default.defaultViewport,
        executablePath,
        headless: true,
      };
    } else {
      executablePath =
        process.platform === 'darwin'
          ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          : process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : '/usr/bin/google-chrome';
      launchOptions = {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--disable-software-rasterizer',
        ],
        executablePath,
        headless: true,
        defaultViewport: { width: 800, height: 600 },
      };
    }

    console.log('📍 実行パス:', executablePath);

    // ブラウザ起動
    browser = await puppeteer.launch(launchOptions);
    console.log('✅ ブラウザ起動成功');

    const page = await browser.newPage();
    console.log('📄 新規ページ作成成功');
    
    // HTMLを設定
    console.log('📝 HTMLコンテンツ設定中...');
    await page.setContent(html, {
      waitUntil: 'load',
      timeout: 30000,
    });
    console.log('✅ HTMLコンテンツ設定完了');

    // レンダリング安定化のため短く待機
    await new Promise(resolve => setTimeout(resolve, 500));

    // PDF生成
    console.log('🖨️ PDF生成中...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });
    console.log('✅ PDF生成完了:', `${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // ファイル名生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `AI_Consulting_Report_${timestamp}.pdf`;

    return {
      buffer: Buffer.from(pdfBuffer),
      fileName,
      mimeType: 'application/pdf',
    };
  } catch (error) {
    console.error('❌ PDF生成処理でエラー:', error);
    throw error;
  } finally {
    // ブラウザを閉じる
    if (browser) {
      console.log('🔒 ブラウザをクローズ中...');
      try {
        await browser.close();
        console.log('✅ ブラウザクローズ完了');
      } catch (closeError) {
        console.error('⚠️ ブラウザクローズでエラー:', closeError);
      }
    }
  }
}
