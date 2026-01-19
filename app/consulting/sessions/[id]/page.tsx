'use client'

/**
 * Consulting Session Chat Page
 * 
 * AI相談のチャット画面
 */

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { MessageSquare, Loader2, Send, ArrowLeft, User, Bot } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  tokens_used?: number
  processing_time_ms?: number
}

interface Session {
  id: string
  title: string
  category: string
  status: string
  current_round: number
  max_rounds: number
  created_at: string
}

export default function ConsultingSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params?.id as string

  const [session, setSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sessionId) {
      fetchSession()
      fetchMessages()
    }
  }, [sessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/consulting/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setSession(data.session)
      } else {
        console.error('Session not found')
        router.push('/consulting/start')
      }
    } catch (error) {
      console.error('Failed to fetch session:', error)
    } finally {
      setIsLoadingSession(false)
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/consulting/sessions/${sessionId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputMessage.trim() || isLoading) {
      return
    }

    setIsLoading(true)
    const messageContent = inputMessage
    setInputMessage('')

    try {
      const response = await fetch(`/api/consulting/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageContent })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // メッセージ一覧に追加
      if (data.userMessage && data.aiMessage) {
        setMessages((prev) => [...prev, data.userMessage, data.aiMessage])
      }

      // セッション情報を更新
      if (data.current_round !== undefined) {
        setSession((prev) => prev ? {
          ...prev,
          current_round: data.current_round
        } : null)
      }

      // 往復回数上限に達した場合
      if (data.is_limit_reached) {
        alert('往復回数の上限に達しました。提案書を生成します。')
        // 提案書生成ページへ遷移（後で実装）
        // router.push(`/consulting/sessions/${sessionId}/complete`)
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      alert('メッセージの送信に失敗しました。もう一度お試しください。')
      setInputMessage(messageContent) // 入力内容を復元
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">セッションが見つかりません</p>
          <Button onClick={() => router.push('/consulting/start')}>
            相談一覧に戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/consulting/start')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          <div>
            <h1 className="text-lg font-bold line-clamp-1">{session.title}</h1>
            <p className="text-sm text-gray-600">
              往復: {session.current_round}/{session.max_rounds}回
              {session.current_round >= session.max_rounds && (
                <span className="ml-2 text-red-600">（上限到達）</span>
              )}
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {session.status === 'active' ? '相談中' : session.status}
        </div>
      </div>

      {/* メッセージ履歴 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>メッセージを送信して相談を始めましょう</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 mt-1 flex-shrink-0" />
                  ) : (
                    <Bot className="w-4 h-4 mt-1 flex-shrink-0" />
                  )}
                  <p className="font-medium text-sm">
                    {msg.role === 'user' ? 'あなた' : 'AIコンサルタント'}
                  </p>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-opacity-20">
                  <p className={`text-xs ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                  {msg.role === 'assistant' && msg.processing_time_ms && (
                    <p className="text-xs text-gray-400">
                      処理時間: {(msg.processing_time_ms / 1000).toFixed(1)}秒
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="bg-white border-t p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                session.current_round >= session.max_rounds
                  ? '往復回数の上限に達しました'
                  : 'メッセージを入力...'
              }
              className="flex-1 min-h-[60px] max-h-[200px]"
              disabled={isLoading || session.current_round >= session.max_rounds}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !inputMessage.trim() || session.current_round >= session.max_rounds}
              className="px-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  送信
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Shift + Enter で改行、Enter で送信
          </p>
        </form>
      </div>
    </div>
  )
}
