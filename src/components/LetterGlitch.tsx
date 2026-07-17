import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

interface RGB {
  r: number
  g: number
  b: number
}

interface GlitchLetter {
  char: string
  color: RGB
  startColor: RGB
  targetColor: RGB
  colorProgress: number
  active: boolean
}

export interface LetterGlitchProps {
  glitchColors?: string[]
  className?: string
  glitchSpeed?: number
  centerVignette?: boolean
  outerVignette?: boolean
  smooth?: boolean
  characters?: string
  /** Optional silhouette mask: letters are only rendered inside the shape. */
  mask?: 'quadcopter'
  backgroundColor?: string
}

const DEFAULT_COLORS = ['#2b4539', '#61dca3', '#61b3dc']
const DEFAULT_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789'

const FONT_SIZE = 16
const CHAR_WIDTH = 10
const CHAR_HEIGHT = 20

function hexToRgb(hex: string): RGB | null {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  const normalized = hex.replace(shorthandRegex, (_m, r, g, b) => r + r + g + g + b + b)
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function rgbToString({ r, g, b }: RGB): string {
  return `rgb(${r}, ${g}, ${b})`
}

function interpolateColor(start: RGB, end: RGB, factor: number): RGB {
  return {
    r: Math.round(start.r + (end.r - start.r) * factor),
    g: Math.round(start.g + (end.g - start.g) * factor),
    b: Math.round(start.b + (end.b - start.b) * factor),
  }
}

/** Center of the silhouette in canvas (CSS pixel) coordinates. */
function getSilhouetteCenter(width: number, height: number) {
  return {
    x: width >= 820 ? width * 0.64 : width * 0.5,
    y: height * 0.45,
  }
}

/**
 * Top-view silhouette of an X-configuration quadcopter: four propeller
 * discs on diagonal arms around a rounded center body. Drawn solid black
 * into an offscreen mask canvas, then sampled once per letter cell.
 */
function drawQuadcopterSilhouette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const s = Math.min(width, height)
  const { x: cx, y: cy } = getSilhouetteCenter(width, height)
  const motorDistance = s * 0.36
  const propRadius = s * 0.17
  const motorRadius = s * 0.05

  const motors = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((angle) => ({
    x: cx + Math.cos(angle) * motorDistance,
    y: cy + Math.sin(angle) * motorDistance,
  }))

  ctx.fillStyle = '#000000'
  ctx.strokeStyle = '#000000'

  // Propeller discs
  for (const motor of motors) {
    ctx.beginPath()
    ctx.arc(motor.x, motor.y, propRadius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Arms
  ctx.lineWidth = s * 0.06
  ctx.lineCap = 'round'
  for (const motor of motors) {
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(motor.x, motor.y)
    ctx.stroke()
  }

  // Motor hubs
  for (const motor of motors) {
    ctx.beginPath()
    ctx.arc(motor.x, motor.y, motorRadius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Center body
  const bodyWidth = s * 0.34
  const bodyHeight = s * 0.2
  ctx.beginPath()
  ctx.roundRect(cx - bodyWidth / 2, cy - bodyHeight / 2, bodyWidth, bodyHeight, s * 0.05)
  ctx.fill()
}

export default function LetterGlitch({
  glitchColors = DEFAULT_COLORS,
  className = '',
  glitchSpeed = 50,
  centerVignette = false,
  outerVignette = true,
  smooth = true,
  characters = DEFAULT_CHARACTERS,
  mask,
  backgroundColor = '#000000',
}: LetterGlitchProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const palette = glitchColors.map(hexToRgb).filter((c): c is RGB => c !== null)
    if (palette.length === 0) return
    const charSet = Array.from(characters)

    let letters: GlitchLetter[] = []
    let grid = { columns: 0, rows: 0 }
    let activeIndices: number[] = []
    let animationId = 0
    let lastGlitchTime = Date.now()
    let resizeTimeout: ReturnType<typeof setTimeout> | undefined

    const getRandomChar = () => charSet[Math.floor(Math.random() * charSet.length)]
    const getRandomColor = () => palette[Math.floor(Math.random() * palette.length)]

    const buildMask = (columns: number, rows: number, width: number, height: number): Uint8Array | null => {
      if (mask !== 'quadcopter') return null
      const maskCanvas = document.createElement('canvas')
      maskCanvas.width = Math.max(1, Math.round(width))
      maskCanvas.height = Math.max(1, Math.round(height))
      const maskContext = maskCanvas.getContext('2d')
      if (!maskContext) return null
      drawQuadcopterSilhouette(maskContext, maskCanvas.width, maskCanvas.height)
      const pixels = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data
      const active = new Uint8Array(columns * rows)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const px = Math.min(maskCanvas.width - 1, Math.floor(col * CHAR_WIDTH + CHAR_WIDTH / 2))
          const py = Math.min(maskCanvas.height - 1, Math.floor(row * CHAR_HEIGHT + CHAR_HEIGHT / 2))
          active[row * columns + col] = pixels[(py * maskCanvas.width + px) * 4 + 3] > 128 ? 1 : 0
        }
      }
      return active
    }

    const drawLetters = () => {
      if (letters.length === 0) return
      const { width, height } = canvas.getBoundingClientRect()
      context.clearRect(0, 0, width, height)
      context.font = `${FONT_SIZE}px monospace`
      context.textBaseline = 'top'
      letters.forEach((letter, index) => {
        if (!letter.active) return
        const x = (index % grid.columns) * CHAR_WIDTH
        const y = Math.floor(index / grid.columns) * CHAR_HEIGHT
        context.fillStyle = rgbToString(letter.color)
        context.fillText(letter.char, x, y)
      })
    }

    const initializeLetters = (columns: number, rows: number, active: Uint8Array | null) => {
      grid = { columns, rows }
      const totalLetters = columns * rows
      activeIndices = []
      letters = Array.from({ length: totalLetters }, (_, index) => {
        const color = getRandomColor()
        const isActive = active ? active[index] === 1 : true
        if (isActive) activeIndices.push(index)
        return {
          char: getRandomChar(),
          color,
          startColor: color,
          targetColor: color,
          colorProgress: 1,
          active: isActive,
        }
      })
    }

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      const rect = parent.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      const columns = Math.ceil(rect.width / CHAR_WIDTH)
      const rows = Math.ceil(rect.height / CHAR_HEIGHT)
      const active = buildMask(columns, rows, rect.width, rect.height)
      initializeLetters(columns, rows, active)
      drawLetters()
    }

    const updateLetters = () => {
      if (activeIndices.length === 0) return
      const updateCount = Math.max(1, Math.floor(activeIndices.length * 0.05))
      for (let i = 0; i < updateCount; i++) {
        const letter = letters[activeIndices[Math.floor(Math.random() * activeIndices.length)]]
        if (!letter) continue
        letter.char = getRandomChar()
        letter.targetColor = getRandomColor()
        if (!smooth) {
          letter.color = letter.targetColor
          letter.startColor = letter.targetColor
          letter.colorProgress = 1
        } else {
          letter.startColor = letter.color
          letter.colorProgress = 0
        }
      }
    }

    const handleSmoothTransitions = () => {
      let needsRedraw = false
      for (const letter of letters) {
        if (letter.colorProgress < 1) {
          letter.colorProgress = Math.min(1, letter.colorProgress + 0.05)
          letter.color = interpolateColor(letter.startColor, letter.targetColor, letter.colorProgress)
          needsRedraw = true
        }
      }
      if (needsRedraw) drawLetters()
    }

    const animate = () => {
      const now = Date.now()
      if (now - lastGlitchTime >= glitchSpeed) {
        updateLetters()
        drawLetters()
        lastGlitchTime = now
      }
      if (smooth) handleSmoothTransitions()
      animationId = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        cancelAnimationFrame(animationId)
        resizeCanvas()
        animationId = requestAnimationFrame(animate)
      }, 100)
    }

    resizeCanvas()
    animationId = requestAnimationFrame(animate)
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      clearTimeout(resizeTimeout)
      window.removeEventListener('resize', handleResize)
    }
  }, [glitchColors, glitchSpeed, smooth, characters, mask])

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor,
    overflow: 'hidden',
  }

  const canvasStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%',
  }

  const outerVignetteStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 100%)',
  }

  const centerVignetteStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)',
  }

  return (
    <div style={containerStyle} className={className}>
      <canvas ref={canvasRef} style={canvasStyle} />
      {outerVignette && <div style={outerVignetteStyle} />}
      {centerVignette && <div style={centerVignetteStyle} />}
    </div>
  )
}
