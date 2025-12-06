import Link from "next/link"
import { Home } from "lucide-react"

export default function SpecificCommercialTransactionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="font-semibold text-lg">SolveWise</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 md:p-12 shadow-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            特定商取引法に基づく表記
          </h1>
          <p className="text-gray-400 mb-12">制定日：2025年11月1日</p>

          <div className="space-y-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">■ 販売事業者名</h2>
              <p className="text-lg">株式会社マネジメント総研（SolveWise事業部）</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">■ 運営責任者</h2>
              <p className="text-lg">代表取締役　森本 榮一（Eiichi Morimoto）</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">■ 所在地</h2>
              <p className="text-lg">
                〒463-0048<br />
                愛知県名古屋市徳川町2313
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">■ お問い合わせ</h2>
              <p className="text-lg">
                メールアドレス：<a href="mailto:info@solvewise.jp" className="text-blue-400 hover:text-blue-300 underline">info@solvewise.jp</a>
                <br />
                （お問い合わせはフォームまたはメールにてお願いいたします）
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">■ 販売価格</h2>
              <p className="text-lg">各プランページに記載（消費税込み）</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">■ サービス開始時期</h2>
              <p className="text-lg">クレジットカード決済完了後、即時利用可能</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">■ お支払い方法</h2>
              <p className="text-lg">
                クレジットカード（Stripe等）による決済
                <br />
                ※定期課金の場合は、毎月自動で決済が行われます。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">■ 返品・キャンセルについて</h2>
              <p className="text-lg">
                デジタルサービスの性質上、利用開始後の返金には応じられません。
                <br />
                契約の停止・解約は次回請求日の前日までにお手続きください。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">■ 動作環境</h2>
              <p className="text-lg">インターネット接続環境および対応ブラウザが必要です。</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">■ その他</h2>
              <p className="text-lg">特別な販売条件・提供条件がある場合は、各プラン詳細に明示します。</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">■ 反社会的勢力の排除について</h2>
              <p className="text-lg">
                当社は、暴力団・反社会的勢力との関係を一切持たず、
                <br />
                そのような勢力との取引を固くお断りいたします。
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-700 text-center">
            <p className="text-gray-400 text-sm">
              ――――――――――――――――――――――――
              <br />
              株式会社マネジメント総研 SolveWise事業部
              <br />
              代表取締役　森本 榮一
              <br />
              制定日：2025年11月1日
            </p>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Home size={18} />
              <span>トップページに戻る</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

