"use client"

import { useState, useEffect } from "react"
import { Search, ExternalLink, Clock, Loader2, Sparkles, RefreshCw, ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface SearchResult {
  url: string
  title: string
  description: string
}

interface SearchTabProps {
  onInsertToChat?: (text: string) => void
}

export function SearchTab({ onInsertToChat }: SearchTabProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [sources, setSources] = useState<string[]>([])
  /** この要約に使ったソース件数（要約結果カードで表示用） */
  const [summarizedCount, setSummarizedCount] = useState<number>(0)
  const [isSearching, setIsSearching] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [searchSource, setSearchSource] = useState<"google" | "brave" | null>(null)
  const [fallbackInfo, setFallbackInfo] = useState<string | null>(null)
  /** 要約に含める検索結果のインデックス（未設定時は全件選択） */
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  // 検索結果が変わったら全件を選択状態にする
  useEffect(() => {
    if (results.length > 0) {
      setSelectedIndices(new Set(results.map((_, i) => i)))
    } else {
      setSelectedIndices(new Set())
    }
  }, [results])

  // 検索履歴をlocalStorageから読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem("searchHistory")
      if (saved) {
        setSearchHistory(JSON.parse(saved))
      } else {
        // デフォルトの検索履歴
        setSearchHistory(["中小企業 売上向上 施策", "コスト削減 成功事例", "業界平均 成長率 2026"])
      }
    } catch (error) {
      console.error("Failed to load search history:", error)
    }
  }, [])

  // 自動リトライ付き検索
  const searchWithRetry = async (searchQuery: string, maxRetries = 2): Promise<any> => {
    let lastError: Error | null = null

    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetch("/api/consulting/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery }),
        })

        if (response.ok) {
          return await response.json()
        }

        // 429 (Rate Limit)の場合は1分待機
        if (response.status === 429) {
          if (i < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 60000))
            continue
          }
        }

        throw new Error(`HTTP ${response.status}`)
      } catch (error) {
        lastError = error as Error
        setRetryCount(i + 1)

        // 最後のリトライでなければ待機
        if (i < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
        }
      }
    }

    throw lastError
  }

  // 検索実行
  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setError(null)
    setResults([])
    setSummary(null)
    setSources([])
    setRetryCount(0)

    try {
      const result = await searchWithRetry(query)

      if (result.success && result.results) {
        setResults(result.results)
        setSearchSource(result.source || "brave")

        // フォールバック情報があれば保存
        if (result.fallback) {
          setFallbackInfo(result.fallback.reason)
        } else {
          setFallbackInfo(null)
        }

        // 検索履歴に追加
        if (!searchHistory.includes(query)) {
          const newHistory = [query, ...searchHistory].slice(0, 5)
          setSearchHistory(newHistory)
          localStorage.setItem("searchHistory", JSON.stringify(newHistory))
        }

        // 検索ソースに応じたトーストメッセージ
        const sourceText = result.source === "google" ? "Google" : "Brave Search"
        toast.success(`${sourceText}で${result.results.length}件の検索結果が見つかりました`)

        // フォールバック通知
        if (result.fallback) {
          toast.info(`${result.fallback.reason}のため、${sourceText}を使用しました`, {
            duration: 5000,
          })
        }
      } else {
        throw new Error(result.error || "検索に失敗しました")
      }
    } catch (error) {
      console.error("Search error:", error)
      setError("検索に失敗しました。もう一度お試しください。")
      toast.error("検索に失敗しました")
    } finally {
      setIsSearching(false)
    }
  }

  // 要約対象の選択トグル
  const toggleSelected = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  // 全選択 / 全解除
  const selectAll = () => setSelectedIndices(new Set(results.map((_, i) => i)))
  const selectNone = () => setSelectedIndices(new Set())

  // 要約生成（選択された結果のみ）
  const handleSummarize = async () => {
    const selectedResults = results.filter((_, i) => selectedIndices.has(i))
    if (selectedResults.length === 0) {
      toast.error("要約するソースを1件以上選択してください")
      return
    }

    setIsSummarizing(true)
    setError(null)

    try {
      const response = await fetch("/api/consulting/search/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, results: selectedResults }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setSummary(data.summary)
        setSources(data.sources)
        setSummarizedCount(selectedResults.length)
        toast.success("要約を生成しました")
      } else {
        throw new Error(data.error || "要約生成に失敗しました")
      }
    } catch (error) {
      console.error("Summarize error:", error)
      setError("要約生成に失敗しました。もう一度お試しください。")
      toast.error("要約生成に失敗しました")
    } finally {
      setIsSummarizing(false)
    }
  }

  // チャットに要約を挿入
  const handleInsertSummaryToChat = () => {
    if (!summary) return

    const insertText = `検索キーワード「${query}」の要約:\n\n${summary}\n\n参考URL:\n${sources.map((url, i) => `${i + 1}. ${url}`).join("\n")}`

    if (onInsertToChat) {
      onInsertToChat(insertText)
      toast.success("要約をチャットに挿入しました")
    } else {
      toast.error("挿入できません", { description: "チャットへの挿入機能が利用できません。" })
    }
  }

  // Enterキーで検索
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  // 検索履歴クリック
  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery)
    setResults([])
    setSummary(null)
    setError(null)
  }

  // 要約を閉じて検索画面に戻る
  const handleBackToSearch = () => {
    setSummary(null)
  }

  // 再試行
  const handleRetry = () => {
    if (results.length === 0) {
      handleSearch()
    } else {
      handleSummarize()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 p-6 pb-4">
        <h3 className="text-foreground mb-1 text-sm font-bold">検索</h3>
        <p className="text-muted-foreground mb-4 text-xs">Web検索で情報を調べる</p>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="キーワードを入力..."
            className="border-border focus:ring-primary bg-background w-full rounded-lg border py-2 pl-10 pr-20 text-sm focus:outline-none focus:ring-2"
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="absolute right-1 top-1/2 h-7 -translate-y-1/2 border-0 bg-blue-600 text-xs text-white hover:bg-blue-700"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                検索中...
              </>
            ) : (
              "検索"
            )}
          </Button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-red-600">❌</div>
                <div className="flex-1">
                  <h4 className="mb-1 text-sm font-semibold text-red-900">エラーが発生しました</h4>
                  <p className="mb-3 text-xs text-red-700">{error}</p>
                  {retryCount > 0 && (
                    <p className="mb-3 text-xs text-red-600">
                      自動で{retryCount}回試行しましたが成功しませんでした。
                    </p>
                  )}
                  <Button
                    onClick={handleRetry}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    🔄 再試行
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search History */}
        {results.length === 0 && !summary && searchHistory.length > 0 && (
          <div className="mb-6">
            <h4 className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-semibold">
              <Clock className="h-3.5 w-3.5" />
              検索履歴
            </h4>
            <div className="space-y-2">
              {searchHistory.map((historyQuery, idx) => (
                <button
                  key={idx}
                  onClick={() => handleHistoryClick(historyQuery)}
                  className="text-muted-foreground hover:bg-accent w-full rounded-lg px-3 py-2 text-left text-xs transition-colors"
                >
                  {historyQuery}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results（要約前: チェックで選択 → ボタンで要約） */}
        {results.length > 0 && !summary && (
          <div className="mb-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-muted-foreground text-xs font-semibold">
                検索結果 ({results.length}件) · {selectedIndices.size}件選択中
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">🦁 Brave Search</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="h-7 text-xs"
                >
                  {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : "再検索"}
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              要約に含めるソースにチェックを入れてから、下のボタンで要約してください。
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-blue-600 hover:underline"
                >
                  全選択
                </button>
                <span className="text-muted-foreground text-xs">/</span>
                <button
                  type="button"
                  onClick={selectNone}
                  className="text-xs text-blue-600 hover:underline"
                >
                  全解除
                </button>
              </div>
              <Button
                onClick={handleSummarize}
                disabled={isSummarizing || selectedIndices.size === 0}
                className="h-8 bg-blue-600 text-xs text-white hover:bg-blue-700"
              >
                {isSummarizing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                )}
                選択した {selectedIndices.size} 件を要約
              </Button>
            </div>
            {results.map((result, idx) => (
              <Card
                key={idx}
                className={`border-border/50 cursor-pointer transition-colors ${selectedIndices.has(idx) ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                onClick={() => toggleSelected(idx)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedIndices.has(idx)}
                        onChange={() => toggleSelected(idx)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between">
                        <h5 className="text-foreground flex-1 text-sm font-semibold">
                          {result.title}
                        </h5>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 flex-shrink-0 text-blue-600 hover:text-blue-700"
                          title="別タブで開く"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {result.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* 要約ボタン（一覧下にも配置） */}
            <Button
              onClick={handleSummarize}
              disabled={isSummarizing || selectedIndices.size === 0}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  要約生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  選択した {selectedIndices.size} 件を要約
                </>
              )}
            </Button>
          </div>
        )}

        {/* Summary Result */}
        {summary && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  要約結果
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSearch}
                  className="-mr-2 text-xs text-blue-700 hover:bg-blue-100 hover:text-blue-900"
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  検索に戻る
                </Button>
              </div>
              <p className="mb-1 text-xs text-blue-700">検索キーワード「{query}」</p>
              {summarizedCount > 0 && (
                <p className="mb-3 text-xs text-blue-600">
                  選択した {summarizedCount} 件のソースで要約しました
                </p>
              )}
              <div className="mb-4 whitespace-pre-line text-sm leading-relaxed text-blue-900">
                {summary}
              </div>

              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold text-blue-900">参考URL:</p>
                {sources.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-1 block break-all text-xs text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    {i + 1}. {url}
                  </a>
                ))}
              </div>

              <div className="flex gap-2 pr-2">
                <Button
                  onClick={handleInsertSummaryToChat}
                  className="flex-1 bg-blue-600 px-2 text-white hover:bg-blue-700"
                >
                  💬 チャットに挿入
                </Button>
                <Button
                  onClick={handleSummarize}
                  className="flex-1 bg-blue-500 text-white hover:bg-blue-600"
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  再生成
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {results.length === 0 &&
          !isSearching &&
          !summary &&
          query === "" &&
          searchHistory.length === 0 && (
            <div className="py-12 text-center">
              <Search className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground text-sm">検索結果がここに表示されます</p>
            </div>
          )}
      </div>
    </div>
  )
}
