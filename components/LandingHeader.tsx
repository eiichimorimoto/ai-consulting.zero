"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const LOGO_SRC = `/logo.png?v=${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "1"}`;

export default function LandingHeader() {
  const [isLightMode, setIsLightMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const updateHeaderMode = () => {
      const hero = document.querySelector(".hero");
      if (!hero) return;

      const heroBottom = hero.getBoundingClientRect().height;
      const triggerPoint = heroBottom - 100;

      setIsLightMode(window.scrollY > triggerPoint);
    };

    updateHeaderMode();
    window.addEventListener("scroll", updateHeaderMode);
    window.addEventListener("resize", updateHeaderMode);

    return () => {
      window.removeEventListener("scroll", updateHeaderMode);
      window.removeEventListener("resize", updateHeaderMode);
    };
  }, []);

  return (
    <header
      className={`
        fixed top-0 left-0 w-full z-50
        px-5 md:px-10 py-3 md:py-4
        flex justify-between items-center
        backdrop-blur-md transition-all duration-300
        ${
          isLightMode
            ? "bg-white/90 border-b border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.05)]"
            : "bg-slate-900/80 border-b border-white/5"
        }
      `}
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
          <span className="flex h-10 w-10 items-center justify-center rounded bg-slate-700 text-white text-xs font-bold">S</span>
        )}
        <div>
          <div
            className={`font-bold text-lg transition-colors duration-300 ${
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
      <nav className="hidden md:flex gap-8">
        {[
          { href: "#features", label: "機能" },
          { href: "#steps", label: "5つのステップ" },
          { href: "/pricing", label: "料金プラン" },
          { href: "/contact", label: "お問い合わせ" },
          { href: "/auth/login", label: "ログイン" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              text-sm no-underline transition-all duration-300
              hover:text-cyan-400
              ${
                isLightMode
                  ? "text-slate-900/70 hover:text-cyan-500"
                  : "text-white/70"
              }
            `}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* CTAボタン */}
      <Link
        href="/auth/sign-up"
        className={`
          hidden md:block
          px-6 py-2.5 rounded text-sm font-semibold
          transition-all duration-300 no-underline
          ${
            isLightMode
              ? "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-[0_0_20px_rgba(15,23,42,0.3)]"
              : "bg-cyan-400 text-slate-900 hover:bg-cyan-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          }
        `}
      >
        無料で始める
      </Link>

      {/* モバイルメニューボタン */}
      <button
        className="md:hidden p-2"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="メニュー"
      >
        <div className="space-y-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`block w-6 h-0.5 transition-all duration-300 ${
                isLightMode ? "bg-slate-900" : "bg-white"
              }`}
            />
          ))}
        </div>
      </button>

      {/* モバイルメニュー */}
      {isMobileMenuOpen && (
        <nav
          className={`
            absolute top-full left-0 w-full
            flex flex-col gap-4 p-5
            md:hidden
            backdrop-blur-md
            ${
              isLightMode
                ? "bg-white/95 border-b border-black/10"
                : "bg-slate-900/95 border-b border-white/10"
            }
          `}
        >
          {[
            { href: "#features", label: "機能" },
            { href: "#steps", label: "5つのステップ" },
            { href: "/pricing", label: "料金プラン" },
            { href: "/contact", label: "お問い合わせ" },
            { href: "/auth/login", label: "ログイン" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                text-sm no-underline
                ${isLightMode ? "text-slate-900/70" : "text-white/70"}
              `}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/auth/sign-up"
            className={`
              px-6 py-2.5 rounded text-sm font-semibold text-center no-underline
              ${
                isLightMode
                  ? "bg-slate-900 text-white"
                  : "bg-cyan-400 text-slate-900"
              }
            `}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            無料で始める
          </Link>
        </nav>
      )}
    </header>
  );
}

