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
import { Paperclip, Mic, Send, AlertCircle, X, FileText } from 'lucide-react'

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
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && !disabled && value.trim()) {
        onSend()
      }
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
      
      // ファイルタイプ検証
      const allowedTypes = ['text/plain', 'text/csv', 'application/csv']
      const invalidFiles = files.filter(f => !allowedTypes.includes(f.type))
      
      if (invalidFiles.length > 0) {
        alert(`以下のファイルは対応していない形式です（.txt, .csvのみ対応）:\n${invalidFiles.map(f => f.name).join('\n')}`)
        e.target.value = ''
        return
      }
      
      // ファイルリストに追加
      setAttachedFiles(prev => [...prev, ...files])
      
      // 親コンポーネントに通知
      if (onFileUpload) {
        onFileUpload(e.target.files)
      }
      
      e.target.value = '' // リセット
    }
  }

  const handleFileRemove = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-6 pb-24 px-4">
      <div className="mx-auto max-w-4xl">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        />
        
        {/* エラーメッセージ */}
        {showError && !hasSession && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>左メニューからカテゴリーを選択するか、相談履歴から既存の相談を選択してください。</span>
          </div>
        )}
        
        {/* 添付ファイルリスト */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 space-y-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => handleFileRemove(index)}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
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
            placeholder={placeholder}
            disabled={isLoading}
            className={`min-h-[100px] max-h-[200px] resize-none w-full ${!hasSession && disabled ? 'cursor-not-allowed opacity-60' : ''}`}
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
