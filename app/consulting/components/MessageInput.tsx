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
import { Paperclip, Mic, Send } from 'lucide-react'

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
  placeholder = 'メッセージを入力...',
  onFileUpload,
  disabled = false
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
      <div className="mx-auto max-w-4xl space-y-2">
        {/* 上部ツールバー */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isLoading || disabled}
            onClick={handleFileClick}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          {showCategorySelect && onCategoryChange && (
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
          )}
        </div>

        {/* メッセージ入力 */}
        <div className="flex items-end gap-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            className="min-h-[60px] max-h-[200px] resize-none"
            rows={2}
          />
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              disabled={isLoading || disabled}
            >
              <Mic className="h-5 w-5" />
            </Button>
            
            <Button
              onClick={onSend}
              disabled={isLoading || disabled || !value.trim()}
              size="icon"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
