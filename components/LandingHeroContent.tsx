import Link from "next/link";

export default function LandingHeroContent() {
  const features = [
    { title: "戦略立案", desc: "AIが、データ駆動型の意思決定を支援" },
    { title: "24時間対応", desc: "AIが、いつでも相談に対応" },
    { title: "実行支援", desc: "AIが、継続的にサポート" },
  ];

  return (
    <>
      {/* メインコンテンツ */}
      <div className="relative z-10 text-center">
        {/* タグライン */}
        <p className="text-sm md:text-base text-cyan-400/80 tracking-[0.3em] uppercase mb-6 font-medium">
          中小企業のためのAI経営コンサルティング
        </p>
        
        {/* メインコピー */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tight mb-4 drop-shadow-[0_0_60px_rgba(6,182,212,0.3)]">
          Think Next.
        </h1>

        {/* サブコピー */}
        <p className="text-lg md:text-2xl text-white/80 mb-12">
          AIがあなたの経営参謀になる時代へ
        </p>

        {/* CTAボタン */}
        <Link
          href="/auth/sign-up"
          className="
            group relative inline-flex flex-col items-center
            px-12 md:px-14 py-4 md:py-5
            bg-gradient-to-br from-cyan-400 to-cyan-500
            text-slate-900 rounded
            overflow-hidden no-underline
            transition-all duration-400
            hover:from-cyan-300 hover:to-cyan-400
            hover:shadow-[0_0_50px_rgba(6,182,212,0.7),0_0_100px_rgba(6,182,212,0.3)]
            hover:-translate-y-1
          "
        >
          {/* シャインエフェクト */}
          <span
            className="
              absolute top-0 -left-full w-full h-full
              bg-gradient-to-r from-transparent via-white/30 to-transparent
              transition-[left] duration-500
              group-hover:left-full
            "
          />

          {/* ボタンテキスト */}
          <span className="text-3xl md:text-4xl tracking-[5px] leading-none" style={{ fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif" }}>
            JOIN <span className="bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent">AI</span>
          </span>
          <span className="text-xs md:text-sm font-medium tracking-widest mt-1 opacity-80">
            AIを、武器に
          </span>
        </Link>

        {/* フィーチャーカード */}
        <div className="flex flex-col md:flex-row gap-5 md:gap-10 mt-12 md:mt-16 justify-center">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="
                px-8 py-6 rounded-lg
                bg-white/[0.03] backdrop-blur-md
                border border-white/5
                transition-all duration-300
                hover:bg-cyan-400/10 hover:border-cyan-400/30 hover:-translate-y-1
              "
            >
              <div className="text-xl font-bold text-white mb-2">
                {feature.title}
              </div>
              <div className="text-sm text-white/60">{feature.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ティッカー */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden bg-black/40 backdrop-blur-sm py-4 z-10">
        <div className="flex animate-ticker-scroll">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="text-2xl font-bold tracking-[8px] text-cyan-400/40 whitespace-nowrap pr-24"
            >
              AI POWERED CONSULTING
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

