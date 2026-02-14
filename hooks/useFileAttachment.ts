/**
 * ファイル添付管理のカスタムhook
 *
 * Start画面およびファイル添付機能を持つコンポーネントで使用
 *
 * @module hooks/useFileAttachment
 */

import { useState, useRef } from "react"
import { toast } from "sonner"

/**
 * ファイル添付の状態とハンドラーを管理
 *
 * @returns ファイル添付の状態とハンドラー
 *
 * @example
 * ```typescript
 * const { attachedFiles, fileInputRef, handleFileAttach, handleRemoveFile, clearFiles } = useFileAttachment();
 *
 * // JSX内で使用
 * <input ref={fileInputRef} type="file" onChange={handleFileAttach} />
 * {attachedFiles.map((file, i) => (
 *   <div key={i}>
 *     {file.name}
 *     <button onClick={() => handleRemoveFile(i)}>削除</button>
 *   </div>
 * ))}
 * ```
 */
export function useFileAttachment() {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * ファイル添付ハンドラー
   *
   * @param e - ファイル選択イベント
   */
  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachedFiles((prev) => [...prev, ...files])
    toast.success(`${files.length}個のファイルを添付しました`)
  }

  /**
   * ファイル削除ハンドラー
   *
   * @param index - 削除するファイルのインデックス
   */
  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  /**
   * すべてのファイルをクリア
   */
  const clearFiles = () => {
    setAttachedFiles([])
  }

  return {
    attachedFiles,
    fileInputRef,
    handleFileAttach,
    handleRemoveFile,
    clearFiles,
  }
}
