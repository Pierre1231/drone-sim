import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { CSSProperties } from 'react'
import { NAV } from './nav'
import LineSidebar from '../components/LineSidebar/LineSidebar'
import CoordinateSystem from './sections/CoordinateSystem'
import Kinematics from './sections/Kinematics'
import PropulsionAero from './sections/PropulsionAero'
import Allocation from './sections/Allocation'
import InputsSummary from './sections/InputsSummary'

const SIDEBAR_ENTRIES = NAV.map(node => ({
  id: node.id,
  label: `${node.label}. ${node.title}`,
}))

const SIDEBAR_ITEMS = SIDEBAR_ENTRIES.map(entry => entry.label)
const CHAPTER_SECTION_IDS = NAV.map(node => node.id)

export default function TheoryPage() {
  const [activeId, setActiveId] = useState(CHAPTER_SECTION_IDS[0])
  const [width, setWidth] = useState(() => window.innerWidth)
  const programmaticScrollTargetRef = useRef<string | null>(null)
  const programmaticScrollDeadlineRef = useRef(0)

  const showLeftRail = width >= 1024

  const activeSidebarIndex = useMemo(() => {
    const idx = SIDEBAR_ENTRIES.findIndex(entry => entry.id === activeId)
    return Math.max(0, idx)
  }, [activeId])

  // 跟随滚动高亮：目录只显示章节，因此只用 H2 章节锚点参与判断。
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const targetId = programmaticScrollTargetRef.current
        if (targetId) {
          const target = document.getElementById(targetId)
          const targetReached = target ? Math.abs(target.getBoundingClientRect().top - 76) < 32 : false
          const timedOut = performance.now() > programmaticScrollDeadlineRef.current
          if (!targetReached && !timedOut) return
          programmaticScrollTargetRef.current = null
        }

        let current = CHAPTER_SECTION_IDS[0]
        for (const id of CHAPTER_SECTION_IDS) {
          const el = document.getElementById(id)
          if (el && el.getBoundingClientRect().top <= 120) current = id
        }
        setActiveId(current)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const go = (id: string) => {
    const el = document.getElementById(id)
    programmaticScrollTargetRef.current = id
    programmaticScrollDeadlineRef.current = performance.now() + 2500
    setActiveId(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        {showLeftRail && (
          <aside className="theory-sidebar" style={leftRailStyle}>
            <LineSidebar
              items={SIDEBAR_ITEMS}
              accentColor="#2563eb"
              textColor="#64748b"
              markerColor="#94a3b8"
              showIndex={false}
              showMarker
              proximityRadius={100}
              maxShift={30}
              falloff="smooth"
              markerLength={60}
              markerGap={0}
              tickScale={0.5}
              scaleTick
              itemGap={13}
              fontSize={0.95}
              smoothing={260}
              activeIndex={activeSidebarIndex}
              className="theory-line-sidebar"
              itemClassName={() => 'line-sidebar__item--chapter'}
              onItemClick={(index) => go(SIDEBAR_ENTRIES[index].id)}
            />
          </aside>
        )}

        <main style={mainStyle}>
          <article style={{ width: '100%', maxWidth: 880, margin: '0 auto', padding: showLeftRail ? '40px 48px 120px' : '28px 20px 100px' }}>
            <DocHeader />
            <CoordinateSystem />
            <Kinematics />
            <PropulsionAero />
            <Allocation />
            <InputsSummary />
            <DocFooter />
          </article>
        </main>
      </div>
    </div>
  )
}

/* ---------------- 文档头尾 ---------------- */
function DocHeader() {
  return (
    <div style={{ marginBottom: 44 }}>
      <h1 style={docTitleStyle}>四旋翼数学模型</h1>
      <p style={docSubtitleStyle}>
        本页完整呈现四旋翼无人机从坐标系、刚体运动，到推进器、气动力、控制分配与输入变量的数学建模。
        所有公式、矩阵、参数定义与单位均与建模源文档一致；叙述文字按物理因果顺序重新组织，便于顺着读、随时查。
      </p>
    </div>
  )
}

function DocFooter() {
  return (
    <footer style={{ marginTop: 80, paddingTop: 24, borderTop: '1px solid var(--border-default)' }}>
      <a href="#/" style={backLinkStyle}>
        <ArrowLeft size={15} /> 返回仿真平台
      </a>
    </footer>
  )
}

/* ---------------- 样式 ---------------- */
const leftRailStyle: CSSProperties = {
  position: 'sticky',
  top: 56,
  alignSelf: 'flex-start',
  width: 380,
  flexShrink: 0,
  height: 'calc(100vh - 56px)',
  overflow: 'hidden',
  padding: '28px 20px 40px 28px',
}

const mainStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  justifyContent: 'center',
}

const docTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(30px, 4vw, 40px)',
  fontWeight: 800,
  lineHeight: 1.12,
  color: 'var(--text-primary)',
  margin: '0 0 16px',
  letterSpacing: '-0.02em',
}

const docSubtitleStyle: CSSProperties = {
  fontSize: 16.5,
  lineHeight: 1.75,
  color: 'var(--text-secondary)',
  margin: 0,
}

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 14px',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 8,
  border: '1px solid var(--border-default)',
}
