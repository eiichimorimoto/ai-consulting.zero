/**
 * PDFを画像に変換するユーティリティ
 */

import * as fs from "fs"
import * as path from "path"

/**
 * PDFを画像に変換（pdfjs-distを使用）
 * 注意: この実装はNode.js環境で動作しますが、pdfjs-distはブラウザ向けに設計されているため、
 * 代替手段として、PDFの最初のページを画像として抽出する処理を実装します。
 *
 * 実際の実装では、pdf-popplerやpdf2picなどのライブラリを使用することを推奨します。
 */

/**
 * PDFをBase64エンコードされた画像（PNG）に変換
 * この関数は、PDFを直接Claude APIに送信する代わりに、
 * 必要に応じてPDFを画像に変換する処理を提供します。
 *
 * 注意: Claude APIはPDFを直接サポートしているため、
 * この関数は必要に応じて使用してください。
 */
export async function convertPDFToImage(
  pdfBuffer: Buffer,
  pageNumber: number = 1
): Promise<{ imageBase64: string; mimeType: string }> {
  // 一時的に、PDFをそのまま返す（Claude APIがPDFをサポートしている場合）
  // 実際の実装では、pdf-popplerやpdf2picを使用してPDFを画像に変換します

  // ここでは、PDFをBase64エンコードして返します
  // 実際の画像変換は、pdf-popplerやpdf2picなどのライブラリを使用してください
  const base64Data = pdfBuffer.toString("base64")

  // 注意: Claude APIはPDFを直接サポートしていない可能性があるため、
  // 実際の実装では、PDFを画像に変換する必要があります

  return {
    imageBase64: base64Data,
    mimeType: "application/pdf", // 実際には 'image/png' などになるべき
  }
}

/**
 * PDFファイルを画像ファイルに変換（pdf-popplerを使用）
 * この関数を使用するには、pdf-popplerとpoppler-utilsが必要です。
 */
export async function convertPDFToImageFile(
  pdfPath: string,
  outputDir: string,
  pageNumber: number = 1
): Promise<string> {
  // pdf-popplerを使用する場合の実装例
  // const pdfPoppler = require('pdf-poppler');
  //
  // const options = {
  //   format: 'png',
  //   out_dir: outputDir,
  //   out_prefix: path.basename(pdfPath, '.pdf'),
  //   page: pageNumber,
  // };
  //
  // const result = await pdfPoppler.convert(pdfPath, options);
  // return result[0]; // 変換された画像ファイルのパス

  throw new Error(
    "PDF to image conversion is not implemented. Please install pdf-poppler or use a different approach."
  )
}
