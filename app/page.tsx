'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Brain, TrendingUp, Users, Zap, BarChart3, FileText, MessageSquare, Target, Lightbulb, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>

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
            className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
          >
            貴社の課題を
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              未来の力で解決
            </span>
            する
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-300 mb-4"
          >
            最先端の人工知能技術を駆使して、ビジネスのあらゆる側面に革新をもたらします。
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-lg text-gray-400 mb-12"
          >
            データ分析の高度化から業務プロセスの自動化、顧客体験の向上まで。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all"
              >
                無料で始める
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-blue-400/50 text-white hover:bg-blue-500/10 px-8 py-6 text-lg font-semibold rounded-xl backdrop-blur-sm"
              >
                資料をダウンロード
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="grid grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">10,000+</div>
              <div className="text-sm text-gray-400">利用企業数</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">98%</div>
              <div className="text-sm text-gray-400">満足度</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-sm text-gray-400">サポート</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - 未来を変える主な機能 */}
      <section className="py-24 px-4 relative bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              未来を変える<br />主な機能
            </h2>
            <p className="text-lg text-gray-600">
              AIが24時間365日、あなたのビジネスをサポート。<br />
              最先端の技術で、経営の課題を解決します。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: '24時間AI相談窓口',
                description: 'いつでもどこでも、AIコンサルタントに相談できます。深夜でも休日でも、即座に回答。',
                image: '/info-data/feature1.jpg'
              },
              {
                icon: BarChart3,
                title: '高精度AI市場予測',
                description: '膨大なデータを分析し、市場トレンドを予測。先手を打つ戦略立案をサポート。',
                image: '/info-data/feature2.jpg'
              },
              {
                icon: FileText,
                title: 'AI資料作成支援',
                description: '提案書や報告書を自動生成。時間を大幅に削減し、クオリティを向上。',
                image: '/info-data/feature3.jpg'
              },
              {
                icon: Target,
                title: '競合他社分析',
                description: '競合の動向を自動収集・分析。差別化戦略の立案をサポート。',
                image: '/info-data/feature4.jpg'
              },
              {
                icon: Brain,
                title: 'ビジネス戦略',
                description: 'データに基づいた戦略提案。経営判断の精度を飛躍的に向上。',
                image: '/info-data/feature5.jpg'
              },
              {
                icon: Lightbulb,
                title: 'マイナビAI予測',
                description: '人材市場のトレンドを予測。最適な採用戦略を提案。',
                image: '/info-data/feature6.jpg'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all group"
              >
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <feature.icon className="w-20 h-20 text-white/30" />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
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
                <div className="aspect-video bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="w-32 h-32 text-white/30" />
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                ポイント人材派遣の壁を越える<br />
                経営の課題を解決
              </h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                中小企業が直面する「人材不足」「コスト増」「ノウハウ不足」の3つの壁。
                これらの課題をAIが解決します。24時間365日稼働するAIコンサルタントが、
                あなたのビジネスを次のステージへ導きます。
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700">人材コストを最大70%削減</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700">24時間365日、休まず稼働</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700">専門知識を即座に提供</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5 Steps Section */}
      <section className="py-24 px-4 relative bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              未来の力で解決する<br />
              AIによる経営支援の5つのステップ
            </h2>
            <p className="text-lg text-gray-600">
              シンプルな5ステップで、あなたのビジネスを変革します
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {[
              { step: '1', title: '初回登録', description: '簡単な情報入力で、すぐに利用開始', color: 'from-blue-500 to-blue-600' },
              { step: '2', title: '課題の共有', description: 'AIに現在の課題を相談', color: 'from-purple-500 to-purple-600' },
              { step: '3', title: 'AI分析と提案', description: 'データを分析し、最適な戦略を提案', color: 'from-green-500 to-green-600' },
              { step: '4', title: 'ハンズオン支援', description: '実行フェーズでも継続サポート', color: 'from-orange-500 to-orange-600' },
              { step: '5', title: '継続的改善', description: '結果を分析し、さらなる改善を提案', color: 'from-pink-500 to-pink-600' }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className={`bg-gradient-to-br ${item.color} rounded-xl p-6 text-white shadow-lg h-full`}>
                  <div className="text-4xl font-bold mb-4 opacity-50">{item.step}</div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-white/90">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">今すぐ無料で始めませんか？</h3>
              <p className="mb-6">初期費用0円。まずは無料トライアルでAIの力を体験してください。</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-xl">
                    無料で始める
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-xl">
                    料金プランを見る
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Business Value Section */}
      <section className="py-24 px-4 relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                AIの導入の壁を越える<br />
                貴社のビジネスに活きる
              </h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                「AIは難しい」「コストが高い」「使いこなせない」——
                そんな不安を解消します。SolveWiseは、専門知識不要で、
                誰でも簡単にAIの力を活用できるプラットフォームです。
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">セキュリティ万全</h4>
                    <p className="text-gray-400 text-sm">企業データを安全に保護</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">即座に導入可能</h4>
                    <p className="text-gray-400 text-sm">複雑な設定は一切不要</p>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="relative">
                <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl border border-blue-400/20 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brain className="w-32 h-32 text-white/20" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-24 px-4 relative bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              理想なリターンを教育で示す<br />
              AI導入による投資対効果
            </h2>
            <p className="text-lg text-gray-600">
              導入企業の平均ROI（投資対効果）は300%以上
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { title: '時間削減', value: '70%', description: '業務時間を大幅削減', icon: '⏱️' },
              { title: 'コスト削減', value: '50%', description: '人件費・運用コスト削減', icon: '💰' },
              { title: '売上向上', value: '150%', description: '売上が平均1.5倍に', icon: '📈' },
              { title: '満足度', value: '98%', description: '顧客満足度', icon: '⭐' }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center"
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="text-4xl font-bold text-blue-600 mb-2">{item.value}</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              成長の経営リターンとして<br />
              すぐに使える名言
            </h2>
            <p className="text-xl text-white/90 mb-8">
              「変化を恐れるな。変化こそが成長の源泉である」
            </p>
            <p className="text-lg text-white/80 mb-12">
              今すぐAIの力で、あなたのビジネスを次のステージへ
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/sign-up">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-7 text-xl font-bold rounded-xl shadow-xl">
                  無料トライアルを始める
                  <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
