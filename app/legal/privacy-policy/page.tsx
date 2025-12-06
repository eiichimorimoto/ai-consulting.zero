import Link from "next/link"
import { Home } from "lucide-react"

export default function PrivacyPolicyPage() {
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
            プライバシーポリシー
          </h1>
          <p className="text-gray-400 mb-12">制定日：2025年11月1日</p>

          <div className="space-y-8 text-gray-300">
            <section className="prose prose-invert max-w-none">
              <p className="text-lg leading-relaxed">
                株式会社マネジメント総研（以下「当社」といいます。）は、
                <br />
                当社が運営するAIコンサルティングサービス「SolveWise」（以下「本サービス」といいます。）におけるお客様の個人情報を適切に保護するため、以下の方針を定めます。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">● 1. 個人情報の利用目的</h2>
              <ul className="space-y-3 text-lg list-disc list-inside ml-4">
                <li>会員登録、本人確認、サービス提供のため</li>
                <li>サービス改善・新機能開発・お知らせのため</li>
                <li>請求・支払・返金処理など取引に関する業務のため</li>
                <li>問い合わせ対応のため</li>
                <li>法令に基づく対応のため</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">● 2. 個人情報の第三者提供</h2>
              <p className="text-lg">
                次の場合を除き、第三者に提供しません。
              </p>
              <ul className="space-y-3 text-lg list-disc list-inside ml-4 mt-4">
                <li>法令に基づく場合</li>
                <li>サービス提供に必要な範囲での委託先（決済・AI連携等）への提供</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">● 3. 安全管理措置</h2>
              <p className="text-lg">
                個人情報への不正アクセス、漏洩、改ざんを防ぐための技術的・組織的安全対策を講じます。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">● 4. 外部サービスの利用</h2>
              <ul className="space-y-3 text-lg list-disc list-inside ml-4">
                <li>Stripe（決済処理）</li>
                <li>Box／Google Drive（データ保管）</li>
                <li>OpenAI／Dify（AIエンジン連携）</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">● 5. 開示・訂正・削除</h2>
              <p className="text-lg">
                <a href="mailto:info@solvewise.jp" className="text-blue-400 hover:text-blue-300 underline">info@solvewise.jp</a> までお問い合わせください。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">● 6. Cookieの利用</h2>
              <p className="text-lg">
                利便性向上・アクセス解析・広告配信のためCookieを使用します。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">● 7. 改定</h2>
              <p className="text-lg">
                内容変更時は本サイト上でお知らせします。
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



