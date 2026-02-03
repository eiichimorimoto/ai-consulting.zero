'use client';

import { useState } from "react";
import { Search, ExternalLink, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
}

interface SearchTabProps {
  onInsertToChat?: (text: string) => void;
}

export function SearchTab({ onInsertToChat }: SearchTabProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([
    "中小企業 売上向上 施策",
    "コスト削減 成功事例",
    "業界平均 成長率 2026",
  ]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);

    // Simulate search delay
    setTimeout(() => {
      // Mock search results
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: '中小企業の売上向上に効果的な5つの施策',
          snippet: '中小企業が売上を伸ばすために実践すべき具体的な施策を紹介します。新規顧客獲得、既存顧客の単価向上、リピート率改善など...',
          url: 'https://example.com/sales-improvement',
        },
        {
          id: '2',
          title: '2026年版 業界別成長率レポート',
          snippet: '各業界の平均成長率と市場動向を詳しく分析。製造業15%、サービス業18%、小売業12%など、業界ごとの詳細データを提供...',
          url: 'https://example.com/growth-report-2026',
        },
        {
          id: '3',
          title: 'コスト削減の成功事例10選',
          snippet: '実際の企業が実践したコスト削減施策とその効果を紹介。固定費削減で年間500万円、業務効率化で人件費20%削減など...',
          url: 'https://example.com/cost-reduction-cases',
        },
      ];

      setResults(mockResults);
      setIsSearching(false);

      // Add to search history
      if (!searchHistory.includes(query)) {
        setSearchHistory(prev => [query, ...prev].slice(0, 5));
      }
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  const handleInsertToChat = (result: SearchResult) => {
    const insertText = `${result.title}\n${result.snippet}\n\n参考: ${result.url}`;

    if (onInsertToChat) {
      onInsertToChat(insertText);
      toast.success("検索結果をチャットに挿入しました");
    } else {
      toast.error("挿入できません", { description: "チャットへの挿入機能が利用できません。" });
    }
  };

  return (
    <div className="p-6">
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
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs bg-green-600 hover:bg-green-700 text-white border-0"
        >
          {isSearching ? "検索中..." : "検索"}
        </Button>
      </div>

      {/* Search History */}
      {results.length === 0 && (
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

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground">
            検索結果 ({results.length}件)
          </h4>
          {results.map(result => (
            <Card key={result.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 mb-1"
                    >
                      {result.title}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                      {result.snippet}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInsertToChat(result)}
                      className="h-7 text-xs px-2"
                    >
                      チャットに挿入
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !isSearching && query === "" && searchHistory.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">検索結果がここに表示されます</p>
        </div>
      )}
    </div>
  );
}
