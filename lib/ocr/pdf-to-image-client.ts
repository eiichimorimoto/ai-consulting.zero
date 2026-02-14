/**
 * クライアントサイドでPDFを画像に変換する
 * CDN経由でPDF.jsを読み込み、Webpackバンドリング問題を回避
 */

// PDF.jsのCDN URL（安定版3.x）
const PDFJS_VERSION = "3.11.174"
const PDFJS_CDN_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`

// グローバル型定義
declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string }
      getDocument: (params: { data: Uint8Array }) => { promise: Promise<PDFDocument> }
    }
  }
}

interface PDFDocument {
  getPage: (num: number) => Promise<PDFPage>
}

interface PDFPage {
  getViewport: (params: { scale: number }) => { width: number; height: number }
  render: (params: {
    canvasContext: CanvasRenderingContext2D
    viewport: { width: number; height: number }
  }) => { promise: Promise<void> }
}

// PDF.jsをCDNから読み込む
async function loadPdfJs(): Promise<Window["pdfjsLib"]> {
  if (typeof window === "undefined") {
    throw new Error("ブラウザ環境でのみ使用可能です")
  }

  // 既に読み込み済みならそれを返す
  if (window.pdfjsLib) {
    return window.pdfjsLib
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = PDFJS_CDN_URL
    script.async = true
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
        console.log("✅ PDF.js CDNから読み込み完了:", PDFJS_VERSION)
        resolve(window.pdfjsLib)
      } else {
        reject(new Error("PDF.jsの読み込みに失敗しました"))
      }
    }
    script.onerror = () => reject(new Error("PDF.js CDNからの読み込みに失敗しました"))
    document.head.appendChild(script)
  })
}

export async function convertPdfToImageClient(
  pdfDataUrl: string,
  pageNumber: number = 1,
  scale: number = 2.0
): Promise<string> {
  try {
    // CDNからPDF.jsを読み込む
    const pdfjsLib = await loadPdfJs()
    if (!pdfjsLib) {
      throw new Error("PDF.jsを読み込めませんでした")
    }

    // Base64データをUint8Arrayに変換
    const base64Data = pdfDataUrl.replace(/^data:application\/pdf;base64,/, "")
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // PDFを読み込む
    const loadingTask = pdfjsLib.getDocument({ data: bytes })
    const pdf = await loadingTask.promise

    // 指定ページを取得
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })

    // Canvasを作成
    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Canvas context could not be created")
    }

    canvas.height = viewport.height
    canvas.width = viewport.width

    // PDFをCanvasにレンダリング
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise

    // Canvasを画像データURLに変換
    const imageDataUrl = canvas.toDataURL("image/png")
    return imageDataUrl
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`PDFを画像に変換できませんでした: ${msg}`)
  }
}
