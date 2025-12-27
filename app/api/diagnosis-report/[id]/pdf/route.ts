import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// PDFをサーバーサイドで生成
async function generatePDF(report: any): Promise<Buffer> {
  // PDFKit や puppeteer などのライブラリを使う代わりに
  // シンプルなHTMLからPDFを生成するアプローチを取る
  
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Webサイト診断レポート - ${report.company_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif;
      background: #1e293b;
      color: #ffffff;
      padding: 40px;
      line-height: 1.6;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header { 
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      padding: 40px;
      border-radius: 16px;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { color: #93c5fd; }
    .score-box {
      background: rgba(255,255,255,0.1);
      padding: 30px;
      border-radius: 16px;
      margin-bottom: 30px;
      text-align: center;
    }
    .score { font-size: 72px; font-weight: bold; }
    .score.good { color: #4ade80; }
    .score.medium { color: #fbbf24; }
    .score.bad { color: #f87171; }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .metric-value { font-size: 32px; font-weight: bold; }
    .metric-label { color: #94a3b8; font-size: 14px; margin-top: 8px; }
    .issues-section {
      background: rgba(255,255,255,0.1);
      padding: 30px;
      border-radius: 16px;
    }
    .issues-section h2 { font-size: 24px; margin-bottom: 20px; }
    .issue-card {
      background: rgba(255,255,255,0.05);
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 16px;
      border-left: 4px solid #ef4444;
    }
    .issue-header { display: flex; gap: 12px; margin-bottom: 12px; align-items: center; }
    .severity-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }
    .severity-critical { background: #ef4444; }
    .severity-high { background: #f97316; }
    .severity-medium { background: #eab308; }
    .issue-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    .issue-impact { color: #fbbf24; }
    .footer { text-align: center; margin-top: 40px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Webサイト診断レポート</h1>
      <p>${report.company_name}</p>
      <p style="font-size: 14px; margin-top: 8px;">${report.url}</p>
    </div>

    <div class="score-box">
      <div class="score ${report.overall_score >= 80 ? 'good' : report.overall_score >= 50 ? 'medium' : 'bad'}">
        ${report.overall_score}
      </div>
      <p style="font-size: 18px; margin-top: 10px;">総合スコア / 100</p>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value" style="color: ${report.metrics.mobileScore >= 80 ? '#4ade80' : report.metrics.mobileScore >= 50 ? '#fbbf24' : '#f87171'}">${report.metrics.mobileScore}</div>
        <div class="metric-label">モバイル</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: ${report.metrics.desktopScore >= 80 ? '#4ade80' : report.metrics.desktopScore >= 50 ? '#fbbf24' : '#f87171'}">${report.metrics.desktopScore}</div>
        <div class="metric-label">デスクトップ</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: ${report.metrics.seoScore >= 80 ? '#4ade80' : report.metrics.seoScore >= 50 ? '#fbbf24' : '#f87171'}">${report.metrics.seoScore}</div>
        <div class="metric-label">SEO</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: ${report.metrics.accessibilityScore >= 80 ? '#4ade80' : report.metrics.accessibilityScore >= 50 ? '#fbbf24' : '#f87171'}">${report.metrics.accessibilityScore}</div>
        <div class="metric-label">アクセシビリティ</div>
      </div>
    </div>

    <div class="issues-section">
      <h2>⚠️ 検出された課題</h2>
      ${report.top_issues.map((issue: any, index: number) => `
        <div class="issue-card">
          <div class="issue-header">
            <span style="font-size: 24px; color: #64748b;">#${index + 1}</span>
            <span class="severity-badge severity-${issue.severity}">${issue.severity === 'critical' ? '重大' : issue.severity === 'high' ? '高' : '中'}</span>
            <span style="color: #94a3b8; text-transform: uppercase;">${issue.category}</span>
          </div>
          <div class="issue-title">${issue.issue}</div>
          <div class="issue-impact">💰 ${issue.impact}</div>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>診断日時: ${new Date(report.created_at).toLocaleString('ja-JP')}</p>
      <p style="margin-top: 8px;">© AI Consulting Zero - Webサイト診断サービス</p>
    </div>
  </div>
</body>
</html>
  `;

  // HTMLをPDFに変換するために、外部サービスまたはpuppeteerを使用
  // ここでは簡易的にHTMLをBase64エンコードして返す
  // 本番環境ではPuppeteerやPDFライブラリを使用することを推奨
  
  // puppeteerを使用してPDFを生成
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });
    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch (puppeteerError) {
    console.log('Puppeteer not available, using HTML fallback');
    // Puppeteerが利用できない場合はHTMLを返す
    return Buffer.from(html);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // レポートを取得
    const { data: report, error } = await supabase
      .from('diagnosis_previews')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // PDFを生成
    const pdfBuffer = await generatePDF(report);

    // PDFとして返す
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="diagnosis_${report.company_name}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

