"use client"

import { LazyMotion, domAnimation, m } from "framer-motion"
import Link from "next/link"
import { Orbitron, Montserrat, Noto_Sans_JP } from "next/font/google"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Brain,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  MessageSquare,
  Target,
} from "lucide-react"
import LandingHero from "@/components/LandingHero"

const orbitron = Orbitron({ subsets: ["latin"], weight: ["500", "600", "700"] })
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
})
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })

// AuthCodeRedirectorは削除しました
// middleware.tsでサーバー側でリダイレクト処理を行っているため、
// クライアント側での重複処理は無限ループの原因となります
// function AuthCodeRedirector() {
//   // この処理はmiddleware.tsで実行されています
//   return null
// }

export default function LandingPage() {
  return (
    <LazyMotion features={domAnimation}>
      <div
        className="min-h-screen"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 35%, #312e81 70%, #1e293b 100%)",
        }}
      >
        {/* Hero Section - LPトップ: 濃い青紫グラデーション + ネットワークパターン */}
        <LandingHero />

        {/* Features Section - 未来を変える主な機能 */}
        <section id="features" className="relative bg-white px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-20 text-center">
              <h2 className="mb-6 text-4xl font-light tracking-wide text-gray-900 md:text-5xl">
                <span className="font-normal text-blue-600">3つの</span>コアサービス
              </h2>
              <p className="text-lg font-light text-gray-600">
                戦略立案から実行まで、包括的にサポート
              </p>
            </div>

            <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
              {[
                {
                  title: "戦略コンサルティング",
                  description: "データに基づく戦略立案と意思決定支援",
                  image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
                  number: "01",
                },
                {
                  title: "データインテリジェンス",
                  description: "市場分析と競合分析による洞察提供",
                  image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
                  number: "02",
                },
                {
                  title: "実行支援",
                  description: "戦略実行のモニタリングと継続的改善",
                  image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
                  number: "03",
                },
              ].map((feature, index) => (
                <m.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  viewport={{ once: true }}
                  className="group overflow-hidden rounded-lg border border-gray-100 bg-white shadow-md transition-all hover:shadow-xl"
                >
                  <div className="relative h-64 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{
                        backgroundImage: `url(${feature.image})`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-6 left-6">
                      <div className="mb-2 text-6xl font-light text-white/30">{feature.number}</div>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="mb-3 text-2xl font-light tracking-wide text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="text-base font-light leading-relaxed text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* Point Section */}
        <section className="relative bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <m.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="relative">
                  <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl">
                    <video className="h-full w-full object-cover" controls loop playsInline>
                      <source src="/AI参謀：AIはコンサルをどう変えるか.mp4" type="video/mp4" />
                      お使いのブラウザは動画タグをサポートしていません。
                    </video>
                  </div>
                </div>
              </m.div>
              <m.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <h2 className="mb-8 text-4xl font-light leading-tight tracking-wide text-gray-900 md:text-5xl">
                  AIによる
                  <br />
                  <span className="font-normal text-blue-600">経営課題の解決</span>
                </h2>
                <p className="mb-8 text-lg font-light leading-relaxed text-gray-600">
                  データ分析から戦略立案、実行支援まで。
                  <br />
                  経営の意思決定を、確かな根拠とともに。
                </p>
              </m.div>
            </div>
          </div>
        </section>

        {/* 5 Steps Section */}
        <section id="steps" className="relative bg-white px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-20 text-center">
              <h2 className="mb-6 text-4xl font-light leading-tight tracking-wide text-gray-900 md:text-5xl">
                <span className="font-normal text-blue-600">5つのステップ</span>で<br />
                経営支援を実現
              </h2>
              <p className="text-lg font-light text-gray-600">
                課題の特定から実行支援まで、体系的にサポート
              </p>
            </div>

            <div className="relative">
              {/* Animated rope behind cards */}
              <div
                className="absolute left-0 right-0 top-1/2 z-0 hidden -translate-y-1/2 transform md:block"
                style={{ height: "120px" }}
              >
                <svg
                  width="100%"
                  height="120"
                  viewBox="0 0 1200 120"
                  preserveAspectRatio="none"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="ropeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="25%" stopColor="#60A5FA" />
                      <stop offset="50%" stopColor="#3B82F6" />
                      <stop offset="75%" stopColor="#60A5FA" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                    <filter id="ropeGlow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Main rope path */}
                  <path
                    d="M 0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60"
                    stroke="url(#ropeGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                    filter="url(#ropeGlow)"
                    opacity="0.6"
                  >
                    <animate
                      attributeName="d"
                      values="M 0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60;
                            M 0 60 Q 150 110, 300 60 T 600 60 T 900 60 T 1200 60;
                            M 0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60"
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </path>

                  {/* Rope highlight */}
                  <path
                    d="M 0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60"
                    stroke="#BFDBFE"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.4"
                  >
                    <animate
                      attributeName="d"
                      values="M 0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60;
                            M 0 60 Q 150 110, 300 60 T 600 60 T 900 60 T 1200 60;
                            M 0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60"
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </path>

                  {/* Moving particles along the rope - multiple particles */}
                  <circle r="4" fill="#60A5FA" opacity="0.9">
                    <animateMotion
                      dur="8s"
                      repeatCount="indefinite"
                      path="M 0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60"
                    />
                    <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite" />
                  </circle>

                  <circle r="3" fill="#93C5FD" opacity="0.7">
                    <animateMotion
                      dur="8s"
                      repeatCount="indefinite"
                      path="M 0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60"
                      begin="2s"
                    />
                  </circle>

                  <circle r="3" fill="#BFDBFE" opacity="0.8">
                    <animateMotion
                      dur="8s"
                      repeatCount="indefinite"
                      path="M 0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60"
                      begin="4s"
                    />
                  </circle>

                  <circle r="5" fill="#3B82F6" opacity="0.6">
                    <animateMotion
                      dur="8s"
                      repeatCount="indefinite"
                      path="M 0 60 Q 150 10, 300 60 T 600 60 T 900 60 T 1200 60"
                      begin="6s"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;1;0.6"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
              </div>

              <div className="relative z-10 grid gap-6 md:grid-cols-5">
                {[
                  {
                    step: "1",
                    title: "課題の特定",
                    subtitle: "ヒアリングと分析",
                    description: "経営課題の本質を特定し、優先順位を明確化",
                    color: "from-blue-500 to-blue-600",
                    icon: MessageSquare,
                  },
                  {
                    step: "2",
                    title: "現状分析",
                    subtitle: "データの可視化",
                    description: "業務とデータの現状を整理し、改善点を可視化",
                    color: "from-indigo-500 to-indigo-600",
                    icon: BarChart3,
                  },
                  {
                    step: "3",
                    title: "戦略立案",
                    subtitle: "ソリューション設計",
                    description: "データに基づく戦略を立案し、実行計画を策定",
                    color: "from-blue-600 to-indigo-600",
                    icon: Zap,
                  },
                  {
                    step: "4",
                    title: "実行支援",
                    subtitle: "施策の実装",
                    description: "戦略の実行をサポートし、進捗をモニタリング",
                    color: "from-indigo-600 to-blue-700",
                    icon: Target,
                  },
                  {
                    step: "5",
                    title: "継続改善",
                    subtitle: "効果測定と最適化",
                    description: "成果を測定し、継続的な改善サイクルを実現",
                    color: "from-blue-700 to-indigo-700",
                    icon: Brain,
                  },
                ].map((item, index) => (
                  <m.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    <div className="group h-full overflow-hidden rounded-2xl bg-white shadow-xl transition-all hover:shadow-2xl">
                      <div className={`bg-gradient-to-br ${item.color} relative p-8 text-center`}>
                        <svg width="0" height="0" style={{ position: "absolute" }}>
                          <defs>
                            <filter id={`insetShadow${index}`}>
                              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                              <feOffset dx="0" dy="3" result="offsetblur" />
                              <feFlood floodColor="rgba(0,0,0,0.5)" />
                              <feComposite in2="offsetblur" operator="in" />
                              <feMerge>
                                <feMergeNode />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                        </svg>
                        <div
                          className="relative mb-4 text-6xl font-bold text-white"
                          style={{
                            animation: `numberFlow${index} 8s ease-in-out infinite`,
                            animationDelay: `${index * 1.6}s`,
                          }}
                        >
                          <style>{`
                        @keyframes numberFlow${index} {
                          0% {
                            text-shadow: 
                              inset 2px 2px 4px rgba(0, 0, 0, 0.8),
                              2px 2px 4px rgba(0, 0, 0, 0.6),
                              -1px -1px 2px rgba(0, 0, 0, 0.4);
                            filter: brightness(0.7);
                          }
                          50% {
                            text-shadow: 
                              0 0 20px rgba(255, 255, 255, 0.8),
                              0 0 30px rgba(255, 255, 255, 0.6),
                              2px 2px 4px rgba(255, 255, 255, 0.4);
                            filter: brightness(1.3);
                          }
                          100% {
                            text-shadow: 
                              inset 2px 2px 4px rgba(0, 0, 0, 0.8),
                              2px 2px 4px rgba(0, 0, 0, 0.6),
                              -1px -1px 2px rgba(0, 0, 0, 0.4);
                            filter: brightness(0.7);
                          }
                        }
                      `}</style>
                          {item.step}
                        </div>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                          <item.icon className="h-8 w-8 text-white" />
                        </div>
                      </div>
                      <div className="bg-white p-6">
                        <h3 className="mb-2 text-xl font-bold text-gray-900">{item.title}</h3>
                        <p className="mb-3 text-sm font-semibold text-blue-600">{item.subtitle}</p>
                        <p className="text-sm leading-relaxed text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  </m.div>
                ))}
              </div>
            </div>

            <m.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              viewport={{ once: true }}
              className="mt-16 text-center"
            >
              <div className="rounded-3xl border-2 border-gray-200 bg-white p-12 shadow-xl">
                <h3 className="mb-4 text-3xl font-light text-gray-900 md:text-4xl">
                  貴社の課題もAIで解決できるだろうか？
                </h3>
                <p className="mb-8 text-lg font-light leading-relaxed text-gray-600 md:text-xl">
                  まずは無料相談で、貴社の課題をお聞かせください。
                  <br />
                  最適なAIソリューションをご提案いたします。
                </p>
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link href="/auth/sign-up">
                    <Button
                      size="lg"
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-10 py-7 text-lg font-light text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl"
                    >
                      無料相談を予約する
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-xl border-2 border-gray-300 px-10 py-7 text-lg font-light text-gray-700 hover:bg-gray-50"
                    >
                      <svg
                        className="mr-2 h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                        />
                      </svg>
                      サービス資料をダウンロード
                    </Button>
                  </Link>
                </div>
              </div>
            </m.div>
          </div>
        </section>

        {/* Business Value Section */}
        <section className="relative bg-white px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-light text-gray-900 md:text-5xl">
                <span className="text-blue-600">AIの力を</span>
                <br />
                貴社のビジネスに
              </h2>
            </div>

            <div className="grid items-center gap-16 md:grid-cols-2">
              <m.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="relative overflow-hidden rounded-3xl bg-black shadow-2xl">
                  <video className="h-full w-full object-cover" controls loop playsInline>
                    <source src="/video-1765885080626.mp4" type="video/mp4" />
                    お使いのブラウザは動画タグをサポートしていません。
                  </video>
                </div>
              </m.div>
              <m.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <p className="mb-8 text-lg font-light leading-relaxed text-gray-600">
                  AI技術を活用し、経営者の意思決定をサポートする次世代のコンサルティングサービス。貴社の具体的なニーズと目標を深く理解し、オーダーメイドのAI戦略を立案・実行します。
                </p>
                <div>
                  <Link href="/pricing">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-xl border-2 border-gray-300 px-8 py-6 text-lg font-light text-gray-700 hover:bg-gray-50"
                    >
                      料金プラン
                    </Button>
                  </Link>
                </div>
              </m.div>
            </div>
          </div>
        </section>

        {/* ROI Section */}
        <section className="relative bg-white px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mb-6 text-4xl font-light text-gray-900 md:text-5xl">
                <span className="text-blue-600">確実なリターン</span>を実現する
                <br />
                AI導入の投資対効果
              </h2>
              <p className="text-lg font-light leading-relaxed text-gray-600">
                AIコンサルティングは単なる技術導入に留まらず、
                <br />
                貴社の事業に具体的な財務的価値をもたらします
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "コスト削減",
                  description:
                    "AIによる業務自動化とリソース最適化により、運用コストを大幅に削減します。",
                  icon: TrendingDown,
                },
                {
                  title: "売上向上",
                  description:
                    "データに基づいた顧客行動予測とパーソナライズされた提案により、売上増加に貢献します。",
                  icon: TrendingUp,
                },
                {
                  title: "業務効率化",
                  description:
                    "意思決定の迅速化とプロセス改善により、組織全体の生産性を向上させます。",
                  icon: Zap,
                },
              ].map((item, index) => (
                <m.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="rounded-2xl border-2 border-gray-200 bg-white p-8 transition-all hover:shadow-xl"
                >
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50">
                    <item.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="mb-4 text-2xl font-light text-gray-900">{item.title}</h3>
                  <p className="font-light leading-relaxed text-gray-600">{item.description}</p>
                </m.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </LazyMotion>
  )
}
