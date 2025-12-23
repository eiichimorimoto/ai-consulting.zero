import LandingHeroBackground from "./LandingHeroBackground";
import LandingHeroContent from "./LandingHeroContent";

export default function LandingHero() {
  return (
    <section className="hero relative min-h-screen flex flex-col justify-center items-center px-5 pt-24 pb-16 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <LandingHeroBackground />
      <LandingHeroContent />
    </section>
  );
}


