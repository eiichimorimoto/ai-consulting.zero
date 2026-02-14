/**
 * テキスト抽出ライブラリ
 *
 * サポート形式:
 * - テキスト: .txt, .csv, .md
 * - PDF: .pdf（Phase 2.2で実装予定）
 * - Office: .doc, .docx, .xls, .xlsx, .ppt, .pptx（Phase 2.3で実装予定）
 *
 * @module lib/file-processing/text-extractor
 */

export interface ExtractionResult {
  content: string
  encoding: string
  preview: string
  wordCount: number
  lineCount: number
}

export class TextExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TextExtractionError"
  }
}

/**
 * テキストファイルから内容を抽出
 *
 * ファイルサイズが1MBを超える場合は、最初の1MBのみを読み取ります。
 *
 * @param file - テキストファイル
 * @returns 抽出結果（内容、エンコーディング、プレビュー、統計情報）
 * @throws {TextExtractionError} 抽出失敗時
 *
 * @example
 * ```typescript
 * const file = formData.get('file') as File
 * const result = await extractText(file)
 * console.log('Preview:', result.preview)
 * console.log('Word count:', result.wordCount)
 * ```
 */
export async function extractText(file: File): Promise<ExtractionResult> {
  try {
    // ファイルサイズチェック（1MB超える場合は最初の1MBのみ）
    const maxSize = 1 * 1024 * 1024 // 1MB
    const slice = file.size > maxSize ? file.slice(0, maxSize) : file

    // テキスト読み取り
    const text = await slice.text()

    // プレビュー（最初の500文字）
    const preview = text.substring(0, 500)

    // 統計情報の計算
    const wordCount = countWords(text)
    const lineCount = countLines(text)

    return {
      content: text,
      encoding: "UTF-8", // 今後、文字エンコーディング自動検出も追加可能
      preview,
      wordCount,
      lineCount,
    }
  } catch (error) {
    throw new TextExtractionError(`Failed to extract text: ${error}`)
  }
}

/**
 * ファイルタイプがサポート対象か確認
 *
 * Phase 2.1: テキストファイル（.txt, .csv, .md）
 * Phase 2.2: PDFファイル（.pdf）
 * Phase 2.3: Officeファイル（.doc, .docx, .xls, .xlsx, .ppt, .pptx）
 *
 * MIMEタイプと拡張子の両方でチェック（.mdファイル対策）
 *
 * @param file - 確認するファイル
 * @returns サポート対象の場合true
 */
export function isSupportedTextFile(file: File): boolean {
  const supportedTypes = [
    // テキストファイル（Phase 2.1）
    "text/plain",
    "text/csv",
    "application/csv",
    "text/markdown",

    // PDFファイル（Phase 2.2 - アップロードのみ許可）
    "application/pdf",

    // Microsoft Office（Phase 2.3 - アップロードのみ許可）
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel", // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-powerpoint", // .ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  ]

  const supportedExtensions = [
    ".txt",
    ".csv",
    ".md",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
  ]

  // 拡張子を取得
  const ext = "." + file.name.split(".").pop()?.toLowerCase()

  // MIMEタイプまたは拡張子のいずれかが有効ならOK
  return supportedTypes.includes(file.type) || supportedExtensions.includes(ext)
}

/**
 * ファイルタイプに応じた抽出方法を選択
 *
 * Phase 2.1: テキストファイル（.txt, .csv, .md）のみ抽出可能
 * Phase 2.2: PDFファイル抽出実装予定
 * Phase 2.3: Officeファイル抽出実装予定
 *
 * @param file - 処理するファイル
 * @returns 抽出結果
 * @throws {TextExtractionError} 非対応形式の場合
 */
export async function extractContent(file: File): Promise<ExtractionResult> {
  // テキストファイル（.txt, .csv, .md）のみ抽出可能
  const textTypes = ["text/plain", "text/csv", "application/csv", "text/markdown"]

  if (textTypes.includes(file.type)) {
    return extractText(file)
  }

  // PDF, Officeファイルはアップロードのみ許可（テキスト抽出は今後実装）
  if (file.type === "application/pdf") {
    throw new TextExtractionError("PDF text extraction not yet implemented (Phase 2.2)")
  }

  if (
    file.type.includes("officedocument") ||
    file.type.includes("msword") ||
    file.type.includes("ms-excel") ||
    file.type.includes("ms-powerpoint")
  ) {
    throw new TextExtractionError("Office file text extraction not yet implemented (Phase 2.3)")
  }

  throw new TextExtractionError(`Unsupported file type: ${file.type}`)
}

/**
 * 単語数をカウント
 *
 * 日本語の場合は文字数、英語の場合は単語数をカウントします。
 *
 * @param text - カウント対象のテキスト
 * @returns 単語数
 */
function countWords(text: string): number {
  // 日本語文字を含む場合は文字数でカウント
  const hasJapanese =
    /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text)

  if (hasJapanese) {
    // 空白・改行を除いた文字数
    return text.replace(/\s+/g, "").length
  }

  // 英語の場合は単語数
  const words = text.trim().split(/\s+/)
  return words.filter((word) => word.length > 0).length
}

/**
 * 行数をカウント
 *
 * @param text - カウント対象のテキスト
 * @returns 行数
 */
function countLines(text: string): number {
  if (!text) return 0
  return text.split("\n").length
}

/**
 * CSVファイルをパース（将来実装）
 *
 * CSVファイルを構造化データに変換します。
 *
 * @param file - CSVファイル
 * @returns パース結果
 */
export async function parseCSV(file: File): Promise<{
  headers: string[]
  rows: string[][]
  summary: string
}> {
  const result = await extractText(file)
  const lines = result.content.split("\n")

  if (lines.length === 0) {
    throw new TextExtractionError("Empty CSV file")
  }

  // 簡易的なCSVパース（カンマ区切り）
  const headers = lines[0].split(",").map((h) => h.trim())
  const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()))

  // サマリー生成
  const summary = `CSV: ${headers.length} columns, ${rows.length} rows`

  return {
    headers,
    rows,
    summary,
  }
}
