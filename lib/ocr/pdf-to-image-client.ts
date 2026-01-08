/**
 * クライアントサイドでPDFを画像に変換する
 * ブラウザのPDF.jsを使用して、サーバーレス環境での問題を回避
 */

export async function convertPdfToImageClient(
  pdfDataUrl: string,
  pageNumber: number = 1,
  scale: number = 2.0
): Promise<string> {
  try {
    // pdfjs-distを動的インポート（クライアントサイドのみ）
    const pdfjsLib = await import('pdfjs-dist')
    
    // ワーカーを無効化してメインスレッドで処理（最も確実な方法）
    // ブラウザ環境ではメインスレッドでも十分に動作する
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
      // 空文字列を設定することでワーカーを無効化し、メインスレッドで処理
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''
      console.log('✅ pdfjs-dist: ワーカーを無効化、メインスレッドで処理します')
    }

    // Base64データをUint8Arrayに変換
    const base64Data = pdfDataUrl.replace(/^data:application\/pdf;base64,/, '')
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
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas context could not be created')
    }

    canvas.height = viewport.height
    canvas.width = viewport.width

    // PDFをCanvasにレンダリング
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise

    // Canvasを画像データURLに変換
    const imageDataUrl = canvas.toDataURL('image/png')
    return imageDataUrl
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`PDFを画像に変換できませんでした: ${msg}`)
  }
}
