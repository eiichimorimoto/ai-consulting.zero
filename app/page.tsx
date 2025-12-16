'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Brain, TrendingUp, TrendingDown, Users, Zap, BarChart3, FileText, MessageSquare, Target, Lightbulb, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900">
        {/* Background AI Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/humanoid-ai-robot-presenting-holographic-data-char.jpg)',
            opacity: 0.4
          }}
        />

        {/* Animated Dashboard Preview */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5 }}
            className="w-full max-w-6xl mx-auto px-4"
          >
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl border border-blue-400/20 p-8">
              {/* Mock Dashboard Elements */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="h-24 bg-blue-500/20 rounded-lg animate-pulse" />
                <div className="h-24 bg-indigo-500/20 rounded-lg animate-pulse delay-100" />
                <div className="h-24 bg-purple-500/20 rounded-lg animate-pulse delay-200" />
              </div>
              <div className="h-48 bg-blue-500/10 rounded-lg animate-pulse delay-300" />
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 backdrop-blur-sm mb-8">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">AI Powered Consulting</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold text-white mb-12 leading-tight tracking-tight"
          >
            AIが、
            <span className="text-blue-400">経営</span>
            を変える
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-300 mb-16 font-light leading-relaxed"
          >
            24時間365日、データに基づく戦略的意思決定をサポート
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-6 text-base font-semibold rounded-lg shadow-lg transition-all border border-blue-500"
              >
                サービスを始める
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white/30 text-white hover:bg-white/10 px-10 py-6 text-base font-semibold rounded-lg backdrop-blur-sm transition-all"
              >
                お問い合わせ
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="grid grid-cols-3 gap-12 mt-24 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-light text-white mb-3 tracking-wide">戦略立案</div>
              <div className="text-sm text-gray-400 font-light">データ駆動型の意思決定</div>
            </div>
            <div className="text-center border-x border-white/20">
              <div className="text-3xl md:text-4xl font-light text-white mb-3 tracking-wide">24/7対応</div>
              <div className="text-sm text-gray-400 font-light">いつでも相談可能</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-light text-white mb-3 tracking-wide">実行支援</div>
              <div className="text-sm text-gray-400 font-light">継続的なサポート</div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Liquid Glass Text */}
        <div className="absolute bottom-12 left-0 right-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ x: [0, -2000] }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
              repeatDelay: 0
            }}
            className="whitespace-nowrap"
          >
            <h2 className="text-5xl md:text-6xl font-light tracking-[0.2em]"
              style={{
                fontFamily: '"SF Pro Display", "Helvetica Neue", Arial, sans-serif',
                fontWeight: 300,
                letterSpacing: '0.2em',
                color: 'white',
                textShadow: '0 8px 32px rgba(31, 38, 135, 0.37), 0 2px 8px rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                WebkitTextStroke: '0.5px rgba(255, 255, 255, 0.3)',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              AI POWERED CONSULTING　　　　AI POWERED CONSULTING　　　　AI POWERED CONSULTING
            </h2>
          </motion.div>
        </div>
      </section>

      {/* Features Section - 未来を変える主な機能 */}
      <section id="features" className="py-24 px-4 relative bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-wide">
              <span className="text-blue-600 font-normal">3つの</span>コアサービス
            </h2>
            <p className="text-lg text-gray-600 font-light">
              戦略立案から実行まで、包括的にサポート
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
            {[
              {
                title: '戦略コンサルティング',
                description: 'データに基づく戦略立案と意思決定支援',
                image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
                number: '01'
              },
              {
                title: 'データインテリジェンス',
                description: '市場分析と競合分析による洞察提供',
                image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
                number: '02'
              },
              {
                title: '実行支援',
                description: '戦略実行のモニタリングと継続的改善',
                image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
                number: '03'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all group border border-gray-100"
              >
                <div className="relative h-64 overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage: `url(${feature.image})`
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <div className="text-6xl font-light text-white/30 mb-2">{feature.number}</div>
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-light text-gray-900 mb-3 tracking-wide">{feature.title}</h3>
                  <p className="text-gray-600 text-base font-light leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Point Section */}
      <section className="py-24 px-4 relative bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="relative">
                <div className="aspect-video rounded-2xl shadow-2xl overflow-hidden bg-black">
                  <video 
                    className="w-full h-full object-cover"
                    controls
                    loop
                    playsInline
                  >
                    <source src="/AI参謀：AIはコンサルをどう変えるか.mp4" type="video/mp4" />
                    お使いのブラウザは動画タグをサポートしていません。
                  </video>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-8 tracking-wide leading-tight">
                AIによる<br />
                <span className="text-blue-600 font-normal">経営課題の解決</span>
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed text-lg font-light">
                データ分析から戦略立案、実行支援まで。<br />
                経営の意思決定を、確かな根拠とともに。
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5 Steps Section */}
      <section id="steps" className="py-24 px-4 relative bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-wide leading-tight">
              <span className="text-blue-600 font-normal">5つのステップ</span>で<br />
              経営支援を実現
            </h2>
            <p className="text-lg text-gray-600 font-light">
              課題の特定から実行支援まで、体系的にサポート
            </p>
          </div>

          <div className="relative">
            {/* Animated rope behind cards */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 transform -translate-y-1/2 z-0" style={{ height: '120px' }}>
              <svg width="100%" height="120" viewBox="0 0 1200 120" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="ropeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="25%" stopColor="#60A5FA" />
                    <stop offset="50%" stopColor="#3B82F6" />
                    <stop offset="75%" stopColor="#60A5FA" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                  <filter id="ropeGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
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
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>

            <div className="grid md:grid-cols-5 gap-6 relative z-10">
              {[
              { 
                step: '1', 
                title: '課題の特定', 
                subtitle: 'ヒアリングと分析',
                description: '経営課題の本質を特定し、優先順位を明確化', 
                color: 'from-blue-500 to-blue-600',
                icon: MessageSquare
              },
              { 
                step: '2', 
                title: '現状分析', 
                subtitle: 'データの可視化',
                description: '業務とデータの現状を整理し、改善点を可視化', 
                color: 'from-indigo-500 to-indigo-600',
                icon: BarChart3
              },
              { 
                step: '3', 
                title: '戦略立案', 
                subtitle: 'ソリューション設計',
                description: 'データに基づく戦略を立案し、実行計画を策定', 
                color: 'from-blue-600 to-indigo-600',
                icon: Zap
              },
              { 
                step: '4', 
                title: '実行支援', 
                subtitle: '施策の実装',
                description: '戦略の実行をサポートし、進捗をモニタリング', 
                color: 'from-indigo-600 to-blue-700',
                icon: Target
              },
              { 
                step: '5', 
                title: '継続改善', 
                subtitle: '効果測定と最適化',
                description: '成果を測定し、継続的な改善サイクルを実現', 
                color: 'from-blue-700 to-indigo-700',
                icon: Brain
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-full hover:shadow-2xl transition-all group">
                  <div className={`bg-gradient-to-br ${item.color} p-8 text-center relative`}>
                    <svg width="0" height="0" style={{ position: 'absolute' }}>
                      <defs>
                        <filter id={`insetShadow${index}`}>
                          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                          <feOffset dx="0" dy="3" result="offsetblur"/>
                          <feFlood floodColor="rgba(0,0,0,0.5)"/>
                          <feComposite in2="offsetblur" operator="in"/>
                          <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                    </svg>
                    <div 
                      className="text-6xl font-bold text-white mb-4 relative"
                      style={{
                        animation: `numberFlow${index} 8s ease-in-out infinite`,
                        animationDelay: `${index * 1.6}s`
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
                    <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="p-6 bg-white">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm font-semibold text-blue-600 mb-3">{item.subtitle}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-12 shadow-xl">
              <h3 className="text-3xl md:text-4xl font-light mb-4 text-gray-900">貴社の課題もAIで解決できるだろうか？</h3>
              <p className="text-lg md:text-xl mb-8 text-gray-600 font-light leading-relaxed">
                まずは無料相談で、貴社の課題をお聞かせください。<br />
                最適なAIソリューションをご提案いたします。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-10 py-7 text-lg font-light rounded-xl shadow-lg hover:shadow-xl transition-all">
                    無料相談を予約する
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-10 py-7 text-lg font-light rounded-xl">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    サービス資料をダウンロード
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Business Value Section */}
      <section className="py-24 px-4 relative bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
              <span className="text-blue-600">AIの力を</span><br />
              貴社のビジネスに
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black">
                <video 
                  className="w-full h-full object-cover"
                  controls
                  loop
                  playsInline
                >
                  <source src="/video-1765885080626.mp4" type="video/mp4" />
                  お使いのブラウザは動画タグをサポートしていません。
                </video>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <p className="text-gray-600 mb-8 leading-relaxed text-lg font-light">
                AI技術を活用し、経営者の意思決定をサポートする次世代のコンサルティングサービス。貴社の具体的なニーズと目標を深く理解し、オーダーメイドのAI戦略を立案・実行します。
              </p>
              <div>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg font-light rounded-xl">
                    お問い合わせ
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-24 px-4 relative bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6">
              <span className="text-blue-600">確実なリターン</span>を実現する<br />
              AI導入の投資対効果
            </h2>
            <p className="text-lg text-gray-600 font-light leading-relaxed">
              AIコンサルティングは単なる技術導入に留まらず、<br />
              貴社の事業に具体的な財務的価値をもたらします
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                title: 'コスト削減', 
                description: 'AIによる業務自動化とリソース最適化により、運用コストを大幅に削減します。',
                icon: TrendingDown
              },
              { 
                title: '売上向上', 
                description: 'データに基づいた顧客行動予測とパーソナライズされた提案により、売上増加に貢献します。',
                icon: TrendingUp
              },
              { 
                title: '業務効率化', 
                description: '意思決定の迅速化とプロセス改善により、組織全体の生産性を向上させます。',
                icon: Zap
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                  <item.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-light text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed font-light">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

