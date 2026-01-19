'use client'

/**
 * Consulting Start Page
 * 
 * AI相談の開始ページ（新規相談・既存相談一覧）
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Loader2, Clock, CheckCircle } from 'lucide-react'

interface Session {
  id: string
  title: string
  category: string
  status: string
  current_round: number
  max_rounds: number
  created_at: string
}

export default function ConsultingStartPage() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('general')
  const [isLoading, setIsLoading] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)

  // 既存セッション一覧を取得
  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/consulting/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/consulting/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          category,
          initial_message: message
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()

      if (data.session) {
        // チャット画面へ遷移
        router.push(`/consulting/sessions/${data.session.id}`)
      }
    } catch (error) {
      console.error('Failed to create session:', error)
      alert('相談セッションの作成に失敗しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            <Clock className="w-3 h-3" />
            進行中
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            <CheckCircle className="w-3 h-3" />
            完了
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
            {status}
          </span>
        )
    }
  }

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      general: '一般相談',
      sales: '営業・販売',
      marketing: 'マーケティング',
      finance: '財務・経理',
      hr: '人事・組織',
      it: 'IT・デジタル'
    }
    return labels[cat] || cat
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI経営相談</h1>
        <p className="text-gray-600">
          経営課題について、AIコンサルタントに相談できます
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 新規相談フォーム */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              新規相談を始める
            </CardTitle>
            <CardDescription>
              相談したい課題を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  相談内容 <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full min-h-[150px]"
                  placeholder="例: 売上が伸び悩んでいます。新規顧客の獲得方法について相談したいです。"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  カテゴリ（オプション）
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">一般相談</SelectItem>
                    <SelectItem value="sales">営業・販売</SelectItem>
                    <SelectItem value="marketing">マーケティング</SelectItem>
                    <SelectItem value="finance">財務・経理</SelectItem>
                    <SelectItem value="hr">人事・組織</SelectItem>
                    <SelectItem value="it">IT・デジタル</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !message.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    相談を開始中...
                  </>
                ) : (
                  '相談を始める'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 既存相談一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>過去の相談</CardTitle>
            <CardDescription>
              継続して相談できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>まだ相談履歴がありません</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/consulting/sessions/${session.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm line-clamp-2">
                        {session.title}
                      </h3>
                      {getStatusBadge(session.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{getCategoryLabel(session.category)}</span>
                      <span>
                        往復: {session.current_round}/{session.max_rounds}
                      </span>
                      <span>
                        {new Date(session.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
