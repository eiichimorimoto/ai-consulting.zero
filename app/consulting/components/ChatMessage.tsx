'use client'

import { cn } from '@/lib/utils'
import { Bot, User, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user'
  const time = format(new Date(timestamp), 'HH:mm', { locale: ja })

  return (
    <div className={cn(
      'group flex gap-3 px-4 py-4 transition-all hover:bg-muted/30',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* アバター */}
      <div className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
        isUser 
          ? 'bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25' 
          : 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-2 border-primary/10'
      )}>
        {isUser ? (
          <User className="h-5 w-5 text-primary-foreground" />
        ) : (
          <>
            <Bot className="h-5 w-5 text-primary" />
            <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-yellow-500" />
          </>
        )}
      </div>

      {/* メッセージ */}
      <div className={cn(
        'flex max-w-[75%] flex-col gap-1.5',
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* 送信者名 */}
        <div className={cn(
          'flex items-center gap-2 px-1 text-xs font-medium',
          isUser ? 'text-primary' : 'text-muted-foreground'
        )}>
          <span>{isUser ? 'あなた' : 'AI アシスタント'}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{time}</span>
        </div>

        {/* メッセージバブル */}
        <div className={cn(
          'group relative rounded-2xl px-4 py-3 shadow-sm transition-all',
          isUser 
            ? 'rounded-tr-sm bg-gradient-to-br from-primary to-primary/90 text-primary-foreground' 
            : 'rounded-tl-sm bg-gradient-to-br from-muted to-muted/80 text-foreground border border-border/50'
        )}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
          
          {/* ホバー時のグロー効果 */}
          {!isUser && (
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-purple-500/0 opacity-0 transition-opacity group-hover:from-blue-500/5 group-hover:to-purple-500/5 group-hover:opacity-100" />
          )}
        </div>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-4">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-primary/10 bg-gradient-to-br from-purple-500/20 to-blue-500/20">
        <Bot className="h-5 w-5 text-primary" />
        <Sparkles className="absolute -right-1 -top-1 h-3 w-3 animate-pulse text-yellow-500" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border/50 bg-gradient-to-br from-muted to-muted/80 px-4 py-3 shadow-sm">
        <span className="text-sm text-muted-foreground">AIが考え中</span>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </div>
  )
}
