import { MessageSquare, Clock, TrendingUp, Users, Database, Shield } from "lucide-react"

const features = [
  {
    icon: MessageSquare,
    title: "対話型AI分析エンジン",
    description: "経営課題を会話で把握。ChatGPT技術で人間のコンサルタントと対話をするように、戦略を検討します。",
  },
  {
    icon: Clock,
    title: "24時間リアルタイム分析",
    description: "休むことなく市場動向・財務データを監視。変化の兆候を見逃さないキャッチし、アラートを送ります。",
  },
  {
    icon: TrendingUp,
    title: "予測分析＆シナリオプランニング",
    description: "AIが複数の未来シナリオをシミュレーションし、最適な経営判断をサポート。",
  },
  {
    icon: Users,
    title: "組織パフォーマンス最適化",
    description: "チームの生産性、スキルギャップ、配置状況をAIが評価。組織の潜在能力を最大化する提案を実現します。",
  },
  {
    icon: Database,
    title: "統合データプラットフォーム",
    description: "異なるデータを一元化。財務、顧客、市場、人事、マーケティングのすべてが網羅的に分析します。",
  },
  {
    icon: Shield,
    title: "AIリスク検知システム",
    description: "財務リスク、コンプライアンス違反、市場変動を予見。問題が起きる前に警告を発信します。",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-blue-600 text-sm mb-4">
            <span className="text-blue-500">✦</span>
            <span>AI Powered Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            人を超える洞察力で
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
              経営を次のステージへ
            </span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mt-6">
            コンサルタントの経験と知識をAIが学習。データ分析から実行支援まで、
            <br className="hidden md:block" />
            あなたのビジネスに最適化された経営支援を提供します。
          </p>

          {/* Navigation Pills */}
          <div className="flex justify-center gap-2 mt-8">
            <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              サイトマップ
            </button>
            <button className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full">
              アプリにログイン+
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-6 group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
                <feature.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
