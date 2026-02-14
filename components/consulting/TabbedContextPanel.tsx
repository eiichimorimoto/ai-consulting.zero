"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { RIGHT_PANEL } from "@/lib/consulting-ui-tokens"
import {
  TrendingUp,
  Lightbulb,
  FileText,
  Upload,
  Search,
  BarChart3,
  LayoutDashboard,
  Pin,
  MessageSquare,
} from "lucide-react"
import { FilesTab } from "./FilesTab"
import { BudgetTab } from "./BudgetTab"
import { SearchTab } from "./SearchTab"

interface KPI {
  label: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
}

/** ピン留めしたAI回答（右パネル一覧・チャットで見る用） */
export interface PinnedMessageItem {
  id: number
  content: string
}

interface TabbedContextPanelProps {
  currentStep: number
  sessionName: string
  kpis: KPI[]
  onInsertToChat?: (text: string) => void
  /** 新規登録者時: インサイトはダッシュボードから表示を促す */
  showDashboardPrompt?: boolean
  attachedFiles?: File[]
  /** ピン留めしたAI回答一覧。クリックでチャットの該当メッセージにスクロール */
  pinnedMessages?: PinnedMessageItem[]
  onScrollToMessage?: (messageId: number) => void
}

/** 本文の先頭をタイトル用に短くする（改行・Markdown除去） */
function toTitle(content: string, maxLen = 48): string {
  const one =
    content
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/#+\s*/g, "")
      .split(/\n/)[0]
      ?.trim() ?? ""
  return one.length > maxLen ? one.slice(0, maxLen) + "…" : one
}

