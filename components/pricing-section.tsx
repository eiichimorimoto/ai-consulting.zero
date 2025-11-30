import { Button } from "@/components/ui/button"
import { Check, Sparkles } from "lucide-react"

const plans = [
  {
    name: "Free",
    subtitle: "まずは体験してみたい方へ",
    price: "0",
    unit: "円",
    features: ["AIチャットで経営相談（月5回まで）", "基本レポート出力機能", "簡易データ分析"],
    cta: "無料で始める",
    highlighted: false,
  },
  {
    name: "Standard",
    subtitle: "本格的な経営支援を受けたい方へ",
    price: "12,000",
    unit: "円/月",
    features: ["無制限AIコンサルティング", "詳細データベース連携・分析", "カスタムレポート作成", "メールサポート対応"],
    cta: "14日間無料トライアル",
    highlighted: true,
  },
  {
    name: "Enterprise",
    subtitle: "大規模組織向けカスタムプラン",
    price: "お問い合わせ",
    unit: "",
    features: [
      "すべての機能＋独自カスタマイズ",
      "専任AIコンサルタント入稀入",
      "セキュリティ監査・オンプレ対応",
      "24時間優先サポート",
    ],
    cta: "導入を相談する",
    highlighted: false,
  },
]

export function PricingSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 text-blue-600 text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Free Trial Available</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              今すぐAIコンサルタントを
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">
                無料で体験
              </span>
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              登録後すぐにAIとの対話を開始。あなたの経営課題について相談し、SolveWiseの実力を体感してください。クレジットカード登録は不要です。
            </p>

            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                クレジットカード登録不要
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                30秒で登録完了
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                いつでもプラン変更・解約可能
              </li>
            </ul>

            {/* Image */}
            <div className="mt-8 rounded-2xl overflow-hidden shadow-lg">
              <img src="/professional-business-consultant-working-with-ai-h.jpg" alt="AIコンサルティングイメージ" className="w-full h-auto" />
            </div>
          </div>

          {/* Right - Pricing Cards */}
          <div className="space-y-6">
            <div className="text-sm text-gray-500 mb-4">▼ 料金プラン</div>

            {plans.map((plan, index) => (
              <div
                key={index}
                className={`rounded-2xl p-6 ${
                  plan.highlighted
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl"
                    : "bg-white border border-gray-200 shadow-sm"
                }`}
              >
                {plan.highlighted && (
                  <div className="text-xs bg-white/20 rounded-full px-3 py-1 inline-block mb-3">おすすめ</div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className={`text-xl font-bold ${plan.highlighted ? "text-white" : "text-gray-900"}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-sm ${plan.highlighted ? "text-white/80" : "text-gray-500"}`}>{plan.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${plan.highlighted ? "text-white" : "text-gray-900"}`}>
                      {plan.price}
                    </div>
                    <div className={`text-sm ${plan.highlighted ? "text-white/80" : "text-gray-500"}`}>{plan.unit}</div>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className={`w-4 h-4 ${plan.highlighted ? "text-white" : "text-blue-500"}`} />
                      <span className={plan.highlighted ? "text-white/90" : "text-gray-600"}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? "bg-white text-blue-600 hover:bg-white/90"
                      : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
                  }`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}

            <p className="text-xs text-gray-500 text-center">
              すべてのプランに30日間返金保証・セキュリティ保護・データ保護付き
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
