/**
 * PDF(バッファ)を PNG(バッファ)に変換する。
 * - Claude API は PDF を直接受け付けないため、OCR前に画像化が必要
 * - 優先: poppler-utils の `pdftoppm` を使用（高速・高品質）
 * - フォールバック: pdfjs-dist + canvas を使用（Vercel等のサーバーレス環境対応）
 * 
 * インストール:
 * - macOS(Homebrew): `brew install poppler`
 * - Ubuntu/Debian: `sudo apt-get install poppler-utils`
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
 * pdfjs-dist + canvas を使用してPDFをPNGに変換（Vercel環境対応）
 * DOMMatrixエラーを回避するため、Node.js環境用の設定を追加
 */
async function convertPdfWithPdfJs(
  pdfBuffer: Buffer,
  options: ConvertOptions = {}
): Promise<Buffer> {
  try {
    console.log("📄 pdfjs-dist + canvasを使用してPDFを変換します...")
    console.log("⚠️ Vercel環境ではpdfjs-distのワーカー設定が必要です")
    
    // DOMMatrixのpolyfillを追加（Node.js環境で必要）
    if (typeof globalThis.DOMMatrix === 'undefined') {
      // DOMMatrixの簡易polyfill
      globalThis.DOMMatrix = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
        constructor(init?: string | number[]) {
          if (init) {
            if (typeof init === 'string') {
              const matrix = init.match(/matrix\(([^)]+)\)/)
              if (matrix) {
                const values = matrix[1].split(',').map(v => parseFloat(v.trim()))
                if (values.length >= 6) {
                  this.a = values[0]; this.b = values[1]
                  this.c = values[2]; this.d = values[3]
                  this.e = values[4]; this.f = values[5]
                }
              }
            } else if (Array.isArray(init) && init.length >= 6) {
              this.a = init[0]; this.b = init[1]
              this.c = init[2]; this.d = init[3]
              this.e = init[4]; this.f = init[5]
            }
          }
        }
        multiply(other: DOMMatrix) {
          return new DOMMatrix([
            this.a * other.a + this.c * other.b,
            this.b * other.a + this.d * other.b,
            this.a * other.c + this.c * other.d,
            this.b * other.c + this.d * other.d,
            this.a * other.e + this.c * other.f + this.e,
            this.b * other.e + this.d * other.f + this.f,
          ])
        }
        translate(x: number, y: number) {
          return new DOMMatrix([this.a, this.b, this.c, this.d, this.e + x, this.f + y])
        }
        scale(x: number, y?: number) {
          const sy = y ?? x
          return new DOMMatrix([this.a * x, this.b * x, this.c * sy, this.d * sy, this.e, this.f])
        }
      } as any
    }
    
    // 動的インポート（pdfjs-distとcanvasは重いので必要時のみ読み込む）
    let pdfjsLib: any
    let createCanvas: any
    
    try {
      // pdfjs-distのNode.js環境用インポート
      // legacy/build/pdf.mjsはワーカーを使用しようとするため、通常のビルドを使用
      try {
        // まず通常のビルドを試行（ワーカーを無効化しやすい）
        pdfjsLib = await import("pdfjs-dist")
        console.log("✅ pdfjs-dist を読み込みました")
      } catch (e1) {
        try {
          // フォールバック: legacy/build/pdf.mjs
          pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
          console.log("✅ pdfjs-dist/legacy/build/pdf.mjs を読み込みました")
        } catch (e2) {
          throw new Error(`pdfjs-distのインポートに失敗: ${e1 instanceof Error ? e1.message : String(e1)}, ${e2 instanceof Error ? e2.message : String(e2)}`)
        }
      }
      
      // Vercel環境ではワーカーを無効化（メインスレッドで処理）
      // ワーカーファイルが見つからないエラーを回避
      // workerSrcを設定しないことで、getDocumentのオプションでワーカーを無効化
      // （workerSrcにnullを設定すると"Invalid workerSrc type"エラーが発生するため）
      if (pdfjsLib.GlobalWorkerOptions) {
        // workerSrcは設定しない（undefinedのまま）
        // getDocumentのオプションでuseWorkerFetch: falseを設定することでワーカーを無効化
        if (typeof pdfjsLib.GlobalWorkerOptions.isEvalSupported !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.isEvalSupported = false
        }
        console.log("✅ pdfjs-distワーカー設定完了（getDocumentオプションで無効化）")
      }
      
      // ワーカーを使用しない設定を追加
      // Node.js環境ではワーカーが動作しないため、メインスレッドで処理
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        // Node.js環境であることを確認
        console.log("✅ Node.js環境を検出、ワーカーなしで処理します")
      }
      
      const canvasModule = await import("canvas")
      createCanvas = canvasModule.createCanvas
      console.log("✅ canvas を読み込みました")
    } catch (importError) {
      const importMsg = importError instanceof Error ? importError.message : String(importError)
      console.error("❌ モジュールのインポートに失敗:", importMsg)
      throw new Error(`必要なモジュールのインポートに失敗しました: ${importMsg}`)
    }

    const page = options.page ?? 1
    const scaleTo = options.scaleTo ?? 2048

    // PDFを読み込む（Node.js環境ではUint8Arrayを直接使用）
    // useSystemFonts: true でワーカーを回避
    const uint8Array = new Uint8Array(pdfBuffer)
    console.log(`📖 PDFを読み込み中... (サイズ: ${uint8Array.length} bytes)`)
    
    // getDocumentのオプションでワーカーを完全に無効化
    // Vercel環境ではワーカーファイルが見つからないため、すべてのワーカー関連機能を無効化
    const loadingTask = pdfjsLib.getDocument({ 
      data: uint8Array,
      useSystemFonts: true, // システムフォントを使用してワーカーを回避
      verbosity: 0, // ログを抑制
      useWorkerFetch: false, // ワーカーのfetchを無効化
      isEvalSupported: false, // evalを無効化（ワーカーを使用しない）
      disableAutoFetch: true, // 自動フェッチを無効化（ワーカーを使用しない）
      disableStream: true, // ストリームを無効化（ワーカーを使用しない）
      // ワーカーを完全に無効化するための追加オプション
      ...(typeof (pdfjsLib as any).disableWorker !== 'undefined' ? { disableWorker: true } : {}),
    })
    const pdf = await loadingTask.promise
    console.log(`📄 PDF読み込み完了 (総ページ数: ${pdf.numPages})`)

    // 指定ページを取得
    const pdfPage = await pdf.getPage(page)
    const viewport = pdfPage.getViewport({ scale: 1.0 })
    console.log(`📐 ページ${page}のビューポート: ${viewport.width}x${viewport.height}`)

    // スケールを計算
    const scale = scaleTo / Math.max(viewport.width, viewport.height)
    const scaledViewport = pdfPage.getViewport({ scale })
    console.log(`🖼️ スケール: ${scale.toFixed(2)}, 出力サイズ: ${scaledViewport.width}x${scaledViewport.height}`)

    // Canvasを作成
    const canvas = createCanvas(scaledViewport.width, scaledViewport.height)
    const context = canvas.getContext("2d")

    // PDFをCanvasにレンダリング
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
    }
    console.log("🎨 PDFをCanvasにレンダリング中...")
    await pdfPage.render(renderContext).promise
    console.log("✅ レンダリング完了")

    // CanvasをPNGバッファに変換
    const pngBuffer = canvas.toBuffer("image/png")
    console.log(`✅ PNG変換完了 (サイズ: ${pngBuffer.length} bytes)`)
    return pngBuffer
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error("❌ PDF→PNG変換（pdfjs-dist）エラー:", msg)
    if (stack) {
      console.error("スタックトレース:", stack)
    }
    throw new Error(`PDF→PNG変換（pdfjs-dist）に失敗しました: ${msg}`)
  }
}