export function TabbedContextPanel({
  currentStep,
  sessionName,
  kpis,
  onInsertToChat,
  showDashboardPrompt,
  attachedFiles = [],
  pinnedMessages = [],
  onScrollToMessage,
}: TabbedContextPanelProps) {
  const [activeTab, setActiveTab] = useState("insights")

  return (
    <aside className={`flex h-full w-80 flex-col border-l ${RIGHT_PANEL.base}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        {/* Tab Headers（添付画像: アクティブは緑下線） */}
        <TabsList className="grid w-full grid-cols-4 rounded-none border-b border-gray-200 bg-transparent p-0">
          <TabsTrigger
            value="insights"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-gray-100/80"
            title="インサイト - 課題に関する情報や推奨事項"
          >
            <Lightbulb className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger
            value="budget"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-gray-100/80"
            title="予算 - 予算情報の管理と分析"
          >
            <BarChart3 className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-gray-100/80"
            title="ファイル - 添付ファイルの管理"
          >
            <Upload className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger
            value="search"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-gray-100/80"
            title="検索 - Web検索で情報を調べる"
          >
            <Search className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        {/* Insights Tab（右エリア: 基本白・見出し・本文は黒系で明示） */}
        <TabsContent value="insights" className="m-0 flex-1 overflow-y-auto bg-white">
          <div className="p-6">
            <h3 className="mb-1 text-sm font-bold text-gray-900">インサイト</h3>

            {/* ピン留めしたAI回答一覧（コンパクト表示） */}
            {pinnedMessages.length > 0 && (
              <div className="mb-4">
                <h4 className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-gray-600">
                  <Pin className="h-3 w-3 flex-shrink-0 text-amber-500" />
                  ピン留め（{pinnedMessages.length}）
                </h4>
                <ul className="space-y-1">
                  {pinnedMessages.map((msg) => (
                    <li key={msg.id}>
                      <div className="rounded border border-amber-100 bg-amber-50/40 px-2 py-1.5">
                        <p
                          className="mb-1 line-clamp-1 text-[11px] text-gray-600"
                          title={msg.content}
                        >
                          {toTitle(msg.content)}
                        </p>
                        {onScrollToMessage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 min-h-0 border-0 px-1.5 text-[11px] text-amber-700 hover:bg-amber-100"
                            onClick={() => onScrollToMessage(msg.id)}
                          >
                            <MessageSquare className="mr-1 h-2.5 w-2.5 flex-shrink-0" />
                            チャットで見る
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showDashboardPrompt ? (
              <div className="mt-4 space-y-4">
                <p className="text-xs leading-relaxed text-gray-600">
                  相談を始める前に、ダッシュボードで貴社の経営状況を確認してください。登録済みの会社情報や業界見通しを踏まえて、より的確なアドバイスをご提供します。
                </p>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100"
                >
                  <LayoutDashboard className="h-4 w-4 text-blue-600" />
                  ダッシュボードを開く
                </Link>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs text-gray-600">
                  {currentStep === 1 && "情報収集フェーズ"}
                  {currentStep === 2 && "現状分析フェーズ"}
                  {currentStep === 3 && "解決策検討フェーズ"}
                  {currentStep === 4 && "実行計画策定フェーズ"}
                  {currentStep === 5 && "レポート作成フェーズ"}
                </p>

                {/* STEP 1: 課題のヒアリング */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        この課題について
                      </h4>
                      <Card className={RIGHT_PANEL.highlightBlock}>
                        <CardContent className="p-4">
                          <p className="text-xs leading-relaxed text-gray-600">
                            {sessionName === "売上の伸び悩み" &&
                              "売上改善には、新規顧客獲得・既存顧客単価向上・リピート率改善の3つのアプローチがあります。まずは現状を詳しく把握することが重要です。"}
                            {sessionName === "コスト削減" &&
                              "効果的なコスト削減は、固定費の見直し・変動費の最適化・業務効率化の3軸で進めます。削減による品質低下を避けることが成功の鍵です。"}
                            {sessionName === "新規事業立ち上げ" &&
                              "新規事業の成功率を高めるには、市場調査・MVP検証・段階的投資が重要です。小さく始めて、検証しながら拡大していきましょう。"}
                            {sessionName === "組織改革" &&
                              "組織改革は、ビジョン共有・段階的実施・継続的フォローの3ステップで進めます。社員の理解と協力が成功の鍵となります。"}
                            {!sessionName.match(/売上|コスト|新規事業|組織/) &&
                              "課題解決には、現状の正確な把握と、実現可能な目標設定が重要です。一緒に最適な解決策を見つけていきましょう。"}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <FileText className="h-4 w-4 text-blue-600" />
                        次に必要な情報
                      </h4>
                      <div className="space-y-2">
                        {["現在の売上規模", "目標とする売上", "主要な収益源"].map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                            <span className="text-gray-600">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <FileText className="h-4 w-4 text-blue-600" />
                        関連資料
                      </h4>
                      <div className="space-y-2">
                        {["業界ベンチマーク 2026", "価格戦略ガイド", "顧客分析レポート"].map(
                          (doc, idx) => (
                            <button
                              key={idx}
                              className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
                            >
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-xs text-gray-900">{doc}</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: 現状分析 */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        収集済み情報
                      </h4>
                      <div className="space-y-3">
                        <Card className="border border-gray-200 bg-white">
                          <CardContent className="p-4">
                            <p className="text-xs text-gray-600">現在の月間売上</p>
                            <p className="mt-1 font-mono text-xl font-bold text-gray-900">¥12.5M</p>
                          </CardContent>
                        </Card>
                        <Card className="border border-gray-200 bg-white">
                          <CardContent className="p-4">
                            <p className="text-xs text-gray-600">目標月間売上</p>
                            <p className="mt-1 font-mono text-xl font-bold text-gray-900">¥18.0M</p>
                          </CardContent>
                        </Card>
                        <Card className="border border-gray-200 bg-white">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-600">達成率</p>
                                <p className="mt-1 font-mono text-xl font-bold text-gray-900">
                                  69%
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className="bg-gray-100 text-xs text-gray-800"
                              >
                                ギャップ: ¥5.5M
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        初期インサイト
                      </h4>
                      <Card className={RIGHT_PANEL.accentBlock}>
                        <CardContent className="p-4">
                          <div className="space-y-2 text-xs leading-relaxed text-gray-700">
                            <p>- 目標達成には44%の成長が必要</p>
                            <p>- 業界平均成長率: 15-20%</p>
                            <p>- 追加データで精度向上可能</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <FileText className="h-4 w-4 text-blue-600" />
                        推奨される次のステップ
                      </h4>
                      <div className="space-y-2">
                        {[
                          "顧客セグメント別の売上分析",
                          "競合との価格比較",
                          "販売チャネルの効率分析",
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                            <span className="text-gray-600">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: 解決策の提案 */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        提案中の施策
                      </h4>
                      <div className="space-y-3">
                        <Card className="border border-gray-200 bg-white">
                          <CardContent className="p-4">
                            <p className="mb-1 text-xs font-semibold text-gray-900">
                              施策A: 新規顧客獲得強化
                            </p>
                            <p className="text-xs text-gray-600">期待効果: +¥2.0M/月</p>
                          </CardContent>
                        </Card>
                        <Card className="border border-gray-200 bg-white">
                          <CardContent className="p-4">
                            <p className="mb-1 text-xs font-semibold text-gray-900">
                              施策B: 既存顧客単価向上
                            </p>
                            <p className="text-xs text-gray-600">期待効果: +¥1.5M/月</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        期待される効果
                      </h4>
                      <Card className={RIGHT_PANEL.accentBlock}>
                        <CardContent className="p-4">
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">合計期待効果</span>
                              <span className="font-semibold text-blue-700">+¥3.5M/月</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">目標達成率</span>
                              <span className="font-semibold text-gray-900">94%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">実施期間</span>
                              <span className="font-semibold text-gray-900">6ヶ月</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        注意点
                      </h4>
                      <div className="space-y-2">
                        {["市場環境の変化", "競合の動向", "実行リソースの確保"].map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                            <span className="text-gray-600">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4 & 5: その他のステップ用の簡易表示 */}
                {currentStep >= 4 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        現在のKPI
                      </h4>
                      <div className="space-y-3">
                        {kpis.map((kpi, index) => (
                          <Card key={index} className="border border-gray-200 bg-white">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-xs text-gray-600">{kpi.label}</p>
                                  <p className="mt-1 font-mono text-2xl font-bold text-gray-900">
                                    {kpi.value}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    kpi.trend === "up"
                                      ? "default"
                                      : kpi.trend === "down"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {kpi.change}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        重要なインサイト
                      </h4>
                      <Card className={RIGHT_PANEL.accentBlock}>
                        <CardContent className="p-4">
                          <p className="mb-1 text-xs font-semibold text-gray-900">
                            平均単価の低下に注意
                          </p>
                          <p className="text-xs leading-relaxed text-gray-600">
                            顧客数は増加していますが、平均単価が11%低下しています。価格戦略の見直しを検討しましょう。
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <FileText className="h-4 w-4 text-blue-600" />
                        関連資料
                      </h4>
                      <div className="space-y-2">
                        {["業界ベンチマーク 2026", "価格戦略ガイド", "顧客分析レポート"].map(
                          (doc, idx) => (
                            <button
                              key={idx}
                              className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
                            >
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-xs text-gray-900">{doc}</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="m-0 flex-1 overflow-y-auto bg-white">
          <BudgetTab />
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="m-0 flex-1 overflow-y-auto bg-white">
          <FilesTab
            attachedFiles={attachedFiles}
            onBudgetDataImported={(data) => {
              console.log("Budget data imported:", data)
            }}
            onBudgetGenerated={(data) => {
              console.log("Budget generated:", data)
              setActiveTab("budget")
            }}
          />
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="m-0 flex-1 overflow-y-auto bg-white">
          <SearchTab onInsertToChat={onInsertToChat} />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
