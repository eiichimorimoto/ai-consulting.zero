'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'

export default function Header() {
  const [scrollY, setScrollY] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isPricingPage = pathname === '/pricing'

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { label: '機能', id: 'features', href: '/#features' },
    { label: '5つのステップ', id: 'process', href: '/#process' },
    { label: '投資対効果', id: 'roi', href: '/#roi' },
    { label: '料金', id: 'pricing', href: '/pricing' },
    { label: 'サービスについて', id: 'about', href: '/#about' },
    { label: 'お問い合わせ', id: 'contact', href: '/contact' },
  ]

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrollY > 50 
          ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <motion.img
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                src="/info-data/AI-LOGO001.png"
                alt="SolveWise"
                className="h-12 w-auto"
              />
              <div>
                <span className={`text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ${
                  scrollY > 50 ? '' : 'text-white'
                }`}>
                  SolveWise
                </span>
                <p className={`text-xs hidden sm:block ${scrollY > 50 ? 'text-gray-500' : 'text-white/80'}`}>
                  経営課題をAIで解決
                </p>
              </div>
            </motion.div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`font-medium transition-colors relative ${
                  scrollY > 50 ? 'text-gray-700 hover:text-blue-600' : 'text-white hover:text-blue-200'
                }`}
              >
                {item.label}
                <motion.span
                  className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600"
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/auth/login"
              className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
                scrollY > 50 
                  ? 'text-gray-700 hover:text-blue-600' 
                  : 'text-white hover:text-blue-200'
              }`}
            >
              ログイン
            </Link>
            {!isPricingPage && (
              <Link
                href="/pricing"
                className={`px-6 py-2.5 rounded-lg font-semibold shadow-lg transition-all flex items-center gap-2 ${
                  scrollY > 50
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white text-gray-900 hover:shadow-white/20'
                }`}
              >
                無料で始める
                <ArrowRight size={18} />
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrollY > 50 ? 'text-gray-700' : 'text-white'
            }`}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden py-4 border-t border-gray-200/50"
          >
            <nav className="flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-medium transition-colors ${
                    scrollY > 50 ? 'text-gray-700 hover:text-blue-600' : 'text-white hover:text-blue-200'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-200/50">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-5 py-2.5 rounded-lg font-medium text-center transition-colors ${
                    scrollY > 50 
                      ? 'text-gray-700 hover:text-blue-600' 
                      : 'text-white hover:text-blue-200'
                  }`}
                >
                  ログイン
                </Link>
                {!isPricingPage && (
                  <Link
                    href="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-6 py-2.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all text-center"
                  >
                    無料で始める
                  </Link>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </motion.header>
  )
}
