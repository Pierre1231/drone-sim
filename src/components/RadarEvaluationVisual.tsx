import { useEffect, useRef } from 'react'

interface RadarEvaluationVisualProps {
  values: number[]
  labels: string[]
}

export default function RadarEvaluationVisual({ values, labels }: RadarEvaluationVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    let width = 0
    let height = 0
    let frame = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height)
      const count = values.length
      const cx = width / 2
      const cy = height / 2
      const radius = Math.min(width, height) * .31
      const rotation = time * .00018
      const squash = .72 + Math.sin(time * .00035) * .06
      const point = (index: number, amount: number) => {
        const angle = rotation - Math.PI / 2 + index * Math.PI * 2 / count
        return { x: cx + Math.cos(angle) * radius * amount, y: cy + Math.sin(angle) * radius * amount * squash }
      }

      context.lineWidth = 1
      for (let ring = 1; ring <= 4; ring++) {
        context.strokeStyle = `rgba(217, 248, 255, ${.08 + ring * .025})`
        context.beginPath()
        for (let i = 0; i < count; i++) {
          const p = point(i, ring / 4)
          if (i) context.lineTo(p.x, p.y)
          else context.moveTo(p.x, p.y)
        }
        context.closePath()
        context.stroke()
      }

      for (let i = 0; i < count; i++) {
        const p = point(i, 1)
        context.strokeStyle = 'rgba(217, 248, 255, .18)'
        context.beginPath()
        context.moveTo(cx, cy)
        context.lineTo(p.x, p.y)
        context.stroke()
      }

      const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius)
      gradient.addColorStop(0, 'rgba(217, 248, 255, .32)')
      gradient.addColorStop(1, 'rgba(142, 231, 255, .1)')
      context.fillStyle = gradient
      context.strokeStyle = '#d9f8ff'
      context.lineWidth = 1.8
      context.shadowColor = '#8ee7ff'
      context.shadowBlur = 11
      context.beginPath()
      values.forEach((value, index) => {
        const p = point(index, Math.max(.08, Math.min(1, value)))
        if (index) context.lineTo(p.x, p.y)
        else context.moveTo(p.x, p.y)
      })
      context.closePath()
      context.fill()
      context.stroke()

      context.font = '700 14px system-ui, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      labels.forEach((label, index) => {
        const p = point(index, 1.28)
        context.fillStyle = 'rgba(217, 248, 255, .78)'
        context.shadowBlur = 0
        context.fillText(label, p.x, p.y)
      })
      context.shadowBlur = 0
      frame = requestAnimationFrame(draw)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [labels, values])

  return <canvas ref={canvasRef} className="sim-evaluation-radar" aria-label="任务评估动态雷达图" />
}
