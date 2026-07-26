import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  radius: number
  opacity: number
  phase: number
  twinkle: number
  vx: number
  vy: number
}

export default function SelectionStarfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let width = 0
    let height = 0
    let stars: Star[] = []
    let animationFrame = 0
    let previousTime = performance.now()

    const makeStar = (): Star => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: .35 + Math.random() * 1.35,
      opacity: .22 + Math.random() * .68,
      phase: Math.random() * Math.PI * 2,
      twinkle: .55 + Math.random() * 1.8,
      vx: -1.8 + Math.random() * 3.6,
      vy: -1 + Math.random() * 2,
    })

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = Array.from({ length: Math.max(90, Math.round(width * height / 8500)) }, makeStar)
    }

    const draw = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, .05)
      previousTime = time
      context.clearRect(0, 0, width, height)

      for (const star of stars) {
        star.x += star.vx * delta
        star.y += star.vy * delta
        if (star.x < -3) star.x = width + 3
        if (star.x > width + 3) star.x = -3
        if (star.y < -3) star.y = height + 3
        if (star.y > height + 3) star.y = -3

        const flicker = .55 + Math.sin(time * .001 * star.twinkle + star.phase) * .35
        const alpha = Math.max(.08, star.opacity * flicker)
        const glow = context.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 3.5)
        glow.addColorStop(0, `rgba(224, 248, 255, ${alpha})`)
        glow.addColorStop(.28, `rgba(151, 220, 255, ${alpha * .55})`)
        glow.addColorStop(1, 'rgba(105, 194, 255, 0)')
        context.fillStyle = glow
        context.beginPath()
        context.arc(star.x, star.y, star.radius * 3.5, 0, Math.PI * 2)
        context.fill()
      }
      animationFrame = requestAnimationFrame(draw)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()
    animationFrame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="selection-starfield" aria-hidden="true" />
}
