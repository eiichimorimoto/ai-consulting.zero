import Link from "next/link"
import { Home } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 text-gray-900 transition-opacity hover:opacity-80"
          >
            <img
              src="/logo.png"
              alt="SolveWise"
              width={40}
              height={40}
              className="h-10 w-auto object-contain"
            />
            <span className="text-sm font-semibold">SolveWise</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:p-12">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 md:text-3xl">
            プライバシーポリシー
          </h1>
          <p className="mb-12 text-gray-500">制定日：2025年11月1日</p>

          <div className="space-y-8 text-gray-700">
            <section className="prose max-w-none">
              <p className="text-sm leading-relaxed">
                株式会社マネジメント総研（以下「当社」といいます。）は、
                <br />
                当社が運営するAIコンサルティングサービス「SolveWise」（以下「本サービス」といいます。）におけるお客様の個人情報を適切に保護するため、以下の方針を定めます。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">● 1. 個人情報の利用目的</h2>
              <ul className="ml-4 list-inside list-disc space-y-3 text-sm">
                <li>会員登録、本人確認、サービス提供のため</li>
                <li>サービス改善・新機能開発・お知らせのため</li>
                <li>請求・支払・返金処理など取引に関する業務のため</li>
                <li>問い合わせ対応のため</li>
                <li>法令に基づく対応のため</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                ● 2. 個人情報の第三者提供
              </h2>
              <p className="text-sm">次の場合を除き、第三者に提供しません。</p>
              <ul className="ml-4 mt-4 list-inside list-disc space-y-3 text-sm">
                <li>法令に基づく場合</li>
                <li>サービス提供に必要な範囲での委託先（決済・AI連携等）への提供</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">● 3. 安全管理措置</h2>
              <p className="text-sm">
                個人情報への不正アクセス、漏洩、改ざんを防ぐための技術的・組織的安全対策を講じます。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">● 4. 外部サービスの利用</h2>
              <ul className="ml-4 list-inside list-disc space-y-3 text-sm">
                <li>Stripe（決済処理）</li>
                <li>Box／Google Drive（データ保管）</li>
                <li>OpenAI／Dify（AIエンジン連携）</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">● 5. 開示・訂正・削除</h2>
              <p className="text-sm">
                <a
                  href="mailto:info@solvewise.jp"
                  className="text-blue-600 underline hover:text-blue-700"
                >
                  info@solvewise.jp
                </a>{" "}
                までお問い合わせください。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">● 6. Cookieの利用</h2>
              <p className="text-sm">
                利便性向上・アクセス解析・広告配信のためCookieを使用します。
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">● 7. 改定</h2>
              <p className="text-sm">内容変更時は本サイト上でお知らせします。</p>
            </section>
          </div>

          <div className="mt-16 border-t border-gray-200 pt-8 text-center">
            <p className="text-sm text-gray-500">
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
              className="group inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
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
