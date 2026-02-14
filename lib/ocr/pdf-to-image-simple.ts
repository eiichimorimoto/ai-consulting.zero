/**
 * PDFを画像に変換する（簡易実装）
 *
 * 注意: この実装は、pdf-popplerまたはpdf2picなどの外部ツールが必要です。
 * 現在は、pdfjs-distとcanvasを使用した実装を試みていますが、
 * 統合が複雑なため、別のアプローチを検討する必要があります。
 */

import * as fs from "fs"
import * as path from "path"
import * as os from "os"

/**
 * PDFを画像に変換（pdf-popplerを使用）
 * 注意: poppler-utilsのインストールが必要です
 */
export async function convertPDFToImageWithPoppler(
  pdfBuffer: Buffer,
  outputFormat: "png" | "jpg" = "png"
): Promise<{ imageBuffer: Buffer; mimeType: string }> {
  try {
    // 一時ディレクトリを作成
    const tempDir = path.join(os.tmpdir(), `pdf-convert-${Date.now()}`)
    await fs.promises.mkdir(tempDir, { recursive: true })

    // 一時PDFファイルを作成
    const tempPdfPath = path.join(tempDir, "input.pdf")
    await fs.promises.writeFile(tempPdfPath, pdfBuffer)

    // pdf-popplerを使用してPDFを画像に変換
    // 注意: pdf-popplerは外部コマンド（poppler-utils）に依存します
    const pdfPoppler = require("pdf-poppler")

    const options = {
      format: outputFormat,
      out_dir: tempDir,
      out_prefix: "page",
      page: 1, // 最初のページのみ
    }

    const result = await pdfPoppler.convert(tempPdfPath, options)

    // 変換された画像ファイルを読み込む
    const imagePath = result[0]
    const imageBuffer = await fs.promises.readFile(imagePath)

    // 一時ファイルを削除
    await fs.promises.rm(tempDir, { recursive: true, force: true })

    return {
      imageBuffer,
      mimeType: outputFormat === "png" ? "image/png" : "image/jpeg",
    }
  } catch (error) {
    throw new Error(
      `PDFを画像に変換できませんでした: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
