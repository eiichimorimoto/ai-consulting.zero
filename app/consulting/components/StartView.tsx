"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, TrendingUp, DollarSign, Zap, Users, Target, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  {
    id: "general",
    title: "一般相談",
    description: "ビジネス全般のご相談",
    icon: MessageSquare,
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    id: "sales",
    title: "売上改善",
    description: "売上向上・新規開拓",
    icon: TrendingUp,
    gradient: "from-green-500/20 to-emerald-500/20",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-500",
  },
  {
    id: "cost",
    title: "コスト削減",
    description: "経費削減・効率化",
    icon: DollarSign,
    gradient: "from-orange-500/20 to-amber-500/20",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  {
    id: "digital",
    title: "DX推進",
    description: "デジタル化・IT活用",
    icon: Zap,
    gradient: "from-purple-500/20 to-violet-500/20",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    id: "hr",
    title: "人事・組織",
    description: "採用・育成・組織開発",
    icon: Users,
    gradient: "from-pink-500/20 to-rose-500/20",
    iconBg: "bg-pink-500/10",
    iconColor: "text-pink-500",
  },
  {
    id: "strategy",
    title: "経営戦略",
    description: "事業戦略・中長期計画",
    icon: Target,
    gradient: "from-red-500/20 to-orange-500/20",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
  },
]

interface StartViewProps {
  onSelectCategory?: (category: string) => void
}

export function StartView({ onSelectCategory }: StartViewProps) {
  return (
    <div className="w-full space-y-8 py-8">
      {/* ヘッダー - アニメーション付き */}
      <div className="text-center">
        <div className="bg-primary/10 mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2">
          <Sparkles className="text-primary h-4 w-4" />
          <span className="text-primary text-sm font-medium">AI Powered</span>
        </div>
        <h1 className="from-primary mb-3 bg-gradient-to-r via-purple-500 to-pink-500 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
          AI経営相談
        </h1>
        <p className="text-muted-foreground text-lg">どのような課題についてご相談されますか？</p>
      </div>

      {/* カテゴリー選択グリッド */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <Card
              key={category.id}
              className={cn(
                "group relative cursor-pointer overflow-hidden border-2 transition-all duration-300",
                "hover:border-primary/50 hover:scale-[1.02] hover:shadow-xl",
                "active:scale-[0.98]"
              )}
              onClick={() => onSelectCategory?.(category.id)}
            >
              {/* グラデーション背景 */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                  category.gradient
                )}
              />

              <CardHeader className="relative">
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={cn(
                      "rounded-xl p-3 transition-transform duration-300 group-hover:scale-110",
                      category.iconBg
                    )}
                  >
                    <Icon className={cn("h-6 w-6", category.iconColor)} />
                  </div>
                  <CardTitle className="text-xl">{category.title}</CardTitle>
                </div>
                <CardDescription className="text-sm">{category.description}</CardDescription>
              </CardHeader>

              {/* ホバー時のアイコン */}
              <div className="absolute bottom-4 right-4 opacity-0 transition-opacity duration-300 group-hover:opacity-20">
                <Icon className="text-foreground h-16 w-16" />
              </div>
            </Card>
          )
        })}
      </div>

      {/* 注意事項カード */}
      <Card className="border-primary/20 from-primary/5 bg-gradient-to-br to-purple-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl">
              💡
            </div>
            <div className="space-y-3">
              <p className="font-semibold">ご利用の流れ</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="flex items-start gap-2">
                  <div className="bg-primary/20 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    1
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">カテゴリー選択</p>
                    <p className="text-muted-foreground text-xs">課題に合わせて選択</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="bg-primary/20 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    2
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">AI対話</p>
                    <p className="text-muted-foreground text-xs">最大5往復で深堀り</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="bg-primary/20 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    3
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">提案書生成</p>
                    <p className="text-muted-foreground text-xs">即座にPDF化可能</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
