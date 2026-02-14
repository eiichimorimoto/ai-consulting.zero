import Link from "next/link"

export default function LandingHeroContent() {
  const features = [
    { title: "戦略立案", desc: "AIが、データ駆動型の意思決定を支援" },
    { title: "24時間対応", desc: "AIが、いつでも相談に対応" },
    { title: "実行支援", desc: "AIが、継続的にサポート" },
  ]

  return (
    <>
      {/* メインコンテンツ */}
      <div className="relative z-10 text-center">
        {/* タグライン */}
        <p className="mb-6 text-sm font-medium uppercase tracking-[0.3em] text-cyan-400/80 md:text-base">
          中小企業のためのAI経営コンサルティング
        </p>

        {/* メインコピー */}
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_0_60px_rgba(6,182,212,0.3)] md:text-7xl lg:text-8xl">
          Think Next.
        </h1>

        {/* サブコピー */}
        <p className="mb-12 text-lg text-white/80 md:text-2xl">AIがあなたの経営参謀になる時代へ</p>

        {/* CTAボタン */}
        <Link
          href="/auth/sign-up"
          className="group relative inline-flex flex-col items-center overflow-hidden rounded bg-gradient-to-br from-cyan-400 to-cyan-500 px-12 py-4 text-slate-900 no-underline transition-all duration-400 hover:-translate-y-1 hover:from-cyan-300 hover:to-cyan-400 hover:shadow-[0_0_50px_rgba(6,182,212,0.7),0_0_100px_rgba(6,182,212,0.3)] md:px-14 md:py-5"
        >
          {/* シャインエフェクト */}
          <span className="absolute -left-full top-0 h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-[left] duration-500 group-hover:left-full" />

          {/* ボタンテキスト */}
          <span
            className="text-3xl leading-none tracking-[5px] md:text-4xl"
            style={{ fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif" }}
          >
            JOIN{" "}
            <span className="bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent">
              AI
            </span>
          </span>
          <span className="mt-1 text-xs font-medium tracking-widest opacity-80 md:text-sm">
            AIを、武器に
          </span>
        </Link>

        {/* フィーチャーカード */}
        <div className="mt-12 flex flex-col justify-center gap-5 md:mt-16 md:flex-row md:gap-10">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-white/5 bg-white/[0.03] px-8 py-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-cyan-400/10"
            >
              <div className="mb-2 text-xl font-bold text-white">{feature.title}</div>
              <div className="text-sm text-white/60">{feature.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ティッカー */}
      <div className="absolute bottom-0 left-0 z-10 w-full overflow-hidden bg-black/40 py-4 backdrop-blur-sm">
        <div className="flex animate-ticker-scroll">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="whitespace-nowrap pr-24 text-2xl font-bold tracking-[8px] text-cyan-400/40"
            >
              AI POWERED CONSULTING
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
