import Link from "next/link"
import { Home } from "lucide-react"

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center gap-3 text-gray-900 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="SolveWise" width={40} height={40} className="h-10 w-auto object-contain" />
            <span className="font-semibold text-sm">SolveWise</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 shadow-sm">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-4">
            利用規約
          </h1>
          <p className="text-gray-500 mb-12 text-sm">制定日：2025年11月1日</p>

          <div className="space-y-8 text-gray-700">
            <section className="prose max-w-none">
              <p className="text-sm leading-relaxed">
                本規約（以下「本規約」といいます。）は、
                <br />
                株式会社マネジメント総研（以下「当社」といいます。）が運営する
                <br />
                AIコンサルティングサービス「SolveWise」（以下「本サービス」といいます。）の利用条件を定めるものです。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">■ 第1条（適用）</h2>
              <p className="text-sm">
                本規約は、当社とユーザーとの間の一切の関係に適用されます。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">■ 第2条（利用登録）</h2>
              <p className="text-sm">
                登録希望者は本規約に同意のうえ登録を行い、
                <br />
                当社の承認をもって利用契約が成立します。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">■ 第3条（禁止事項）</h2>
              <p className="text-sm mb-4">以下の行為を禁止します。</p>
              <ul className="space-y-3 text-sm list-disc list-inside ml-4">
                <li>法令または公序良俗に反する行為</li>
                <li>サービスの運営を妨げる行為</li>
                <li>他者の権利侵害</li>
                <li>AI出力の不正利用・誹謗中傷・不適切な発言</li>
                <li>当社技術の無断解析や転載行為</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">■ 第4条（利用料金と支払方法）</h2>
              <ul className="space-y-3 text-sm list-disc list-inside ml-4">
                <li>料金はサイト上の表示に従います。</li>
                <li>支払はStripeによるクレジットカード決済です。</li>
                <li>サブスクリプションは自動更新となります。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">■ 第5条（免責事項）</h2>
              <ul className="space-y-3 text-sm list-disc list-inside ml-4">
                <li>AI出力内容の正確性・有用性は保証しません。</li>
                <li>本サービスの利用による損害について当社は一切責任を負いません。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">■ 第6条（契約解除）</h2>
              <p className="text-sm">
                本規約違反があった場合、当社は通知なく契約を解除できます。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">■ 第7条（反社会的勢力の排除）</h2>
              <ul className="space-y-3 text-sm list-disc list-inside ml-4">
                <li>ユーザーは反社会的勢力でないことを保証します。</li>
                <li>違反が判明した場合、当社は即時契約を解除できます。</li>
                <li>解除による損害について当社は責任を負いません。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">■ 第8条（準拠法および裁判管轄）</h2>
              <p className="text-sm">
                本規約は日本法に準拠し、
                <br />
                名古屋地方裁判所を専属的合意管轄とします。
              </p>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-sm">
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



