'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Bot, User, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from '@/components/ui/button'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// 見出し部分を太字化する関数
function formatContentWithBoldHeadings(content: string) {
  const lines = content.split('\n')
  
  return lines.map((line, index) => {
    // マークダウン見出し（## や ### で始まる行）を太字化
    if (line.trim().startsWith('#')) {
      const headingText = line.replace(/^#+\s*/, '') // # を削除
      return (
        <div key={index} className="font-bold mt-2 mb-1">
          {headingText}
        </div>
      )
    }
    
    // 【】で囲まれた部分を太字化
    const boldPattern = /【([^】]+)】/g
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    let match
    
    while ((match = boldPattern.exec(line)) !== null) {
      // 【】の前のテキスト
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index))
      }
      // 【】内のテキストを太字化
      parts.push(
        <strong key={`bold-${index}-${match.index}`}>【{match[1]}】</strong>
      )
      lastIndex = match.index + match[0].length
    }
    
    // 残りのテキスト
    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex))
    }
    
    // 何も太字化するものがなければ通常のテキスト
    if (parts.length === 0) {
      return <div key={index}>{line}</div>
    }
    
    return <div key={index}>{parts}</div>
  })
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user'
  const time = format(new Date(timestamp), 'HH:mm', { locale: ja })
  const [isSpeaking, setIsSpeaking] = useState(false)

  // 読み上げ機能（AI回答のみ）
  const handleSpeak = () => {
    if (isUser) return

    // 既に読み上げ中なら停止
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    // Web Speech API が利用可能かチェック
    if (!window.speechSynthesis) {
      alert('お使いのブラウザは音声読み上げに対応していません。')
      return
    }

    // 読み上げ開始
    const utterance = new SpeechSynthesisUtterance(content)
    utterance.lang = 'ja-JP'
    utterance.rate = 1.0 // 速度（0.1〜10）
    utterance.pitch = 1.0 // ピッチ（0〜2）
    utterance.volume = 1.0 // 音量（0〜1）

    utterance.onstart = () => {
      setIsSpeaking(true)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      alert('音声読み上げ中にエラーが発生しました。')
    }

    window.speechSynthesis.speak(utterance)
  }

  // コンポーネントがアンマウントされたら読み上げ停止
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isSpeaking])

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
          
          {/* 読み上げボタン（AI回答のみ） */}
          {!isUser && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 ml-1 hover:bg-primary/10"
              onClick={handleSpeak}
              title={isSpeaking ? '読み上げを停止' : '読み上げる'}
            >
              {isSpeaking ? (
                <VolumeX className="h-3.5 w-3.5 text-primary animate-pulse" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
              )}
            </Button>
          )}
        </div>

        {/* メッセージバブル */}
        <div className={cn(
          'group relative rounded-2xl px-4 py-3 shadow-sm transition-all',
          isUser 
            ? 'rounded-tr-sm bg-gradient-to-br from-primary to-primary/90 text-primary-foreground' 
            : 'rounded-tl-sm bg-gradient-to-br from-muted to-muted/80 text-foreground border border-border/50'
        )}>
          <div className="whitespace-pre-wrap text-base leading-relaxed">
            {isUser ? content : formatContentWithBoldHeadings(content)}
          </div>
          
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
