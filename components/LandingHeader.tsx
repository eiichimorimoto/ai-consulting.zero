"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

const LOGO_SRC = "/logo.png"

export default function LandingHeader() {
  const [isLightMode, setIsLightMode] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    const updateHeaderMode = () => {
      const hero = document.querySelector(".hero")
      if (!hero) return

      const heroBottom = hero.getBoundingClientRect().height
      const triggerPoint = heroBottom - 100

      setIsLightMode(window.scrollY > triggerPoint)
    }

    updateHeaderMode()
    window.addEventListener("scroll", updateHeaderMode)
    window.addEventListener("resize", updateHeaderMode)

    return () => {
      window.removeEventListener("scroll", updateHeaderMode)
      window.removeEventListener("resize", updateHeaderMode)
    }
  }, [])

  return (
    <header
      className={`fixed left-0 top-0 z-50 flex w-full items-center justify-between px-5 py-3 backdrop-blur-md transition-all duration-300 md:px-10 md:py-4 ${
        isLightMode
          ? "border-b border-black/5 bg-white/90 shadow-[0_2px_20px_rgba(0,0,0,0.05)]"
          : "border-b border-white/5 bg-slate-900/80"
      } `}
    >
      {/* ロゴ（キャッシュバスティングでVercel反映を確実に・読み込み失敗時はテキスト表示） */}
      <Link href="/" className="flex items-center gap-3 no-underline">
        {!logoError ? (
          <img
            src={LOGO_SRC}
            alt="SolveWise"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded bg-slate-700 text-xs font-bold text-white">
            S
          </span>
        )}
        <div>
          <div
            className={`text-lg font-bold transition-colors duration-300 ${
              isLightMode ? "text-slate-900" : "text-white"
            }`}
          >
            SolveWise
          </div>
          <div
            className={`text-[10px] transition-colors duration-300 ${
              isLightMode ? "text-slate-900/50" : "text-white/50"
            }`}
          >
            経営課題をAIで解決
          </div>
        </div>
      </Link>

      {/* ナビゲーション（デスクトップ） */}
      <nav className="hidden gap-8 md:flex">
        {[
          { href: "#features", label: "機能" },
          { href: "#steps", label: "5つのステップ" },
          { href: "/pricing", label: "料金プラン" },
          { href: "/auth/login", label: "ログイン" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm no-underline transition-all duration-300 hover:text-cyan-400 ${
              isLightMode ? "text-slate-900/70 hover:text-cyan-500" : "text-white/70"
            } `}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* CTAボタン */}
      <Link
        href="/auth/sign-up"
        className={`hidden rounded px-6 py-2.5 text-sm font-semibold no-underline transition-all duration-300 md:block ${
          isLightMode
            ? "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-[0_0_20px_rgba(15,23,42,0.3)]"
            : "bg-cyan-400 text-slate-900 hover:bg-cyan-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
        } `}
      >
        無料で始める
      </Link>

      {/* モバイルメニューボタン */}
      <button
        className="p-2 md:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="メニュー"
      >
        <div className="space-y-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`block h-0.5 w-6 transition-all duration-300 ${
                isLightMode ? "bg-slate-900" : "bg-white"
              }`}
            />
          ))}
        </div>
      </button>

      {/* モバイルメニュー */}
      {isMobileMenuOpen && (
        <nav
          className={`absolute left-0 top-full flex w-full flex-col gap-4 p-5 backdrop-blur-md md:hidden ${
            isLightMode
              ? "border-b border-black/10 bg-white/95"
              : "border-b border-white/10 bg-slate-900/95"
          } `}
        >
          {[
            { href: "#features", label: "機能" },
            { href: "#steps", label: "5つのステップ" },
            { href: "/pricing", label: "料金プラン" },
            { href: "/auth/login", label: "ログイン" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm no-underline ${isLightMode ? "text-slate-900/70" : "text-white/70"} `}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/auth/sign-up"
            className={`rounded px-6 py-2.5 text-center text-sm font-semibold no-underline ${
              isLightMode ? "bg-slate-900 text-white" : "bg-cyan-400 text-slate-900"
            } `}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            無料で始める
          </Link>
        </nav>
      )}
    </header>
  )
}
