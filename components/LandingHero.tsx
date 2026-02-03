import LandingHeroBackground from "./LandingHeroBackground";
import LandingHeroContent from "./LandingHeroContent";

export default function LandingHero() {
  return (
    <section
      className="hero relative min-h-screen flex flex-col justify-center items-center px-5 pt-24 pb-16 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #1e293b 100%)',
      }}
    >
      {/* 背景画像（ごく薄く・ASCII名でVercel確実配信） */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.07]"
        style={{ backgroundImage: 'url(/lp-bg.jpg)' }}
      />
      {/* ネットワーク・星パターン（点と線） */}
      <LandingHeroBackground />
      <LandingHeroContent />
    </section>
  );
}


