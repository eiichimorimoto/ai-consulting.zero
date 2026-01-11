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
    
    // ワーカーファイルのパスを設定（Next.jsのパブリックフォルダから読み込む）
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
      // パブリックフォルダのワーカーファイルを使用
      const workerPath = '/pdf.worker.min.mjs'
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath
      console.log('✅ pdfjs-dist: ワーカーパスを設定:', workerPath)
    }

    // Base64データをUint8Arrayに変換
    const base64Data = pdfDataUrl.replace(/^data:application\/pdf;base64,/, '')
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // PDFを読み込む（ワーカーを使用）
    const loadingTask = pdfjsLib.getDocument({ 
      data: bytes,
      useSystemFonts: true,
      verbosity: 0,
    })
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
      canvas: canvas,
    } as any).promise

    // Canvasを画像データURLに変換
    const imageDataUrl = canvas.toDataURL('image/png')
    return imageDataUrl
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`PDFを画像に変換できませんでした: ${msg}`)
  }
}
