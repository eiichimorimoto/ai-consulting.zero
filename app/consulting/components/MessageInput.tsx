'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Paperclip, Mic, Send, AlertCircle } from 'lucide-react'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  category?: string
  onCategoryChange?: (value: string) => void
  isLoading?: boolean
  showCategorySelect?: boolean
  placeholder?: string
  onFileUpload?: (files: FileList) => void
  disabled?: boolean
  hasSession?: boolean
}

const CATEGORIES = [
  { value: 'general', label: '一般相談' },
  { value: 'sales', label: '売上改善' },
  { value: 'cost', label: 'コスト削減' },
  { value: 'digital', label: 'DX推進' },
  { value: 'hr', label: '人事・組織' },
  { value: 'strategy', label: '経営戦略' },
]

export function MessageInput({
  value,
  onChange,
  onSend,
  category = 'general',
  onCategoryChange,
  isLoading = false,
  showCategorySelect = false,
  placeholder = '新規の場合は、左メニューからカテゴリーを選択の上相談内容を入力してください。また既存の相談の続きは相談履歴から選択してください。',
  onFileUpload,
  disabled = false,
  hasSession = false
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showError, setShowError] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enterキーでの送信を無効化（送信ボタンでのみ送信）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // 送信はボタンでのみ可能
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
      
      // 親コンポーネントに通知
      if (onFileUpload) {
        onFileUpload(e.target.files)
      }
      
      e.target.value = '' // リセット
    }
  }

  const handleFocus = () => {
    if (!hasSession) {
      setShowError(true)
    }
  }

  const handleBlur = () => {
    // 少し遅延させてからエラーを非表示（クリックイベントが発火するまで待つ）
    setTimeout(() => {
      setShowError(false)
    }, 200)
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
    <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-6 pb-24 px-4">
      <div className="mx-auto max-w-4xl">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept=".txt,.csv,.md,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          disabled={isLoading || disabled}
        />
        
        {/* エラーメッセージ */}
        {showError && !hasSession && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>左メニューからカテゴリーを選択するか、相談履歴から既存の相談を選択してください。</span>
          </div>
        )}
        
        {/* メッセージ入力 */}
        <div>
          <Textarea
            value={value}
            onChange={(e) => {
              if (hasSession || !disabled) {
                onChange(e.target.value)
              }
            }}
            onKeyDown={(e) => {
              if (hasSession) {
                handleKeyDown(e)
              } else {
                e.preventDefault()
              }
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            placeholder={placeholder}
            disabled={isLoading}
            className={`min-h-[100px] max-h-[200px] resize-none w-full text-lg transition-colors ${
              isDragging 
                ? 'bg-primary/5 border-primary border-2' 
                : ''
            } ${!hasSession && disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            rows={4}
          />
          
          <div className="flex items-end gap-3 mt-3">
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                disabled={isLoading || disabled}
                onClick={handleFileClick}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <span className="text-[10px] text-muted-foreground">添付</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                disabled={isLoading || disabled}
              >
                <Mic className="h-5 w-5" />
              </Button>
              <span className="text-[10px] text-muted-foreground">音声</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button
                onClick={onSend}
                disabled={isLoading || disabled || !value.trim()}
                size="icon"
                className="h-9 w-9"
              >
                <Send className="h-5 w-5" />
              </Button>
              <span className="text-[10px] text-muted-foreground">送信</span>
            </div>
          </div>
        </div>
        
        {/* カテゴリー選択（必要な場合のみ表示） */}
        {showCategorySelect && onCategoryChange && (
          <div className="mt-2">
            <Select value={category} onValueChange={onCategoryChange} disabled={isLoading}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
