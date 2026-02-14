"use client"

import { useState, useRef, DragEvent } from "react"
import { Upload, X, File, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  acceptedTypes?: string[]
  maxSize?: number // in bytes
  multiple?: boolean
  label?: string
}

export default function FileUpload({
  files,
  onFilesChange,
  acceptedTypes = ["application/pdf", "image/jpeg", "image/png"],
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
  label = "ファイルをアップロード",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // ファイルタイプのチェック
    if (!acceptedTypes.includes(file.type)) {
      return `ファイル形式が正しくありません。PDF、JPEG、PNGのみ対応しています。`
    }

    // ファイルサイズのチェック
    if (file.size > maxSize) {
      return `ファイルサイズが大きすぎます。${Math.round(maxSize / 1024 / 1024)}MB以下にしてください。`
    }

    return null
  }

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return

    const newFiles: File[] = []
    const errors: string[] = []

    Array.from(fileList).forEach((file) => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        newFiles.push(file)
      }
    })

    if (errors.length > 0) {
      alert(errors.join("\n"))
    }

    if (newFiles.length > 0) {
      if (multiple) {
        onFilesChange([...files, ...newFiles])
      } else {
        onFilesChange(newFiles)
      }
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = e.dataTransfer.files
    handleFiles(droppedFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    // 同じファイルを再度選択できるようにリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
  }

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") {
      return <File className="h-5 w-5 text-red-500" />
    }
    return <ImageIcon className="h-5 w-5 text-blue-500" />
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        } `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <p className="mb-2 text-sm text-gray-600">ファイルをドラッグ＆ドロップするか、</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="mb-2"
        >
          ファイルを選択
        </Button>
        <p className="text-xs text-gray-500">
          PDF、JPEG、PNG形式（最大{Math.round(maxSize / 1024 / 1024)}MB）
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">アップロード済みファイル:</p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(file)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
