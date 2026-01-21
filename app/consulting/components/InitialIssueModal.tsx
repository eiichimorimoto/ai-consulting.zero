'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Paperclip, Mic, Send } from 'lucide-react'

interface InitialIssueModalProps {
  open: boolean
  category: string
  categoryLabel: string
  onClose: () => void
  onSubmit: (issue: string) => Promise<void>
  isLoading?: boolean
}

export function InitialIssueModal({
  open,
  category,
  categoryLabel,
  onClose,
  onSubmit,
  isLoading = false
}: InitialIssueModalProps) {
  const [issue, setIssue] = useState('')

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-white border border-border shadow-xl">
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
              placeholder="例：売上を向上させるための施策を検討したいです。現在の売上は前年比で5%減少しています。"
              disabled={isLoading}
              className="min-h-[120px] resize-none"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              具体的な課題や相談内容を記入すると、より適切なアドバイスが得られます。
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between">
          {/* アイコンボタン */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <div className="flex flex-col items-center">
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
              <span className="text-[10px] text-muted-foreground mt-1">相談を開始</span>
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
