'use client'

import { useEffect, useRef } from 'react'

interface ChartData {
  value: number
  week: string
}

interface LineChartProps {
  canvasId: string
  tooltipId: string
  data: ChartData[]
  options?: {
    lineColor?: string
    unit?: string
    prefix?: string
  }
}

export function LineChart({ canvasId, tooltipId, data, options = {} }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const pointsRef = useRef<Array<{ x: number; y: number; value: number; week: string }>>([])

  const opts = {
    lineColor: options.lineColor || '#6366F1',
    unit: options.unit || '',
    prefix: options.prefix || '',
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const tooltip = tooltipRef.current
    if (!canvas || !tooltip) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.scale(dpr, dpr)
    }

    const draw = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      const width = rect.width
      const height = rect.height

      ctx.clearRect(0, 0, width, height)
      const padding = { top: 8, right: 8, bottom: 8, left: 8 }
      const chartWidth = width - padding.left - padding.right
      const chartHeight = height - padding.top - padding.bottom
      const minVal = Math.min(...data.map(d => d.value)) * 0.995
      const maxVal = Math.max(...data.map(d => d.value)) * 1.005
      const range = maxVal - minVal || 1

      pointsRef.current = data.map((d, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((d.value - minVal) / range) * chartHeight,
        value: d.value,
        week: d.week,
      }))

      // Gradient
      const gradient = ctx.createLinearGradient(0, padding.top, 0, height)
      gradient.addColorStop(0, opts.lineColor + '30')
      gradient.addColorStop(1, opts.lineColor + '00')

      ctx.beginPath()
      ctx.moveTo(pointsRef.current[0].x, height)
      pointsRef.current.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.lineTo(pointsRef.current[pointsRef.current.length - 1].x, height)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()

      // Line
      ctx.beginPath()
      ctx.moveTo(pointsRef.current[0].x, pointsRef.current[0].y)
      pointsRef.current.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.strokeStyle = opts.lineColor
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.stroke()

      // Points
      pointsRef.current.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.strokeStyle = opts.lineColor
        ctx.lineWidth = 1.5
        ctx.stroke()
      })
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      let closest: { x: number; y: number; value: number; week: string } | null = null
      let closestDist = Infinity

      pointsRef.current.forEach(p => {
        const dist = Math.abs(p.x - x)
        if (dist < closestDist && dist < 30) {
          closestDist = dist
          closest = p
        }
      })

      if (closest && tooltip) {
        const tooltipValue = tooltip.querySelector('.tooltip-value')
        const tooltipWeek = tooltip.querySelector('.tooltip-week')
        if (tooltipValue) {
          tooltipValue.textContent = opts.prefix + closest.value.toLocaleString() + opts.unit
        }
        if (tooltipWeek) {
          tooltipWeek.textContent = closest.week
        }
        tooltip.style.left = Math.min(closest.x, rect.width - 60) + 'px'
        tooltip.style.top = (closest.y - 35) + 'px'
        tooltip.classList.add('visible')
        draw()
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.beginPath()
          ctx.arc(closest.x, closest.y, 4, 0, Math.PI * 2)
          ctx.fillStyle = opts.lineColor
          ctx.fill()
        }
      } else if (tooltip) {
        tooltip.classList.remove('visible')
      }
    }

    const handleMouseLeave = () => {
      if (tooltip) {
        tooltip.classList.remove('visible')
      }
      draw()
    }

    resize()
    draw()
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('resize', () => {
      resize()
      draw()
    })

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('resize', () => {
        resize()
        draw()
      })
    }
  }, [data, opts.lineColor, opts.unit, opts.prefix])

  return (
    <>
      <canvas ref={canvasRef} className="chart-canvas" id={canvasId} />
      <div ref={tooltipRef} className="chart-tooltip" id={tooltipId}>
        <div className="tooltip-value"></div>
        <div className="tooltip-week"></div>
      </div>
    </>
  )
}

export function IndustryChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.scale(dpr, dpr)

      const width = rect.width
      const height = rect.height
      const padding = { top: 15, right: 15, bottom: 25, left: 15 }
      const chartWidth = width - padding.left - padding.right
      const chartHeight = height - padding.top - padding.bottom

      const domesticData = [98, 100, 99, 102, 101, 104, 103, 104.2]
      const exportData = [95, 97, 99, 98, 102, 105, 106, 107.8]
      const allValues = [...domesticData, ...exportData]
      const minVal = Math.min(...allValues) * 0.98
      const maxVal = Math.max(...allValues) * 1.02
      const range = maxVal - minVal

      const getPoints = (data: number[]) => {
        return data.map((v, i) => ({
          x: padding.left + (i / (data.length - 1)) * chartWidth,
          y: padding.top + chartHeight - ((v - minVal) / range) * chartHeight,
        }))
      }

      const domesticPoints = getPoints(domesticData)
      const exportPoints = getPoints(exportData)

      // Grid
      ctx.strokeStyle = '#E2E8F0'
      ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight / 4) * i
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(width - padding.right, y)
        ctx.stroke()
      }

      // Lines
      const lines = [
        { points: domesticPoints, color: '#6366F1' },
        { points: exportPoints, color: '#06B6D4' },
      ]

      lines.forEach(({ points, color }) => {
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        points.forEach(p => ctx.lineTo(p.x, p.y))
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.stroke()

        points.forEach(p => {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'
          ctx.fill()
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.stroke()
        })
      })

      // Labels
      ctx.fillStyle = '#94A3B8'
      ctx.font = '9px Inter'
      ctx.textAlign = 'center'
      const labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']
      labels.forEach((label, i) => {
        if (i % 2 === 0 || i === 7) {
          ctx.fillText(label, domesticPoints[i].x, height - 6)
        }
      })
    }

    draw()
    window.addEventListener('resize', draw)

    return () => {
      window.removeEventListener('resize', draw)
    }
  }, [])

  return <canvas ref={canvasRef} id="industryChart" />
}

