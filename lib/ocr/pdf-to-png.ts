/**
 * PDF(バッファ)を pdfjs-dist を使って PNG(バッファ)に変換する。
 * - Claude API は PDF を直接受け付けないため、OCR前に画像化が必要
 * - pdfjs-distを使用することで、Vercelのサーバーレス環境でも動作
 * - フォールバック: poppler-utils が利用可能な場合はそれを使用
 */

import * as pdfjsLib from "pdfjs-dist"
import { createCanvas } from "canvas"
import { execFile } from "node:child_process"
import { promises as fs } from "node:fs"
import fssync from "node:fs"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

// pdfjs-distのWorker設定（Node.js環境用）
// Node.js環境ではWorkerを使用しない
if (typeof window === "undefined") {
  // @ts-ignore - Node.js環境ではWorkerは不要
  pdfjsLib.GlobalWorkerOptions.workerSrc = false
}

type ConvertOptions = {
  /** 1始まり */
  page?: number
  /** 長辺スケール（例: 2048） */
  scaleTo?: number
}

function getPdftoppmCommand(): { cmd: string; argsPrefix: string[] } {
  // Homebrew (Apple Silicon)
  const homebrew = "/opt/homebrew/bin/pdftoppm"
  if (fssync.existsSync(homebrew)) {
    return { cmd: homebrew, argsPrefix: [] }
  }
  // それ以外は PATH に任せる
  return { cmd: "pdftoppm", argsPrefix: [] }
}

/**
 * pdfjs-distを使用してPDFをPNGに変換（Vercel環境対応）
 */
async function convertPdfWithPdfJs(
  pdfBuffer: Buffer,
  pageNumber: number,
  scaleTo: number
): Promise<Buffer> {
  try {
    // PDFドキュメントを読み込む
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      useSystemFonts: true,
    })
    const pdf = await loadingTask.promise

    // 指定されたページを取得（1始まりなので-1）
    const page = await pdf.getPage(pageNumber - 1)

    // ビューポートを計算（スケールを考慮）
    const viewport = page.getViewport({ scale: 1.0 })
    const scale = scaleTo / Math.max(viewport.width, viewport.height)
    const scaledViewport = page.getViewport({ scale })

    // Canvasを作成
    const canvas = createCanvas(scaledViewport.width, scaledViewport.height)
    const context = canvas.getContext("2d")

    // PDFページをCanvasにレンダリング
    // @ts-ignore - pdfjs-distとcanvasパッケージの型定義の不一致
    await page.render({
      canvasContext: context as any,
      viewport: scaledViewport,
    }).promise

    // CanvasをPNG Bufferに変換
    return canvas.toBuffer("image/png")
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`pdfjs-distによるPDF変換に失敗しました: ${msg}`)
  }
}

/**
 * poppler-utilsを使用してPDFをPNGに変換（フォールバック）
 */
async function convertPdfWithPoppler(
  pdfBuffer: Buffer,
  pageNumber: number,
  scaleTo: number
): Promise<Buffer> {
  const tempDir = path.join(os.tmpdir(), `pdf-to-png-${Date.now()}-${Math.random().toString(16).slice(2)}`)
  await fs.mkdir(tempDir, { recursive: true })

  const tempPdfPath = path.join(tempDir, "input.pdf")
  const outPrefix = path.join(tempDir, "page")
  const outPngPath = `${outPrefix}-${pageNumber}.png`

  try {
    await fs.writeFile(tempPdfPath, pdfBuffer)

    const { cmd, argsPrefix } = getPdftoppmCommand()
    const args = [
      ...argsPrefix,
      "-png",
      "-f",
      String(pageNumber),
      "-l",
      String(pageNumber),
      "-scale-to",
      String(scaleTo),
      tempPdfPath,
      outPrefix,
    ]

    await execFileAsync(cmd, args)
    return await fs.readFile(outPngPath)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes("enoent") || msg.toLowerCase().includes("spawn")) {
      throw new Error(
        [
          "poppler-utils（pdftoppm）が見つかりません。",
          "macOSの場合: brew install poppler",
          "Ubuntu/Debianの場合: sudo apt-get install poppler-utils",
          `実際のエラー: ${msg}`,
        ].join("\n")
      )
    }
    throw new Error(`poppler-utilsによるPDF変換に失敗しました: ${msg}`)
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // noop
    }
  }
}

export async function convertPdfBufferToPngBuffer(
  pdfBuffer: Buffer,
  options: ConvertOptions = {}
): Promise<Buffer> {
  const page = options.page ?? 1
  const scaleTo = options.scaleTo ?? 2048

  // まずpdfjs-distで試す（Vercel環境対応）
  try {
    return await convertPdfWithPdfJs(pdfBuffer, page, scaleTo)
  } catch (pdfJsError) {
    console.warn("⚠️ pdfjs-distによる変換に失敗、poppler-utilsにフォールバック:", pdfJsError)
    
    // pdfjs-distが失敗した場合、poppler-utilsにフォールバック
    try {
      return await convertPdfWithPoppler(pdfBuffer, page, scaleTo)
    } catch (popplerError) {
      // 両方失敗した場合、pdfjs-distのエラーを優先（より一般的なエラー）
      throw pdfJsError
    }
  }
}





