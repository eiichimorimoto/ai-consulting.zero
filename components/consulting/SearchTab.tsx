'use client';

import { useState, useEffect } from "react";
import { Search, ExternalLink, Clock, Loader2, Sparkles, RefreshCw, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SearchResult {
  url: string;
  title: string;
  description: string;
}

interface SearchTabProps {
  onInsertToChat?: (text: string) => void;
}

export function SearchTab({ onInsertToChat }: SearchTabProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  /** この要約に使ったソース件数（要約結果カードで表示用） */
  const [summarizedCount, setSummarizedCount] = useState<number>(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchSource, setSearchSource] = useState<'google' | 'brave' | null>(null);
  const [fallbackInfo, setFallbackInfo] = useState<string | null>(null);
  /** 要約に含める検索結果のインデックス（未設定時は全件選択） */
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // 検索結果が変わったら全件を選択状態にする
  useEffect(() => {
    if (results.length > 0) {
      setSelectedIndices(new Set(results.map((_, i) => i)));
    } else {
      setSelectedIndices(new Set());
    }
  }, [results]);

  // 検索履歴をlocalStorageから読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem('searchHistory');
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      } else {
        // デフォルトの検索履歴
        setSearchHistory([
          "中小企業 売上向上 施策",
          "コスト削減 成功事例",
          "業界平均 成長率 2026",
        ]);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }, []);

  // 自動リトライ付き検索
  const searchWithRetry = async (searchQuery: string, maxRetries = 2): Promise<any> => {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetch('/api/consulting/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery })
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        // 429 (Rate Limit)の場合は1分待機
        if (response.status === 429) {
          if (i < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 60000));
            continue;
          }
        }
        
        throw new Error(`HTTP ${response.status}`);
        
      } catch (error) {
        lastError = error as Error;
        setRetryCount(i + 1);
        
        // 最後のリトライでなければ待機
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw lastError;
  };

  // 検索実行
  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResults([]);
    setSummary(null);
    setSources([]);
    setRetryCount(0);

    try {
      const result = await searchWithRetry(query);
      
      if (result.success && result.results) {
        setResults(result.results);
        setSearchSource(result.source || 'brave');
        
        // フォールバック情報があれば保存
        if (result.fallback) {
          setFallbackInfo(result.fallback.reason);
        } else {
          setFallbackInfo(null);
        }
        
        // 検索履歴に追加
        if (!searchHistory.includes(query)) {
          const newHistory = [query, ...searchHistory].slice(0, 5);
          setSearchHistory(newHistory);
          localStorage.setItem('searchHistory', JSON.stringify(newHistory));
        }
        
        // 検索ソースに応じたトーストメッセージ
        const sourceText = result.source === 'google' ? 'Google' : 'Brave Search';
        toast.success(`${sourceText}で${result.results.length}件の検索結果が見つかりました`);
        
        // フォールバック通知
        if (result.fallback) {
          toast.info(`${result.fallback.reason}のため、${sourceText}を使用しました`, {
            duration: 5000
          });
        }
      } else {
        throw new Error(result.error || '検索に失敗しました');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('検索に失敗しました。もう一度お試しください。');
      toast.error('検索に失敗しました');
    } finally {
      setIsSearching(false);
    }
  };

  // 要約対象の選択トグル
  const toggleSelected = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // 全選択 / 全解除
  const selectAll = () => setSelectedIndices(new Set(results.map((_, i) => i)));
  const selectNone = () => setSelectedIndices(new Set());

  // 要約生成（選択された結果のみ）
  const handleSummarize = async () => {
    const selectedResults = results.filter((_, i) => selectedIndices.has(i));
    if (selectedResults.length === 0) {
      toast.error('要約するソースを1件以上選択してください');
      return;
    }

    setIsSummarizing(true);
    setError(null);

    try {
      const response = await fetch('/api/consulting/search/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, results: selectedResults })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSummary(data.summary);
        setSources(data.sources);
        setSummarizedCount(selectedResults.length);
        toast.success('要約を生成しました');
      } else {
        throw new Error(data.error || '要約生成に失敗しました');
      }
    } catch (error) {
      console.error('Summarize error:', error);
      setError('要約生成に失敗しました。もう一度お試しください。');
      toast.error('要約生成に失敗しました');
    } finally {
      setIsSummarizing(false);
    }
  };

  // チャットに要約を挿入
  const handleInsertSummaryToChat = () => {
    if (!summary) return;

    const insertText = `検索キーワード「${query}」の要約:\n\n${summary}\n\n参考URL:\n${sources.map((url, i) => `${i + 1}. ${url}`).join('\n')}`;

    if (onInsertToChat) {
      onInsertToChat(insertText);
      toast.success('要約をチャットに挿入しました');
    } else {
      toast.error('挿入できません', { description: 'チャットへの挿入機能が利用できません。' });
    }
  };

  // Enterキーで検索
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 検索履歴クリック
  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setResults([]);
    setSummary(null);
    setError(null);
  };

  // 要約を閉じて検索画面に戻る
  const handleBackToSearch = () => {
    setSummary(null);
  };

  // 再試行
  const handleRetry = () => {
    if (results.length === 0) {
      handleSearch();
    } else {
      handleSummarize();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 flex-shrink-0">
        <h3 className="text-sm font-bold text-foreground mb-1">検索</h3>
        <p className="text-xs text-muted-foreground mb-4">Web検索で情報を調べる</p>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="キーワードを入力..."
            className="w-full pl-10 pr-20 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
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
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-red-600">❌</div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900 mb-1">
                  エラーが発生しました
                </h4>
                <p className="text-xs text-red-700 mb-3">{error}</p>
                {retryCount > 0 && (
                  <p className="text-xs text-red-600 mb-3">
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
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            検索履歴
          </h4>
          <div className="space-y-2">
            {searchHistory.map((historyQuery, idx) => (
              <button
                key={idx}
                onClick={() => handleHistoryClick(historyQuery)}
                className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent rounded-lg transition-colors"
              >
                {historyQuery}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results（要約前: チェックで選択 → ボタンで要約） */}
      {results.length > 0 && !summary && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-semibold text-muted-foreground">
              検索結果 ({results.length}件) · {selectedIndices.size}件選択中
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">🦁 Brave Search</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearch}
                disabled={isSearching}
                className="text-xs h-7"
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : "再検索"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            要約に含めるソースにチェックを入れてから、下のボタンで要約してください。
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="text-xs text-blue-600 hover:underline">
                全選択
              </button>
              <span className="text-xs text-muted-foreground">/</span>
              <button type="button" onClick={selectNone} className="text-xs text-blue-600 hover:underline">
                全解除
              </button>
            </div>
            <Button
              onClick={handleSummarize}
              disabled={isSummarizing || selectedIndices.size === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
            >
              {isSummarizing ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
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
                  <div className="flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={selectedIndices.has(idx)}
                      onChange={() => toggleSelected(idx)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h5 className="text-sm font-semibold text-foreground flex-1">
                        {result.title}
                      </h5>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 flex-shrink-0 ml-2"
                        title="別タブで開く"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSummarizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                要約生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                選択した {selectedIndices.size} 件を要約
              </>
            )}
          </Button>
        </div>
      )}

      {/* Summary Result */}
      {summary && (
        <Card className="border-blue-200 bg-blue-50 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600" />
                要約結果
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToSearch}
                className="text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100 -mr-2"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                検索に戻る
              </Button>
            </div>
            <p className="text-xs text-blue-700 mb-1">
              検索キーワード「{query}」
            </p>
            {summarizedCount > 0 && (
              <p className="text-xs text-blue-600 mb-3">
                選択した {summarizedCount} 件のソースで要約しました
              </p>
            )}
            <div className="text-sm whitespace-pre-line mb-4 leading-relaxed text-blue-900">
              {summary}
            </div>
            
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2 text-blue-900">参考URL:</p>
              {sources.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-700 hover:text-blue-900 hover:underline block mb-1 break-all"
                >
                  {i + 1}. {url}
                </a>
              ))}
            </div>
            
            <div className="flex gap-2 pr-2">
              <Button
                onClick={handleInsertSummaryToChat}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2"
              >
                💬 チャットに挿入
              </Button>
              <Button
                onClick={handleSummarize}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                再生成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Empty State */}
        {results.length === 0 && !isSearching && !summary && query === "" && searchHistory.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">検索結果がここに表示されます</p>
          </div>
        )}
      </div>
    </div>
  );
}
