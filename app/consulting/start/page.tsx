'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SimpleSidebar } from '../components/SimpleSidebar'
import { ConsultingHeader } from '../components/ConsultingHeader'
import { ContextPanel } from '../components/ContextPanel'
import { MessageInput } from '../components/MessageInput'
import { ChatView } from '../components/ChatView'
import { MobileNav } from '../components/MobileNav'
import type { ConsultingSession, Message as ConsultingMessage, ContextData } from '../types/consulting'

export default function ConsultingPage() {
  const router = useRouter()
  
  // 状態管理
  const [currentSession, setCurrentSession] = useState<ConsultingSession | null>(null)
  const [messages, setMessages] = useState<ConsultingMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [category, setCategory] = useState('general')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [sessions, setSessions] = useState<ConsultingSession[]>([])
  const [mobileTab, setMobileTab] = useState<'chat' | 'context' | 'proposal'>('chat')
  
  // コンテキストデータ
  const [contextData, setContextData] = useState<ContextData>({
    digitalScore: 45, // デモ用
    issueCount: 3, // デモ用
    attachments: [],
    proposal: {
      status: 'none',
      id: null,
    },
  })

  // セッション一覧の取得
  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/consulting/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  // 添付ファイルアップロード
  const handleFileUpload = useCallback(async (files: FileList) => {
    const newAttachments = Array.from(files).map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file), // プレビュー用URL
    }))
    
    setContextData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments],
    }))
  }, [])

  // カテゴリー変更時の処理（新規セッション作成）
  const handleCategoryChange = async (selectedCategory: string) => {
    setCategory(selectedCategory)
    
    // 新規セッション作成
    try {
      setIsLoading(true)
      const res = await fetch('/api/consulting/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          initial_message: `${getCategoryLabel(selectedCategory)}について相談させてください。`,
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setCurrentSession(data.session)
        setMessages(data.messages || [])
        await fetchSessions()
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentSession) return
    
    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsTyping(true)
    
    // ユーザーメッセージを即座に表示
    const tempUserMessage: ConsultingMessage = {
      id: `temp-${Date.now()}`,
      session_id: currentSession.id,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])
    
    try {
      const res = await fetch(`/api/consulting/sessions/${currentSession.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      })
      
      if (res.ok) {
        const data = await res.json()
        // メッセージ履歴を更新
        setMessages(data.messages || [])
        setCurrentSession(data.session)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsTyping(false)
    }
  }

  // セッション終了
  const handleEndSession = () => {
    setCurrentSession(null)
    setMessages([])
    setInputMessage('')
    setCategory('general')
    fetchSessions()
  }

  // カテゴリーラベル取得
  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      general: '一般相談',
      sales: '売上改善',
      cost: 'コスト削減',
      digital: 'DX推進',
      hr: '人事・組織',
      strategy: '経営戦略',
    }
    return labels[cat] || '一般相談'
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* 左サイドバー */}
      <SimpleSidebar 
        sessions={sessions.map(s => ({
          id: s.id,
          title: s.title,
          category: s.category,
          current_round: s.current_round,
          max_rounds: s.max_rounds,
          created_at: s.created_at,
        }))}
        selectedCategory={category}
        onCategoryChange={handleCategoryChange}
      />

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ヘッダー */}
        {currentSession && (
          <ConsultingHeader
            sessionTitle={currentSession.title}
            currentRound={currentSession.current_round}
            maxRounds={currentSession.max_rounds}
            onEndSession={handleEndSession}
          />
        )}

        {/* モバイルタブナビゲーション */}
        {currentSession && (
          <MobileNav activeTab={mobileTab} onTabChange={setMobileTab} />
        )}

        {/* メインコンテンツ */}
        <div className="flex flex-1 overflow-hidden">
          {/* PC: チャットエリア / モバイル: タブ切替 */}
          <div className={`flex flex-1 flex-col overflow-hidden ${mobileTab !== 'chat' ? 'hidden lg:flex' : 'flex'}`}>
            <ChatView messages={messages} isTyping={isTyping} />
            <MessageInput
              value={inputMessage}
              onChange={setInputMessage}
              onSend={handleSendMessage}
              category={category}
              onCategoryChange={setCategory}
              isLoading={isLoading || isTyping}
              showCategorySelect={false}
              placeholder={currentSession ? "メッセージを入力..." : "左のメニューからカテゴリーを選択して、相談を開始してください"}
              onFileUpload={handleFileUpload}
              disabled={!currentSession}
            />
          </div>

          {/* 右サイドパネル（PC: 常時表示 / モバイル: タブで表示） */}
          <div className={`w-full border-l bg-muted/30 lg:w-80 ${mobileTab !== 'context' ? 'hidden lg:block' : 'block'}`}>
            <ContextPanel
              digitalScore={contextData.digitalScore}
              issueCount={contextData.issueCount}
              attachments={contextData.attachments}
              proposalStatus={contextData.proposal.status}
              proposalId={contextData.proposal.id}
              onViewProposal={() => {
                if (contextData.proposal.id) {
                  router.push(`/consulting/reports/${contextData.proposal.id}`)
                }
              }}
              onDownloadProposal={() => {
                if (contextData.proposal.id) {
                  window.open(`/api/consulting/reports/${contextData.proposal.id}/pdf`, '_blank')
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
