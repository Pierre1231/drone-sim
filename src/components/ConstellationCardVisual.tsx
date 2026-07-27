import { useEffect, useRef } from 'react'

type ConstellationVariant = 'pid' | 'lqr' | 'mpc'

interface Point3D { x: number; y: number; z: number }
interface Shape { points: Point3D[]; edges: [number, number][] }

const SHAPES: Record<ConstellationVariant, Shape> = {
  pid: {
    points: [
      { x: -1.3, y: .7, z: -.2 }, { x: -.65, y: .15, z: .45 }, { x: 0, y: .75, z: 0 },
      { x: .65, y: .15, z: -.45 }, { x: 1.3, y: .7, z: .2 }, { x: 0, y: -.8, z: .15 },
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 3], [2, 5]],
  },
  lqr: {
    points: [
      { x: -1.05, y: .75, z: -.55 }, { x: 1.05, y: .75, z: -.55 }, { x: 1.05, y: -.7, z: -.55 },
      { x: -1.05, y: -.7, z: -.55 }, { x: -.65, y: .45, z: .75 }, { x: .65, y: .45, z: .75 },
      { x: .65, y: -.45, z: .75 }, { x: -.65, y: -.45, z: .75 }, { x: 0, y: 0, z: 1.15 },
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7], [4, 8], [5, 8], [6, 8], [7, 8]],
  },
  mpc: {
    points: Array.from({ length: 10 }, (_, i) => {
      const angle = i * Math.PI * .66
      const radius = .35 + i * .105
      return { x: Math.cos(angle) * radius, y: .92 - i * .2, z: Math.sin(angle) * radius }
    }),
    edges: Array.from({ length: 9 }, (_, i) => [i, i + 1] as [number, number]).concat([[0, 3], [3, 6], [6, 9]]),
  },
}

export default function ConstellationCardVisual({ variant }: { variant: ConstellationVariant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const shape = SHAPES[variant]
    const isLqr = variant === 'lqr'
    let frame = 0
    let width = 0
    let height = 0

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
      const ay = time * .00023 + (variant === 'lqr' ? .8 : variant === 'mpc' ? 1.6 : 0)
      const ax = Math.sin(time * .00016) * .22 - .12
      const scale = Math.min(width, height) * .34
      const projected = shape.points.map(point => {
        const x1 = point.x * Math.cos(ay) - point.z * Math.sin(ay)
        const z1 = point.x * Math.sin(ay) + point.z * Math.cos(ay)
        const y1 = point.y * Math.cos(ax) - z1 * Math.sin(ax)
        const z2 = point.y * Math.sin(ax) + z1 * Math.cos(ax)
        const perspective = 3.8 / (3.8 + z2)
        return { x: width * .55 + x1 * scale * perspective, y: height * .43 + y1 * scale * perspective, z: z2, p: perspective }
      })

      context.lineCap = 'round'
      for (const [a, b] of shape.edges) {
        const pa = projected[a]
        const pb = projected[b]
        const depth = Math.max(.28, Math.min(1, .72 - (pa.z + pb.z) * .12))
        const gradient = context.createLinearGradient(pa.x, pa.y, pb.x, pb.y)
        gradient.addColorStop(0, isLqr ? `rgba(197, 165, 255, ${depth})` : `rgba(142, 231, 255, ${depth})`)
        gradient.addColorStop(1, isLqr ? `rgba(255, 158, 210, ${depth * .8})` : `rgba(217, 248, 255, ${depth * .75})`)
        context.strokeStyle = gradient
        context.lineWidth = 1.15
        context.shadowColor = isLqr ? 'rgba(255, 158, 210, .85)' : 'rgba(108, 224, 255, .8)'
        context.shadowBlur = 7
        context.beginPath()
        context.moveTo(pa.x, pa.y)
        context.lineTo(pb.x, pb.y)
        context.stroke()
      }

      projected.forEach((point, index) => {
        const pulse = 1 + Math.sin(time * .002 + index * 1.7) * .18
        const radius = (2.1 + point.p * 1.25) * pulse
        context.fillStyle = index % 3 === 0 ? '#ffffff' : isLqr ? (index % 2 === 0 ? '#c5a5ff' : '#ff9ed2') : '#8ee7ff'
        context.shadowColor = isLqr ? '#ff9ed2' : '#8ee7ff'
        context.shadowBlur = 13
        context.beginPath()
        context.arc(point.x, point.y, radius, 0, Math.PI * 2)
        context.fill()
      })
      context.shadowBlur = 0
      frame = requestAnimationFrame(draw)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [variant])

  return <canvas ref={canvasRef} className="control-law-card__constellation" aria-hidden="true" />
}
