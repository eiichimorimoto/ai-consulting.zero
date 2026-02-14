/**
 * 名刺OCR解析サービス
 * Claude APIを使用して名刺画像を解析し、構造化データに変換
 */

import { generateObject } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { BusinessCardData, OCRResponse } from "@/types/business-card"
import { convertPdfBufferToPngBuffer } from "./pdf-to-png"

// 名刺情報のZodスキーマ定義
const businessCardSchema = z.object({
  person: z.object({
    nameJa: z.string().optional().describe("日本語氏名"),
    nameEn: z.string().optional().describe("英語氏名"),
    nameKana: z.string().optional().describe("ふりがな（あれば）"),
  }),
  company: z.object({
    nameJa: z.string().optional().describe("日本語会社名"),
    nameEn: z.string().optional().describe("英語会社名"),
    abbreviation: z.string().optional().describe("略称（あれば）"),
    slogan: z
      .object({
        ja: z.string().optional(),
        en: z.string().optional(),
      })
      .optional(),
  }),
  departments: z
    .array(
      z.object({
        ja: z.string().describe("部署名（日本語）"),
        en: z.string().optional().describe("部署名（英語）"),
      })
    )
    .optional(),
  contact: z
    .object({
      email: z.string().optional().describe("メールアドレス"),
      tel: z.string().optional().describe("電話番号（国内形式）"),
      telInternational: z.string().optional().describe("電話番号（国際形式）"),
      fax: z.string().optional().describe("FAX番号（国内形式）"),
      faxInternational: z.string().optional().describe("FAX番号（国際形式）"),
      mobile: z.string().optional().describe("携帯電話番号"),
      url: z.string().optional().describe("WebサイトURL"),
    })
    .optional(),
  addresses: z
    .array(
      z.object({
        name: z.string().describe("拠点名（本社、支店など）"),
        postalCode: z.string().optional().describe("郵便番号"),
        addressJa: z.string().optional().describe("日本語住所"),
        addressEn: z.string().optional().describe("英語住所"),
        building: z.string().optional().describe("ビル名"),
      })
    )
    .optional(),
  certifications: z
    .array(
      z.object({
        name: z.string().describe("認証規格名"),
        number: z.string().describe("認証番号"),
      })
    )
    .optional(),
  confidence: z.number().optional().describe("解析の確信度（0-1）"),
})

/**
 * PDFを画像に変換する
 * pdf-popplerとpoppler-utilsを使用してPDFの最初のページをPNG画像に変換
 */
async function convertPDFToImageBuffer(
  pdfBuffer: Buffer
): Promise<{ imageBuffer: Buffer; mimeType: string }> {
  const png = await convertPdfBufferToPngBuffer(pdfBuffer, { page: 1, scaleTo: 2048 })
  return { imageBuffer: png, mimeType: "image/png" }
}

/**
 * 名刺画像をOCR解析
 */
export async function analyzeBusinessCard(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf"
): Promise<OCRResponse> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY環境変数が設定されていません")
    }

    const anthropic = createAnthropic({
      apiKey: apiKey,
    })

    // PDFの場合は、画像に変換する処理を追加
    let actualImageBase64 = imageBase64
    let actualMediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf"

    if (mediaType === "application/pdf") {
      // PDFを画像に変換する処理
      // 注意: 現在の実装では、PDFをそのまま送信します
      // Claude APIがPDFをサポートしていない場合は、pdf-popplerやpdf2picを使用して画像に変換してください

      const pdfBuffer = Buffer.from(imageBase64, "base64")
      const converted = await convertPDFToImageBuffer(pdfBuffer)
      actualImageBase64 = converted.imageBuffer.toString("base64")
      actualMediaType = converted.mimeType as "image/png"

      // 注意: Claude APIがPDFを直接サポートしていない場合、
      // 以下のコメントを解除して、PDFを画像に変換する処理を実装してください
      //
      // const pdfPoppler = require('pdf-poppler');
      // const tempDir = path.join(os.tmpdir(), 'pdf-convert');
      // await fs.promises.mkdir(tempDir, { recursive: true });
      //
      // const options = {
      //   format: 'png',
      //   out_dir: tempDir,
      //   out_prefix: 'page',
      //   page: 1,
      // };
      //
      // const result = await pdfPoppler.convert(pdfBuffer, options);
      // const imageBuffer = await fs.promises.readFile(result[0]);
      // actualImageBase64 = imageBuffer.toString('base64');
      // actualMediaType = 'image/png';
    } else {
      actualMediaType = mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif"
    }

    // generateObjectを使用して構造化データを取得
    const { object: parsedData } = await generateObject({
      model: anthropic("claude-sonnet-4-5-20250929"),
      schema: businessCardSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `この名刺画像から情報を抽出してください。日本語の名刺です。

読み取れる情報のみを抽出し、読み取れない項目は空のままにしてください。
郵便番号は「〒」マークの後の数字（例: 460-0002）を抽出してください。
住所は都道府県から始まる完全な形式で抽出してください。
部署は上位から下位の順序で配列に格納してください。
電話番号は国内形式と国際形式の両方を抽出してください。`,
            },
            {
              type: "image",
              image: Buffer.from(actualImageBase64, "base64"),
              mediaType: actualMediaType,
            },
          ],
        },
      ],
    })

    // BusinessCardData形式に変換
    const businessCardData: BusinessCardData = {
      person: {
        nameJa: parsedData.person?.nameJa || "",
        nameEn: parsedData.person?.nameEn || "",
        nameKana: parsedData.person?.nameKana || undefined,
      },
      company: {
        nameJa: parsedData.company?.nameJa || "",
        nameEn: parsedData.company?.nameEn || "",
        abbreviation: parsedData.company?.abbreviation || undefined,
        slogan: parsedData.company?.slogan || undefined,
      },
      departments: parsedData.departments || [],
      contact: {
        email: parsedData.contact?.email,
        tel: parsedData.contact?.tel,
        telInternational: parsedData.contact?.telInternational,
        fax: parsedData.contact?.fax,
        faxInternational: parsedData.contact?.faxInternational,
        mobile: parsedData.contact?.mobile,
        url: parsedData.contact?.url,
      },
      addresses: parsedData.addresses || [],
      certifications: parsedData.certifications || [],
      confidence: parsedData.confidence,
      analyzedAt: new Date().toISOString(),
    }

    return {
      success: true,
      data: businessCardData,
    }
  } catch (error) {
    console.error("OCR analysis error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
