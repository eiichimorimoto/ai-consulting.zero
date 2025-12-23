/**
 * PDF(バッファ)を poppler-utils の `pdftoppm` を使って PNG(バッファ)に変換する。
 * - Claude API は PDF を直接受け付けないため、OCR前に画像化が必要
 * - macOS(Homebrew): `brew install poppler`
 * - Ubuntu/Debian: `sudo apt-get install poppler-utils`
 * - 注意: Vercelのサーバーレス環境では poppler-utils が利用できないため、PDF処理は失敗します
 */

import { execFile } from "node:child_process"
import { promises as fs } from "node:fs"
import fssync from "node:fs"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

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
 * poppler-utilsを使用してPDFをPNGに変換
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

  // poppler-utilsを使用してPDFをPNGに変換
  return await convertPdfWithPoppler(pdfBuffer, page, scaleTo)
}





