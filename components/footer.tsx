import Link from "next/link"

const footerLinks = {
  サービス: ["機能一覧", "料金プラン", "導入事例"],
  サポート: ["ヘルプセンター", "お問い合わせ", "FAQ"],
  会社情報: ["会社概要", "採用情報", "ニュース"],
  法的情報: ["利用規約", "プライバシポリシー", "セキュリティ"],
}

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Logo */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <img 
                src="/info-data/AI-LOGO001.png" 
                alt="SolveWise" 
                className="h-8 w-auto"
              />
              <span className="font-semibold">SolveWise</span>
            </Link>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-sm mb-4 text-gray-400">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 text-center">
          <p className="text-sm text-gray-500">© 2025 SolveWise. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
