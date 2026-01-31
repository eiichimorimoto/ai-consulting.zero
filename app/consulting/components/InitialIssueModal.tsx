'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Paperclip, Mic, Send, X, FileText } from 'lucide-react'

interface Attachment {
  id: string
  name: string
  type: string
  url?: string
}

interface InitialIssueModalProps {
  open: boolean
  category: string
  categoryLabel: string
  onClose: () => void
  onSubmit: (issue: string) => Promise<void>
  isLoading?: boolean
  onFileUpload?: (files: FileList) => void
  attachments?: Attachment[]
  onRemoveFile?: (id: string) => void
}

export function InitialIssueModal({
  open,
  category,
  categoryLabel,
  onClose,
  onSubmit,
  isLoading = false,
  onFileUpload,
  attachments = [],
  onRemoveFile
}: InitialIssueModalProps) {
  const [issue, setIssue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleSubmit = async () => {
    if (!issue.trim()) return
    await onSubmit(issue.trim())
    setIssue('') // 送信後はクリア
  }

  const handleClose = () => {
    if (!isLoading) {
      setIssue('')
      onClose()
    }
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      
      // ファイルサイズ検証（10MB制限）
      const maxSize = 10 * 1024 * 1024 // 10MB
      const oversizedFiles = files.filter(f => f.size > maxSize)
      
      if (oversizedFiles.length > 0) {
        alert(`以下のファイルはサイズが大きすぎます（10MB以下にしてください）:\n${oversizedFiles.map(f => f.name).join('\n')}`)
        e.target.value = ''
        return
      }
      
      // ファイルタイプ検証（MIMEタイプと拡張子の両方でチェック）
      const allowedTypes = [
        'text/plain',
        'text/csv',
        'application/csv',
        'text/markdown',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ]
      
      const allowedExtensions = ['.txt', '.csv', '.md', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
      
      const invalidFiles = files.filter(f => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase()
        const hasValidMimeType = allowedTypes.includes(f.type)
        const hasValidExtension = allowedExtensions.includes(ext)
        
        // MIMEタイプまたは拡張子のいずれかが有効ならOK（.mdファイル対策）
        return !hasValidMimeType && !hasValidExtension
      })
      
      if (invalidFiles.length > 0) {
        alert(`以下のファイルは対応していない形式です（対応: .txt, .csv, .md, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx）:\n${invalidFiles.map(f => f.name).join('\n')}`)
        e.target.value = ''
        return
      }
      
      // 検証OKならアップロード
      if (onFileUpload) {
        onFileUpload(e.target.files)
      }
      e.target.value = '' // リセット
    }
  }

  // ドラッグ&ドロップハンドラ
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Textareaの境界から出た時のみfalseにする
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    
    // ファイルサイズ検証（10MB制限）
    const maxSize = 10 * 1024 * 1024 // 10MB
    const oversizedFiles = fileArray.filter(f => f.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      alert(`以下のファイルはサイズが大きすぎます（10MB以下にしてください）:\n${oversizedFiles.map(f => f.name).join('\n')}`)
      return
    }
    
    // ファイルタイプ検証（MIMEタイプと拡張子の両方でチェック）
    const allowedTypes = [
      'text/plain',
      'text/csv',
      'application/csv',
      'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ]
    
    const allowedExtensions = ['.txt', '.csv', '.md', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
    
    const invalidFiles = fileArray.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase()
      const hasValidMimeType = allowedTypes.includes(f.type)
      const hasValidExtension = allowedExtensions.includes(ext)
      
      // MIMEタイプまたは拡張子のいずれかが有効ならOK（.mdファイル対策）
      return !hasValidMimeType && !hasValidExtension
    })
    
    if (invalidFiles.length > 0) {
      alert(`以下のファイルは対応していない形式です（対応: .txt, .csv, .md, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx）:\n${invalidFiles.map(f => f.name).join('\n')}`)
      return
    }
    
    // 検証OKならアップロード
    if (onFileUpload) {
      onFileUpload(files)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-white border border-border shadow-xl">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.csv,.md,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          multiple
          onChange={handleFileChange}
          disabled={isLoading}
        />
        
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {categoryLabel}について相談を開始
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            最初の課題や相談内容を入力してください。AIコンサルタントが分析して回答します。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="initial-issue" className="text-sm font-medium">
              相談内容・課題
            </label>
            <Textarea
              id="initial-issue"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              placeholder="例：売上を向上させるための施策を検討したいです。現在の売上は前年比で5%減少しています。"
              disabled={isLoading}
              className={`min-h-[120px] resize-none transition-colors ${
                isDragging 
                  ? 'bg-primary/5 border-primary border-2' 
                  : ''
              }`}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              具体的な課題や相談内容を記入すると、より適切なアドバイスが得られます。
            </p>
          </div>

          {/* 添付ファイル一覧 */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">添付ファイル</label>
              <div className="space-y-2">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => onRemoveFile?.(file.id)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-end justify-between">
          {/* アイコンボタン */}
          <div className="flex items-end gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                  onClick={handleFileClick}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                {attachments.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-medium">
                    {attachments.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">添付</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                <Mic className="h-5 w-5" />
              </Button>
              <span className="text-[10px] text-muted-foreground">音声</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button
                type="button"
                size="icon"
                className="h-9 w-9"
                disabled={isLoading || !issue.trim()}
                onClick={handleSubmit}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
              <span className="text-[10px] text-muted-foreground">送信</span>
            </div>
          </div>

          {/* キャンセルボタン */}
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            キャンセル
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
