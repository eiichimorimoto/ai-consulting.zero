'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage, TypingIndicator } from './ChatMessage'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PlusCircle, MessageSquare } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface ChatViewProps {
  messages: Message[]
  isTyping?: boolean
}

export function ChatView({ messages, isTyping = false }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // 最初のメッセージ（相談内容）と残りのメッセージを分離
  const firstMessage = messages.length > 0 ? messages[0] : null
  const remainingMessages = messages.length > 1 ? messages.slice(1) : []

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* AI背景（グラデーション + ドットパターン + AI相談画像） */}
      <div className="pointer-events-none absolute inset-0 opacity-35 z-0">
        {/* AI相談画像（背景全体に薄く表示） */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/AI相談画像01.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.22,
            filter: 'blur(0.5px)',
          }}
        />
        {/* グラデーション背景 */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
          }}
        />
        {/* ドットパターン */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* サーキットライン */}
        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="circuit" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M 0 100 L 50 100 L 50 50 L 100 50" stroke="rgba(99, 102, 241, 0.1)" strokeWidth="2" fill="none"/>
              <path d="M 100 150 L 150 150 L 150 100 L 200 100" stroke="rgba(139, 92, 246, 0.1)" strokeWidth="2" fill="none"/>
              <circle cx="50" cy="100" r="3" fill="rgba(99, 102, 241, 0.2)"/>
              <circle cx="150" cy="150" r="3" fill="rgba(139, 92, 246, 0.2)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)"/>
        </svg>
      </div>

      {/* チャットコンテンツ */}
      {messages.length === 0 ? (
        <div className="relative z-10 flex h-full items-center justify-center pointer-events-auto">
          <div className="text-center text-muted-foreground">
            <p className="mb-2 text-lg font-medium">AI経営相談へようこそ</p>
            <p className="text-sm flex items-center justify-center gap-2">
              左メニューの
              <PlusCircle className="h-4 w-4 text-primary" />
              新規相談、
              <MessageSquare className="h-4 w-4 text-primary" />
              相談履歴から選択して、開始してください。
            </p>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex h-full flex-col">
          {/* 最初のメッセージ（相談内容） - スクロール時のみ上部に固定（sticky） */}
          {firstMessage && (
            <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm pointer-events-auto shadow-sm">
              <div className="px-4 py-3">
                <div className="text-xs text-muted-foreground mb-1 font-medium">📋 相談内容</div>
                <ChatMessage
                  key={firstMessage.id}
                  role={firstMessage.role}
                  content={firstMessage.content}
                  timestamp={firstMessage.created_at}
                />
              </div>
            </div>
          )}

          {/* スクロール可能: 残りのメッセージ */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth pointer-events-auto">
            <div className="space-y-1 py-4">
              {remainingMessages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.created_at}
                />
              ))}
              {isTyping && <TypingIndicator />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
