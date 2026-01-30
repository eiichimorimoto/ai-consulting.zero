'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  MessageSquare,
  Settings,
  PlusCircle,
  TrendingUp,
  DollarSign,
  Zap,
  Users,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface SimpleSidebarProps {
  sessions?: Array<{
    id: string
    title: string
    category: string
    current_round: number
    max_rounds: number
    created_at?: string
  }>
  selectedCategory?: string
  onCategoryChange?: (category: string) => void
}

const CATEGORIES = [
  { id: 'general', label: '一般相談', icon: MessageSquare },
  { id: 'sales', label: '売上改善', icon: TrendingUp },
  { id: 'cost', label: 'コスト削減', icon: DollarSign },
  { id: 'digital', label: 'DX推進', icon: Zap },
  { id: 'hr', label: '人事・組織', icon: Users },
  { id: 'strategy', label: '経営戦略', icon: Target },
]

export function SimpleSidebar({ 
  sessions = [], 
  selectedCategory = 'general',
  onCategoryChange 
}: SimpleSidebarProps) {
  const pathname = usePathname()

  // カテゴリーに応じたアイコンを取得
  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category)
    return cat ? cat.icon : MessageSquare
  }

  // 日付フォーマット関数
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${year}/${month}/${day} ${hours}:${minutes}`
  }

  // カテゴリーラベル取得
  const getCategoryLabel = (categoryId: string) => {
    const cat = CATEGORIES.find(c => c.id === categoryId)
    return cat ? cat.label : ''
  }

  // 検索フィルタリング（タイトル、カテゴリー、日付、回数）
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    
    const query = searchQuery.toLowerCase()
    return sessions.filter(session => {
      // タイトル検索
      const titleMatch = session.title.toLowerCase().includes(query)
      
      // カテゴリー検索
      const categoryMatch = getCategoryLabel(session.category).toLowerCase().includes(query)
      
      // 日付検索（フォーマットされた日付文字列）
      const dateMatch = session.created_at 
        ? formatDate(session.created_at).toLowerCase().includes(query)
        : false
      
      // 回数検索（例: "1/5" で検索可能）
      const roundMatch = `${session.current_round}/${session.max_rounds}`.includes(query)
      
      return titleMatch || categoryMatch || dateMatch || roundMatch
    })
  }, [sessions, searchQuery])

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      {/* ヘッダー */}
      <div className="border-b p-4">
        <h2 className="text-base font-semibold">AI相談</h2>
      </div>

      {/* メニュー */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 新規相談カテゴリー */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-primary" />
            <p className="text-[13px] font-semibold">新規相談</p>
          </div>
          
          <RadioGroup value={selectedCategory} onValueChange={onCategoryChange}>
            <div className="space-y-2">
              {CATEGORIES.map((category) => {
                const Icon = category.icon
                return (
                  <div key={category.id} className="flex items-center space-x-2 pl-4">
                    <RadioGroupItem 
                      value={category.id} 
                      id={category.id}
                      className="h-4 w-4"
                    />
                    <Label
                      htmlFor={category.id}
                      className="flex flex-1 cursor-pointer items-center gap-2"
                      style={{ fontSize: '13px', fontWeight: 500 }}
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{category.label}</span>
                    </Label>
                  </div>
                )
              })}
            </div>
          </RadioGroup>
        </div>

        {/* セッション一覧 */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <p className="text-[13px] font-semibold">相談履歴</p>
          </div>
          <div className="space-y-0.5">
            {sessions.length === 0 ? (
              <p className="px-3 py-4 text-[13px] text-muted-foreground">
                まだ相談履歴がありません
              </p>
            ) : (
              sessions.map((session) => {
                const Icon = getCategoryIcon(session.category)
                return (
                  <Link
                    key={session.id}
                    href={`/consulting/sessions/${session.id}`}
                    className={cn(
                      "flex items-start gap-2.5 rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground",
                      pathname === `/consulting/sessions/${session.id}` && "bg-white text-primary shadow-sm"
                    )}
                    style={{ fontSize: '13px', fontWeight: 500 }}
                  >
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate" style={{ fontSize: '13px', fontWeight: 500 }}>{session.title}</p>
                      <p className="text-muted-foreground" style={{ fontSize: '10px' }}>
                        {session.current_round}/{session.max_rounds}回 • {formatDate(session.created_at)}
                      </p>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="border-t p-4">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Settings className="h-4 w-4" />
          <span>設定</span>
        </Link>
      </div>
    </div>
  )
}
