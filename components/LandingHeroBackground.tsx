"use client"

import { useEffect, useRef, useState } from "react"

// パーティクルの型定義
interface Particle {
  x: number
  y: number
  size: number
  baseX: number
  baseY: number
  density: number
  speedX: number
  speedY: number
  color: string
}

export default function LandingHeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, active: false })
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0, radius: 150 })
  const animationRef = useRef<number>(0)

  // パーティクルシステム
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const NUM_PARTICLES = 120
    const colors = [
      "rgba(6, 182, 212, ", // シアン
      "rgba(124, 58, 237, ", // パープル
      "rgba(34, 211, 238, ", // ライトシアン
      "rgba(255, 255, 255, ", // 白（星のように）
    ]

    // キャンバスリサイズ
    const resizeCanvas = () => {
      canvas.width = container.offsetWidth
      canvas.height = container.offsetHeight
      initParticles()
    }

    // パーティクル初期化
    const initParticles = () => {
      particlesRef.current = []
      for (let i = 0; i < NUM_PARTICLES; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
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
        })
      }
    }

    // パーティクル更新
    const updateParticle = (p: Particle) => {
      const mouse = mouseRef.current

      // マウスとの相互作用
      if (mouse.x && mouse.y) {
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius
          p.x += (dx / distance) * force * p.density * 0.5
          p.y += (dy / distance) * force * p.density * 0.5
        }
      }

      // 基本移動
      p.x += p.speedX
      p.y += p.speedY

      // 画面端でバウンス
      if (p.x < 0 || p.x > canvas.width) p.speedX *= -1
      if (p.y < 0 || p.y > canvas.height) p.speedY *= -1

      // 元の位置に戻る
      p.x += (p.baseX - p.x) * 0.01
      p.y += (p.baseY - p.y) * 0.01
    }

    // パーティクル描画（LPトップの光る点として視認性を上げる）
    const drawParticle = (p: Particle) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = p.color + "0.95)"
      ctx.fill()
    }

    // 接続線描画（ネットワーク状の線を明確に）
    const connectParticles = () => {
      const particles = particlesRef.current
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x
          const dy = particles[a].y - particles[b].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 140) {
            const opacity = (1 - distance / 140) * 0.5
            ctx.strokeStyle = `rgba(148, 163, 255, ${opacity})`
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.moveTo(particles[a].x, particles[a].y)
            ctx.lineTo(particles[b].x, particles[b].y)
            ctx.stroke()
          }
        }
      }
    }

    // アニメーションループ
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((p) => {
        updateParticle(p)
        drawParticle(p)
      })

      connectParticles()
      animationRef.current = requestAnimationFrame(animate)
    }

    // マウス移動ハンドラ
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
      setCursorPos({ x: e.clientX, y: e.clientY, active: true })
    }

    const handleMouseOut = () => {
      mouseRef.current.x = 0
      mouseRef.current.y = 0
      setCursorPos((prev) => ({ ...prev, active: false }))
    }

    // 初期化
    resizeCanvas()
    animate()

    // イベントリスナー
    window.addEventListener("resize", resizeCanvas)
    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("mouseout", handleMouseOut)

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener("resize", resizeCanvas)
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("mouseout", handleMouseOut)
    }
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/* 光線レイ */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-30">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <div
            key={deg}
            className="absolute left-1/2 top-1/2 w-0.5 origin-bottom animate-ray-pulse bg-gradient-to-t from-cyan-400/40 to-transparent"
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
      <div className="pointer-events-none absolute right-[5%] top-[5%] z-[1] h-[300px] w-[300px] animate-orb-pulse rounded-full bg-cyan-400/15 blur-[80px] md:h-[500px] md:w-[500px]" />
      <div
        className="pointer-events-none absolute bottom-[10%] left-[5%] z-[1] h-[250px] w-[250px] animate-orb-pulse rounded-full bg-violet-600/15 blur-[80px] md:h-[400px] md:w-[400px]"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 animate-orb-pulse-center rounded-full bg-cyan-300/10 blur-[80px] md:h-[300px] md:w-[300px]"
        style={{ animationDelay: "2s" }}
      />

      {/* マウスカーソルグロー */}
      <div
        className={`pointer-events-none fixed z-[3] hidden h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.15)_0%,transparent_70%)] transition-opacity duration-300 md:block ${cursorPos.active ? "opacity-100" : "opacity-0"} `}
        style={{
          left: cursorPos.x,
          top: cursorPos.y,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  )
}
