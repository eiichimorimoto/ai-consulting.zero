import Link from "next/link"
import Image from "next/image"
import { Mail, Send, Home } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/" className="flex items-center gap-3 text-gray-900 hover:opacity-80 transition-opacity">
            <Image
              src="/info-data/AI-LOGO001.png"
              alt="SolveWise Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="font-light text-xl tracking-wide">SolveWise</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-light text-gray-900 mb-6">
            お問い合わせ
          </h1>
          <p className="text-gray-600 font-light leading-relaxed">
            ご質問やご相談がございましたら、お気軽にお問い合わせください。
          </p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
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
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-light text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all"
          >
            <Home size={18} />
            <span>トップページに戻る</span>
          </Link>
        </div>

        <div style={{display: 'none'}}>
          <form className="space-y-8">
            <div>
              <label htmlFor="name" className="block text-sm font-light text-gray-700 mb-3">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all font-light"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-light text-gray-700 mb-3">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all font-light"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-light text-gray-700 mb-3">
                会社名
              </label>
              <input
                type="text"
                id="company"
                name="company"
                className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all font-light"
                placeholder="株式会社サンプル"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-light text-gray-700 mb-3">
                件名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                required
                className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all font-light"
                placeholder="お問い合わせの件名"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-light text-gray-700 mb-3">
                お問い合わせ内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={8}
                className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all resize-none font-light"
                placeholder="お問い合わせ内容をご記入ください"
              />
            </div>

            <div className="flex items-start gap-3 pt-4">
              <input
                type="checkbox"
                id="privacy"
                name="privacy"
                required
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
              />
              <label htmlFor="privacy" className="text-sm text-gray-600 font-light">
                <Link href="/legal/privacy-policy" className="text-blue-600 hover:underline">
                  プライバシーポリシー
                </Link>
                に同意します <span className="text-red-500">*</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-light hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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



