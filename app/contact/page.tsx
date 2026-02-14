import Link from "next/link"
import { Mail, Send, Home } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 text-gray-900 transition-opacity hover:opacity-80"
          >
            <img
              src="/logo.png"
              alt="SolveWise Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-xl font-light tracking-wide">SolveWise</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="mb-6 text-3xl font-light text-gray-900 md:text-4xl">お問い合わせ</h1>
          <p className="font-light leading-relaxed text-gray-600">
            ご質問やご相談がございましたら、お気軽にお問い合わせください。
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm">
          <iframe
            key={Date.now()}
            src={`https://docs.google.com/forms/d/e/1FAIpQLSdqNJWfVO-xisI5NWDlAHb4hMYC7Km6cay_LJwl0IZJ54RwXQ/viewform?embedded=true&v=${Date.now()}`}
            width="100%"
            height="1400"
            frameBorder="0"
            marginHeight={0}
            marginWidth={0}
            className="w-full"
          >
            読み込んでいます...
          </iframe>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-light text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-700"
          >
            <Home size={18} />
            <span>トップページに戻る</span>
          </Link>
        </div>

        <div style={{ display: "none" }}>
          <form className="space-y-8">
            <div>
              <label htmlFor="name" className="mb-3 block text-sm font-light text-gray-700">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-4 font-light transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-3 block text-sm font-light text-gray-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-4 font-light transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="company" className="mb-3 block text-sm font-light text-gray-700">
                会社名
              </label>
              <input
                type="text"
                id="company"
                name="company"
                className="w-full rounded-lg border border-gray-300 px-4 py-4 font-light transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="株式会社サンプル"
              />
            </div>

            <div>
              <label htmlFor="subject" className="mb-3 block text-sm font-light text-gray-700">
                件名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-4 font-light transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="お問い合わせの件名"
              />
            </div>

            <div>
              <label htmlFor="message" className="mb-3 block text-sm font-light text-gray-700">
                お問い合わせ内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={8}
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-4 font-light transition-all focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                placeholder="お問い合わせ内容をご記入ください"
              />
            </div>

            <div className="flex items-start gap-3 pt-4">
              <input
                type="checkbox"
                id="privacy"
                name="privacy"
                required
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="privacy" className="text-sm font-light text-gray-600">
                <Link href="/legal/privacy-policy" className="text-blue-600 hover:underline">
                  プライバシーポリシー
                </Link>
                に同意します <span className="text-red-500">*</span>
              </label>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 font-light text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
            >
              <Send size={18} />
              送信する
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
