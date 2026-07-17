import { useRef, useState, useEffect, useCallback } from 'react'
import './LineSidebar.css'

type Falloff = 'linear' | 'smooth' | 'sharp'

const DEFAULT_ITEMS = [
  'Overview',
  'Components',
  'Animations',
  'Backgrounds',
  'Showcase',
  'Playground',
  'Templates',
  'Changelog',
  'Community',
  'Resources',
  'Documentation',
  'Support',
]

export interface LineSidebarProps {
  items?: string[]
  accentColor?: string
  textColor?: string
  markerColor?: string
  showIndex?: boolean
  showMarker?: boolean
  proximityRadius?: number
  maxShift?: number
  falloff?: Falloff
  markerLength?: number
  markerGap?: number
  tickScale?: number
  scaleTick?: boolean
  itemGap?: number
  fontSize?: number
  smoothing?: number
  defaultActive?: number | null
  /** Controlled active index. When provided, the component ignores its internal active state. */
  activeIndex?: number | null
  onItemClick?: (index: number, label: string) => void
  className?: string
  itemClassName?: (index: number, label: string) => string
}

export default function LineSidebar({
  items = DEFAULT_ITEMS,
  accentColor = '#A855F7',
  textColor = '#c4c4c4',
  markerColor = '#6c6c6c',
  showIndex = true,
  showMarker = true,
  proximityRadius: _proximityRadius = 100,
  maxShift = 30,
  falloff: _falloff = 'smooth',
  markerLength = 60,
  markerGap = 0,
  tickScale = 0.5,
  scaleTick = true,
  itemGap = 20,
  fontSize = 1.1,
  smoothing = 100,
  defaultActive = null,
  activeIndex: activeIndexProp,
  onItemClick,
  className = '',
  itemClassName,
}: LineSidebarProps) {
  const listRef = useRef<HTMLUListElement | null>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  const targetsRef = useRef<number[]>([])
  const currentRef = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  const isControlled = activeIndexProp !== undefined
  const [activeIndexState, setActiveIndexState] = useState<number | null>(defaultActive)
  const activeIndex = isControlled ? activeIndexProp : activeIndexState

  const smoothingRef = useRef(smoothing)

  smoothingRef.current = smoothing

  const runFrame = useCallback((now: number) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05)
    lastRef.current = now
    const tau = Math.max(smoothingRef.current, 1) / 1000
    const k = 1 - Math.exp(-dt / tau)

    let moving = false
    const itemElements = itemRefs.current
    for (let i = 0; i < itemElements.length; i++) {
      const el = itemElements[i]
      if (!el) continue
      const target = targetsRef.current[i] || 0
      const cur = currentRef.current[i] || 0
      const next = cur + (target - cur) * k
      const settled = Math.abs(target - next) < 0.0015
      const value = settled ? target : next
      currentRef.current[i] = value
      el.style.setProperty('--js-effect', value.toFixed(4))
      if (!settled) moving = true
    }

    rafRef.current = moving ? requestAnimationFrame(runFrame) : null
  }, [])

  const startLoop = useCallback(() => {
    if (rafRef.current != null) return
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(runFrame)
  }, [runFrame])

  const updateTargets = useCallback(
    (clientY: number) => {
      const itemElements = itemRefs.current
      for (let i = 0; i < itemElements.length; i++) {
        const el = itemElements[i]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        targetsRef.current[i] = clientY >= rect.top && clientY <= rect.bottom ? 1 : 0
      }
      startLoop()
    },
    [startLoop],
  )

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0)
    startLoop()
  }, [startLoop])

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const handleMove = (e: PointerEvent | MouseEvent) => updateTargets(e.clientY)
    const handleLeave = () => handlePointerLeave()

    list.addEventListener('pointermove', handleMove)
    list.addEventListener('mousemove', handleMove)
    list.addEventListener('pointerleave', handleLeave)
    list.addEventListener('mouseleave', handleLeave)

    return () => {
      list.removeEventListener('pointermove', handleMove)
      list.removeEventListener('mousemove', handleMove)
      list.removeEventListener('pointerleave', handleLeave)
      list.removeEventListener('mouseleave', handleLeave)
    }
  }, [handlePointerLeave, updateTargets])

  const handleClick = useCallback(
    (index: number, label: string) => {
      if (!isControlled) setActiveIndexState(index)
      onItemClick?.(index, label)
    },
    [isControlled, onItemClick],
  )

  useEffect(() => {
    startLoop()
  }, [activeIndex, startLoop])

  useEffect(() => {
    currentRef.current = items.map(() => 0)
    targetsRef.current = items.map(() => 0)
    itemRefs.current.forEach((el, index) => {
      el?.style.setProperty('--js-effect', (currentRef.current[index] || 0).toFixed(4))
    })
    startLoop()
  }, [items, startLoop])

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <nav
      className={`line-sidebar${showMarker ? ' line-sidebar--markers' : ''}${scaleTick ? ' line-sidebar--scale-tick' : ''}${className ? ` ${className}` : ''}`}
      style={{
        '--accent-color': accentColor,
        '--text-color': textColor,
        '--marker-color': markerColor,
        '--marker-length': `${markerLength}px`,
        '--marker-gap': `${markerGap}px`,
        '--tick-scale': tickScale,
        '--max-shift': `${maxShift}px`,
        '--item-gap': `${itemGap}px`,
        '--font-size': `${fontSize}rem`,
        '--smoothing': `${smoothing}ms`,
      } as React.CSSProperties}
    >
      <ul ref={listRef} className="line-sidebar__list">
        {items.map((label, index) => (
          <li
            key={`${label}-${index}`}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            className={`line-sidebar__item${itemClassName ? ` ${itemClassName(index, label)}` : ''}`}
            aria-current={activeIndex === index ? 'true' : undefined}
            onClick={() => handleClick(index, label)}
          >
            {showMarker && <span className="line-sidebar__marker" aria-hidden="true" />}
            <span className="line-sidebar__label">
              {showIndex && <span className="line-sidebar__index">{String(index + 1).padStart(2, '0')}</span>}
              <span className="line-sidebar__text">{label}</span>
            </span>
          </li>
        ))}
      </ul>
    </nav>
  )
}
