import LandingHeroBackground from "./LandingHeroBackground"
import LandingHeroContent from "./LandingHeroContent"

export default function LandingHero() {
  return (
    <section
      className="hero relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 pb-16 pt-24"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #1e293b 100%)",
      }}
    >
      {/* 背景画像（薄めに表示・キャッシュバスティングでVercel確実配信） */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.18]"
        style={{
          backgroundImage: `url(/lp-bg.jpg)`,
        }}
      />
      {/* ネットワーク・星パターン（点と線） */}
      <LandingHeroBackground />
      <LandingHeroContent />
    </section>
  )
}
