/**
 * PPT生成ユーティリティ
 */

import pptxgen from 'pptxgenjs';
import { SlideContent, defaultTemplate, colors } from './templates';

export interface GeneratePPTOptions {
  title?: string;
  template?: SlideContent[];
  authorName?: string;
}

/**
 * PPTファイルを生成してBase64文字列として返す
 */
export async function generatePPT(options: GeneratePPTOptions = {}): Promise<{
  base64: string;
  fileName: string;
  mimeType: string;
}> {
  const {
    title = 'AI経営コンサルティング',
    template = defaultTemplate,
    authorName = 'AI参謀',
  } = options;

  // PPTインスタンス作成
  const pptx = new pptxgen();

  // メタデータ設定
  pptx.author = authorName;
  pptx.company = 'AI Consulting Zero';
  pptx.subject = title;
  pptx.title = title;

  // レイアウト設定（16:9）
  pptx.layout = 'LAYOUT_16x9';

  // スライド生成
  template.forEach((slideContent, index) => {
    if (index === 0) {
      // タイトルスライド
      addTitleSlide(pptx, slideContent);
    } else {
      // コンテンツスライド
      addContentSlide(pptx, slideContent);
    }
  });

  // ArrayBufferとして生成
  const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  
  // Base64エンコード
  const base64 = Buffer.from(buffer).toString('base64');
  
  // ファイル名生成
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `AI_Consulting_${timestamp}.pptx`;

  return {
    base64,
    fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
}

/**
 * タイトルスライドを追加
 */
function addTitleSlide(pptx: pptxgen, content: SlideContent): void {
  const slide = pptx.addSlide();

  // 背景グラデーション
  slide.background = {
    fill: `${colors.primary}`,
  };

  // メインタイトル
  slide.addText(content.title, {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1,
    fontSize: 44,
    bold: true,
    color: colors.background,
    align: 'center',
    fontFace: 'メイリオ',
  });

  // サブタイトル
  if (content.subtitle) {
    slide.addText(content.subtitle, {
      x: 0.5,
      y: 3.8,
      w: 9,
      h: 0.6,
      fontSize: 24,
      color: colors.background,
      align: 'center',
      fontFace: 'メイリオ',
    });
  }

  // 日付
  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  slide.addText(`作成日: ${today}`, {
    x: 0.5,
    y: 5,
    w: 9,
    h: 0.4,
    fontSize: 14,
    color: colors.background,
    align: 'center',
    fontFace: 'メイリオ',
  });
}

/**
 * コンテンツスライドを追加
 */
function addContentSlide(pptx: pptxgen, content: SlideContent): void {
  const slide = pptx.addSlide();

  // 背景色
  slide.background = { fill: colors.background };

  // タイトル
  slide.addText(content.title, {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.8,
    fontSize: 32,
    bold: true,
    color: colors.text,
    fontFace: 'メイリオ',
  });

  // 下線
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 1.4,
    w: 9,
    h: 0.05,
    fill: { color: colors.primary },
  });

  // 箇条書き
  if (content.items && content.items.length > 0) {
    const bulletPoints = content.items.map((item) => ({
      text: item,
      options: {
        bullet: true,
        fontSize: 20,
        color: colors.text,
        fontFace: 'メイリオ',
      },
    }));

    slide.addText(bulletPoints, {
      x: 1,
      y: 2,
      w: 8,
      h: 3,
      valign: 'top',
    });
  }

  // フッター
  slide.addText('AI参謀 - AI経営コンサルティング', {
    x: 0.5,
    y: 5.3,
    w: 9,
    h: 0.3,
    fontSize: 10,
    color: colors.textLight,
    align: 'center',
    fontFace: 'メイリオ',
  });
}
