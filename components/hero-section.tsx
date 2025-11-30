import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center justify-center overflow-hidden pt-16">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/humanoid-ai-robot-presenting-holographic-data-char.jpg')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/60 to-slate-900/80" />
      </div>

      {/* Left Catchphrase */}
      <div className="absolute left-4 lg:left-12 top-1/2 -translate-y-1/2 hidden md:block">
        <div className="text-white text-sm lg:text-base font-medium tracking-wide text-left space-y-1">
          <p>人を超える洞察力で</p>
          <p>経営を次のステージへ</p>
        </div>
      </div>

      {/* Right Catchphrase */}
      <div className="absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 hidden md:block">
        <div className="text-white text-sm lg:text-base font-medium tracking-wide text-right space-y-1">
          <p>24時間365日</p>
          <p>あなたの会社専属の</p>
          <p>AIコンサルタント</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="font-display text-white text-4xl md:text-6xl lg:text-7xl font-bold tracking-widest mb-12 drop-shadow-lg">
          AI POWERED CONSULTING
        </h1>

        {/* Holographic UI Element */}
        <div className="relative my-8">
          <div className="w-full max-w-2xl mx-auto h-48 relative">
            {/* Floating holographic interface */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Main holographic panel */}
                <div className="w-64 h-32 bg-gradient-to-br from-blue-500/20 to-cyan-400/10 border border-blue-400/30 rounded-lg backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-blue-300 text-sm">AIアドバイザー</span>
                    </div>
                    <div className="w-32 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto" />
                  </div>
                </div>

                {/* Side panels */}
                <div className="absolute -left-20 top-4 w-16 h-20 bg-gradient-to-br from-cyan-500/15 to-blue-400/10 border border-cyan-400/20 rounded backdrop-blur-sm" />
                <div className="absolute -right-20 top-4 w-16 h-20 bg-gradient-to-br from-blue-500/15 to-indigo-400/10 border border-blue-400/20 rounded backdrop-blur-sm" />

                {/* Floating elements */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-24 h-6 bg-gradient-to-r from-blue-500/20 to-cyan-400/20 border border-blue-400/30 rounded-full flex items-center justify-center">
                  <span className="text-xs text-blue-300">分析中...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-6 text-base">
            無料でAIに相談してみる
          </Button>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-base bg-transparent"
          >
            サービス資料をダウンロード
          </Button>
        </div>
      </div>
    </section>
  )
}