/**
 * Vercel環境かどうかを判定
 */
function isVercelEnvironment(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_URL
  )
}

export async function convertPdfBufferToPngBuffer(
  pdfBuffer: Buffer,
  options: ConvertOptions = {}
): Promise<Buffer> {
  const page = options.page ?? 1
  const scaleTo = options.scaleTo ?? 2048

  // Vercel環境の場合はpdfjs-distを使用（pdftoppmは利用不可）
  if (isVercelEnvironment()) {
    console.log("🔍 Vercel環境を検出、pdfjs-dist + canvasを使用します")
    try {
      return await convertPdfWithPdfJs(pdfBuffer, options)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error("❌ pdfjs-dist変換エラー:", msg)
      throw new Error(`PDF→PNG変換に失敗しました（Vercel環境）: ${msg}`)
    }
  }

  // ローカル環境ではまず pdftoppm を試行（高速・高品質）
  try {
    const tempDir = path.join(os.tmpdir(), `pdf-to-png-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    await fs.mkdir(tempDir, { recursive: true })

    const tempPdfPath = path.join(tempDir, "input.pdf")
    const outPrefix = path.join(tempDir, "page")
    const outPngPath = `${outPrefix}-${page}.png`

    try {
      await fs.writeFile(tempPdfPath, pdfBuffer)

      const { cmd, argsPrefix } = getPdftoppmCommand()
      const args = [
        ...argsPrefix,
        "-png",
        "-f",
        String(page),
        "-l",
        String(page),
        "-scale-to",
        String(scaleTo),
        tempPdfPath,
        outPrefix,
      ]

      await execFileAsync(cmd, args)

      const result = await fs.readFile(outPngPath)
      
      // 成功したら一時ディレクトリを削除して返す
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch {
        // noop
      }
      
      return result
    } catch (fileErr) {
      // 一時ディレクトリを削除
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch {
        // noop
      }
      throw fileErr
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    
    // pdftoppmが利用できない場合（ENOENT/spawnエラー）はフォールバックを試行
    if (msg.toLowerCase().includes("enoent") || msg.toLowerCase().includes("spawn")) {
      console.warn("⚠️ pdftoppmが利用できないため、pdfjs-dist + canvasにフォールバックします")
      try {
        return await convertPdfWithPdfJs(pdfBuffer, options)
      } catch (fallbackErr) {
        const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        throw new Error(
          [
            "PDF→PNG変換に失敗しました。",
            "pdftoppm: " + msg,
            "pdfjs-dist（フォールバック）: " + fallbackMsg,
            "",
            "解決方法:",
            "- ローカル環境: brew install poppler (macOS) または sudo apt-get install poppler-utils (Ubuntu/Debian)",
            "- Vercel環境: pdfjs-dist + canvasが自動的に使用されます（既に実装済み）",
          ].join("\n")
        )
      }
    }
    
    // その他のエラーはそのまま投げる
    throw new Error(`PDF→PNG変換に失敗しました: ${msg}`)
  }
}





