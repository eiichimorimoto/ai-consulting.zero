/**
 * Supabase Storage ファイルアップロードライブラリ
 * 
 * 相談セッションの添付ファイルをSupabase Storageにアップロードします。
 * 
 * @module lib/storage/upload
 */

import { createClient } from '@/lib/supabase/server'

export interface UploadResult {
  path: string
  url: string
  size: number
}

export class FileUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileUploadError'
  }
}

/**
 * ファイル名をサニタイズ
 * 
 * 特殊文字を削除し、安全なファイル名に変換します。
 * 
 * @param filename - 元のファイル名
 * @returns サニタイズされたファイル名
 */
function sanitizeFileName(filename: string): string {
  // 拡張子を保持
  const ext = filename.split('.').pop() || ''
  const base = filename.replace(/\.[^/.]+$/, '')
  
  // 安全な文字のみ許可（英数字、アンダースコア、ハイフン）
  const safe = base
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 100) // 最大100文字
  
  // タイムスタンプを追加して一意性を確保
  return `${safe}_${Date.now()}.${ext}`
}

/**
 * Supabase Storageにファイルをアップロード
 * 
 * ファイルパス: {userId}/{sessionId}/{sanitizedFilename}
 * 
 * @param file - アップロードするファイル
 * @param userId - ユーザーID
 * @param sessionId - セッションID
 * @returns アップロード結果（パス、URL、サイズ）
 * @throws {FileUploadError} アップロード失敗時
 * 
 * @example
 * ```typescript
 * const file = formData.get('file') as File
 * const result = await uploadFile(file, userId, sessionId)
 * console.log('Uploaded to:', result.url)
 * ```
 */
export async function uploadFile(
  file: File,
  userId: string,
  sessionId: string
): Promise<UploadResult> {
  try {
    const supabase = await createClient()
    
    // ファイル名をサニタイズ
    const safeName = sanitizeFileName(file.name)
    
    // ストレージパス: {userId}/{sessionId}/{filename}
    const filePath = `${userId}/${sessionId}/${safeName}`
    
    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Supabase Storageにアップロード
    const { data, error } = await supabase.storage
      .from('consulting-attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false, // 同名ファイルの上書きを許可しない
      })
    
    if (error) {
      throw new FileUploadError(`Upload failed: ${error.message}`)
    }
    
    // 公開URLを取得（認証付きURLの場合は別途signedUrlを使用）
    const { data: urlData } = supabase.storage
      .from('consulting-attachments')
      .getPublicUrl(data.path)
    
    return {
      path: data.path,
      url: urlData.publicUrl,
      size: file.size,
    }
  } catch (error) {
    if (error instanceof FileUploadError) {
      throw error
    }
    throw new FileUploadError(`Unexpected error: ${error}`)
  }
}

/**
 * 複数ファイルを並列アップロード
 * 
 * @param files - アップロードするファイルの配列
 * @param userId - ユーザーID
 * @param sessionId - セッションID
 * @returns アップロード結果の配列
 * @throws {FileUploadError} いずれかのアップロード失敗時
 */
export async function uploadFiles(
  files: File[],
  userId: string,
  sessionId: string
): Promise<UploadResult[]> {
  return Promise.all(
    files.map(file => uploadFile(file, userId, sessionId))
  )
}

/**
 * ファイルを削除
 * 
 * @param filePath - 削除するファイルのパス
 * @returns 削除成功時true
 * @throws {FileUploadError} 削除失敗時
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase.storage
      .from('consulting-attachments')
      .remove([filePath])
    
    if (error) {
      throw new FileUploadError(`Delete failed: ${error.message}`)
    }
    
    return true
  } catch (error) {
    if (error instanceof FileUploadError) {
      throw error
    }
    throw new FileUploadError(`Unexpected error: ${error}`)
  }
}
