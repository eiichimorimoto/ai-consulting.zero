"use client";

import { useEffect, useRef, useState } from "react";

// パーティクルの型定義
interface Particle {
  x: number;
  y: number;
  size: number;
  baseX: number;
  baseY: number;
  density: number;
  speedX: number;
  speedY: number;
  color: string;
}

export default function LandingHeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, active: false });
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, radius: 150 });
  const animationRef = useRef<number>(0);

  // パーティクルシステム
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const NUM_PARTICLES = 80;
    const colors = [
      "rgba(6, 182, 212, ",   // シアン
      "rgba(124, 58, 237, ",  // パープル
      "rgba(34, 211, 238, ",  // ライトシアン
    ];

    // キャンバスリサイズ
    const resizeCanvas = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      initParticles();
    };

    // パーティクル初期化
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < NUM_PARTICLES; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particlesRef.current.push({
          x,
          y,
          size: Math.random() * 3 + 1,
          baseX: x,
          baseY: y,
          density: Math.random() * 30 + 1,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    // パーティクル更新
    const updateParticle = (p: Particle) => {
      const mouse = mouseRef.current;

      // マウスとの相互作用
      if (mouse.x && mouse.y) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          p.x += (dx / distance) * force * p.density * 0.5;
          p.y += (dy / distance) * force * p.density * 0.5;
        }
      }

      // 基本移動
      p.x += p.speedX;
      p.y += p.speedY;

      // 画面端でバウンス
      if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
      if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

      // 元の位置に戻る
      p.x += (p.baseX - p.x) * 0.01;
      p.y += (p.baseY - p.y) * 0.01;
    };

    // パーティクル描画
    const drawParticle = (p: Particle) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color + "0.8)";
      ctx.fill();
    };

    // 接続線描画
    const connectParticles = () => {
      const particles = particlesRef.current;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            const opacity = (1 - distance / 120) * 0.3;
            ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    // アニメーションループ
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        updateParticle(p);
        drawParticle(p);
      });

      connectParticles();
      animationRef.current = requestAnimationFrame(animate);
    };

    // マウス移動ハンドラ
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      setCursorPos({ x: e.clientX, y: e.clientY, active: true });
    };

    const handleMouseOut = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
      setCursorPos((prev) => ({ ...prev, active: false }));
    };

    // 初期化
    resizeCanvas();
    animate();

    // イベントリスナー
    window.addEventListener("resize", resizeCanvas);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseout", handleMouseOut);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/* 光線レイ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30 pointer-events-none z-[1]">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <div
            key={deg}
            className="absolute top-1/2 left-1/2 w-0.5 bg-gradient-to-t from-cyan-400/40 to-transparent origin-bottom animate-ray-pulse"
            style={{
              transform: `rotate(${deg}deg)`,
              animationDelay: `${i}s`,
            }}
          />
        ))}
      </div>

      {/* パーティクルキャンバス */}
      <canvas ref={canvasRef} className="absolute inset-0 z-[2]" />

      {/* グローオーブ */}
      <div className="absolute top-[5%] right-[5%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full bg-cyan-400/15 blur-[80px] animate-orb-pulse pointer-events-none z-[1]" />
      <div
        className="absolute bottom-[10%] left-[5%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] rounded-full bg-violet-600/15 blur-[80px] animate-orb-pulse pointer-events-none z-[1]"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] md:w-[300px] h-[200px] md:h-[300px] rounded-full bg-cyan-300/10 blur-[80px] animate-orb-pulse-center pointer-events-none z-[1]"
        style={{ animationDelay: "2s" }}
      />

      {/* マウスカーソルグロー */}
      <div
        className={`
          fixed w-[300px] h-[300px] rounded-full pointer-events-none z-[3]
          bg-[radial-gradient(circle,rgba(6,182,212,0.15)_0%,transparent_70%)]
          transition-opacity duration-300 hidden md:block
          ${cursorPos.active ? "opacity-100" : "opacity-0"}
        `}
        style={{
          left: cursorPos.x,
          top: cursorPos.y,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}




