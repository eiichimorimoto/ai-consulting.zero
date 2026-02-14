"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MessageSquare,
  Settings,
  PlusCircle,
  TrendingUp,
  DollarSign,
  Zap,
  Users,
  Target,
  Search,
  Disc,
  CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface SimpleSidebarProps {
  sessions?: Array<{
    id: string
    title: string
    category: string
    current_round: number
    max_rounds: number
    created_at?: string
    status?: "active" | "completed" | "archived"
  }>
  selectedCategory?: string
  onCategoryChange?: (category: string) => void
  currentSessionStatus?: "active" | "completed" | "archived"
}

const CATEGORIES = [
  { id: "general", label: "一般相談", icon: MessageSquare },
  { id: "sales", label: "売上改善", icon: TrendingUp },
  { id: "cost", label: "コスト削減", icon: DollarSign },
  { id: "digital", label: "DX推進", icon: Zap },
  { id: "hr", label: "人事・組織", icon: Users },
  { id: "strategy", label: "経営戦略", icon: Target },
]

export function SimpleSidebar({
  sessions = [],
  selectedCategory = "general",
  onCategoryChange,
  currentSessionStatus,
}: SimpleSidebarProps) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"active" | "completed" | "all">("active")
  const [currentPage, setCurrentPage] = useState(0)

  // 検索クエリやフィルターが変更されたらページをリセット
  useEffect(() => {
    setCurrentPage(0)
  }, [searchQuery, statusFilter])

  // カテゴリーに応じたアイコンを取得
  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.id === category)
    return cat ? cat.icon : MessageSquare
  }

  // 日付フォーマット関数
  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `${year}/${month}/${day} ${hours}:${minutes}`
  }

  // カテゴリーラベル取得
  const getCategoryLabel = (categoryId: string) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId)
    return cat ? cat.label : ""
  }

  // ステータスと検索でフィルタリング
  const filteredSessions = useMemo(() => {
    // 1. ステータスフィルター
    let filtered = sessions.filter((session) => {
      if (statusFilter === "all") return true
      return session.status === statusFilter
    })

    // 2. 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((session) => {
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
    }

    return filtered
  }, [sessions, searchQuery, statusFilter])

  // 各ステータスの件数を計算
  const activeCount = sessions.filter((s) => s.status === "active").length
  const completedCount = sessions.filter((s) => s.status === "completed").length

  return (
    <div className="bg-muted/30 flex h-full w-64 flex-col border-r">
      {/* ヘッダー */}
      <div className="border-b p-4">
        <h2 className="text-base font-semibold">AI相談</h2>
      </div>

      {/* メニュー */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 新規相談カテゴリー */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <PlusCircle className="text-primary h-4 w-4" />
            <p className="text-[13px] font-semibold">新規相談</p>
          </div>

          <RadioGroup
            value={selectedCategory}
            onValueChange={(value) => {
              if (currentSessionStatus === "active") {
                alert("現在の相談が継続中です。相談を終了してから新しい相談を開始してください。")
                return
              }
              onCategoryChange?.(value)
            }}
            disabled={currentSessionStatus === "active"}
          >
            <div className="space-y-2">
              {CATEGORIES.map((category) => {
                const Icon = category.icon
                return (
                  <div key={category.id} className="flex items-center space-x-2 pl-4">
                    <RadioGroupItem
                      value={category.id}
                      id={category.id}
                      className="h-4 w-4"
                      disabled={currentSessionStatus === "active"}
                    />
                    <Label
                      htmlFor={category.id}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center gap-2",
                        currentSessionStatus === "active" && "cursor-not-allowed opacity-50"
                      )}
                      style={{ fontSize: "13px", fontWeight: 500 }}
                      onClick={() => {
                        if (currentSessionStatus === "active") {
                          alert(
                            "現在の相談が継続中です。相談を終了してから新しい相談を開始してください。"
                          )
                          return
                        }
                        onCategoryChange?.(category.id)
                      }}
                    >
                      <Icon className="text-muted-foreground h-3.5 w-3.5" />
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
            <MessageSquare className="text-primary h-4 w-4" />
            <p className="text-[13px] font-semibold">相談履歴</p>
          </div>

          {/* ステータスフィルター */}
          {sessions.length > 0 && (
            <div className="mb-3">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue placeholder="フィルター" />
                </SelectTrigger>
                <SelectContent className="border-border bg-white shadow-lg dark:bg-slate-900">
                  <SelectItem
                    value="active"
                    className="text-foreground hover:bg-accent cursor-pointer text-[13px] font-medium"
                  >
                    相談中 ({activeCount})
                  </SelectItem>
                  <SelectItem
                    value="completed"
                    className="text-foreground hover:bg-accent cursor-pointer text-[13px] font-medium"
                  >
                    完了 ({completedCount})
                  </SelectItem>
                  <SelectItem
                    value="all"
                    className="text-foreground hover:bg-accent cursor-pointer text-[13px] font-medium"
                  >
                    すべて ({sessions.length})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 検索ボックス */}
          {sessions.length > 0 && (
            <div className="relative mb-3">
              <Search className="text-muted-foreground absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="相談履歴を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-[13px]"
                disabled={currentSessionStatus === "active"}
              />
            </div>
          )}

          <div className="space-y-0.5">
            {sessions.length === 0 ? (
              <p className="text-muted-foreground px-3 py-4 text-[13px]">
                まだ相談履歴がありません
              </p>
            ) : filteredSessions.length === 0 ? (
              <p className="text-muted-foreground px-3 py-4 text-[13px]">検索結果がありません</p>
            ) : (
              <>
                {filteredSessions.slice(currentPage * 15, (currentPage + 1) * 15).map((session) => {
                  const Icon = getCategoryIcon(session.category)
                  return (
                    <Link
                      key={session.id}
                      href={`/consulting/sessions/${session.id}`}
                      onClick={(e) => {
                        if (currentSessionStatus === "active") {
                          e.preventDefault()
                          alert(
                            "現在の相談が継続中です。相談を終了してから別の相談履歴を開いてください。"
                          )
                        }
                      }}
                      className={cn(
                        "hover:bg-accent hover:text-accent-foreground flex items-start gap-2.5 rounded-md px-3 py-2 transition-colors",
                        pathname === `/consulting/sessions/${session.id}` &&
                          "text-primary bg-white shadow-sm",
                        currentSessionStatus === "active" && "cursor-not-allowed opacity-50"
                      )}
                      style={{ fontSize: "13px", fontWeight: 500 }}
                    >
                      <Icon className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p
                            className="flex-1 truncate"
                            style={{ fontSize: "13px", fontWeight: 500 }}
                          >
                            {session.title}
                          </p>
                          {/* ステータスアイコン */}
                          {session.status === "active" && (
                            <Disc className="h-3 w-3 shrink-0 fill-blue-500 text-blue-500" />
                          )}
                          {session.status === "completed" && (
                            <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
                          )}
                          {session.status === "archived" && (
                            <Disc className="h-3 w-3 shrink-0 fill-gray-400 text-gray-400" />
                          )}
                        </div>
                        <p className="text-muted-foreground" style={{ fontSize: "10px" }}>
                          {session.current_round}/{session.max_rounds}回 •{" "}
                          {formatDate(session.created_at)}
                        </p>
                      </div>
                    </Link>
                  )
                })}

                {/* ページネーションボタン */}
                {(currentPage > 0 || filteredSessions.length > (currentPage + 1) * 15) && (
                  <div className="flex gap-2 px-3 py-2">
                    {/* 前へボタン */}
                    {currentPage > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1 text-[12px]"
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                      >
                        ← 前の15件
                      </Button>
                    )}

                    {/* 次へボタン */}
                    {filteredSessions.length > (currentPage + 1) * 15 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1 text-[12px]"
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                      >
                        次の15件 →
                      </Button>
                    )}
                  </div>
                )}

                {/* 現在のページ情報 */}
                {filteredSessions.length > 15 && (
                  <div className="text-muted-foreground px-3 py-1 text-center text-[11px]">
                    {currentPage * 15 + 1}〜
                    {Math.min((currentPage + 1) * 15, filteredSessions.length)}件 / 全
                    {filteredSessions.length}件
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="border-t p-4">
        <Link
          href="/dashboard/settings"
          className="hover:bg-accent hover:text-accent-foreground flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>設定</span>
        </Link>
      </div>
    </div>
  )
}
