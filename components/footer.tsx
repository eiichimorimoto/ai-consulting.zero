import Link from "next/link"
import Image from "next/image"

const footerLinks = {
  サービス: [
    { name: "機能一覧", href: "/#features" },
    { name: "料金プラン", href: "/pricing" },
    { name: "よくある質問", href: "/#faq" }
  ],
  会社情報: [
    { name: "サービスについて", href: "/#about" },
    { name: "企業情報", href: "/#company" },
    { name: "ニュース", href: "/#news" }
  ],
  サポート: [
    { name: "お問い合わせ", href: "/contact" },
    { name: "利用規約", href: "/legal/terms-of-service" },
    { name: "プライバシーポリシー", href: "/legal/privacy-policy" },
    { name: "特定商取引法", href: "/legal/specific-commercial-transactions" }
  ]
}

export function Footer() {
  return (
    <footer className="bg-blue-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Image
                src="/info-data/AI-LOGO007.png"
                alt="SolveWise"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <span className="text-xl font-bold">SolveWise</span>
            </Link>
            <p className="text-xs text-gray-300 leading-tight mt-2">
              AIで経営課題を解決する次世代コンサルティングサービス
            </p>
            <div className="flex gap-2 mt-4">
              <Link 
                href="#" 
                className="w-8 h-8 rounded-lg bg-blue-800 hover:bg-blue-700 flex items-center justify-center transition-colors text-white"
                aria-label="X (Twitter)"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Link>
              <Link 
                href="#" 
                className="w-8 h-8 rounded-lg bg-blue-800 hover:bg-blue-700 flex items-center justify-center transition-colors text-white"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </Link>
              <Link 
                href="#" 
                className="w-8 h-8 rounded-lg bg-blue-800 hover:bg-blue-700 flex items-center justify-center transition-colors text-white"
                aria-label="LinkedIn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-sm mb-2">{category}</h4>
              <ul className="space-y-1.5">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href} 
                      className="text-xs text-gray-300 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-gray-400 text-center">
            © 2025 SolveWise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
