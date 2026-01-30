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
    if (e.target.files && e.target.files.length > 0 && onFileUpload) {
      onFileUpload(e.target.files)
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
        
        {/* メッセージ入力 */}
        <div className="flex items-start gap-2">
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
            className={`min-h-[100px] max-h-[200px] resize-none flex-1 ${!hasSession && disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            rows={4}
          />
          
          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              disabled={isLoading || disabled}
              onClick={handleFileClick}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              disabled={isLoading || disabled}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button
              onClick={onSend}
              disabled={isLoading || disabled || !value.trim()}
              size="icon"
              className="h-10 w-10"
            >
              <Send className="h-5 w-5" />
            </Button>
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
