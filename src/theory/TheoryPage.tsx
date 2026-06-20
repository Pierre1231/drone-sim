import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Menu, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { NAV, ALL_SECTION_IDS, type NavNode } from './nav'
import CoordinateSystem from './sections/CoordinateSystem'
import Kinematics from './sections/Kinematics'
import PropulsionAero from './sections/PropulsionAero'
import Allocation from './sections/Allocation'
import InputsSummary from './sections/InputsSummary'

export default function TheoryPage() {
  const [activeId, setActiveId] = useState(ALL_SECTION_IDS[0])
  const [width, setWidth] = useState(() => window.innerWidth)
  const [menuOpen, setMenuOpen] = useState(false)

  const showRight = width >= 1280
  const showLeftRail = width >= 1024

  // 跟随滚动高亮：取最后一个越过阈值线的标题
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        let current = ALL_SECTION_IDS[0]
        for (const id of ALL_SECTION_IDS) {
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

  const activeChapter = useMemo(
    () => NAV.find(n => n.id === activeId || n.children?.some(c => c.id === activeId)) ?? NAV[0],
    [activeId],
  )

  const go = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMenuOpen(false)
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <TopBar
        showHamburger={!showLeftRail}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(o => !o)}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        {/* 左栏导航 */}
        {showLeftRail && <LeftRail activeId={activeId} onGo={go} />}

        {/* 窄屏抽屉 */}
        {!showLeftRail && menuOpen && (
          <>
            <div style={scrimStyle} onClick={() => setMenuOpen(false)} />
            <LeftRail activeId={activeId} onGo={go} drawer />
          </>
        )}

        {/* 中栏正文 */}
        <main style={mainStyle}>
          <article style={{ maxWidth: 760, margin: '0 auto', padding: showLeftRail ? '40px 40px 120px' : '28px 20px 100px' }}>
            <DocHeader />
            <CoordinateSystem />
            <Kinematics />
            <PropulsionAero />
            <Allocation />
            <InputsSummary />
            <DocFooter />
          </article>
        </main>

        {/* 右栏 On this page */}
        {showRight && <RightRail chapter={activeChapter} activeId={activeId} onGo={go} />}
      </div>
    </div>
  )
}

/* ---------------- 顶栏 ---------------- */
function TopBar({
  showHamburger,
  menuOpen,
  onToggleMenu,
}: {
  showHamburger: boolean
  menuOpen: boolean
  onToggleMenu: () => void
}) {
  return (
    <header style={topBarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {showHamburger && (
          <button onClick={onToggleMenu} style={iconBtnStyle} aria-label="目录">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          四旋翼数学模型
        </span>
      </div>
      <a href="#/" style={backLinkStyle}>
        <ArrowLeft size={15} /> 返回仿真
      </a>
    </header>
  )
}

/* ---------------- 左栏 ---------------- */
function LeftRail({
  activeId,
  onGo,
  drawer = false,
}: {
  activeId: string
  onGo: (id: string) => void
  drawer?: boolean
}) {
  return (
    <aside style={drawer ? drawerStyle : leftRailStyle}>
      <div style={railLabelStyle}>目录</div>
      <nav>
        {NAV.map(node => (
          <NavGroup key={node.id} node={node} activeId={activeId} onGo={onGo} />
        ))}
      </nav>
    </aside>
  )
}

function NavGroup({ node, activeId, onGo }: { node: NavNode; activeId: string; onGo: (id: string) => void }) {
  const chapterActive = node.id === activeId || (node.children?.some(c => c.id === activeId) ?? false)
  return (
    <div style={{ marginBottom: 6 }}>
      <a
        href={`#/theory#${node.id}`}
        onClick={e => {
          e.preventDefault()
          onGo(node.id)
        }}
        style={{
          ...navChapterStyle,
          color: chapterActive ? 'var(--accent-primary)' : 'var(--text-primary)',
          background: node.id === activeId ? 'var(--accent-subtle)' : 'transparent',
        }}
      >
        <span style={navNumStyle}>{node.label}</span>
        {node.title}
      </a>
      {node.children && chapterActive && (
        <div style={{ margin: '2px 0 6px' }}>
          {node.children.map(child => {
            const active = child.id === activeId
            return (
              <a
                key={child.id}
                href={`#/theory#${child.id}`}
                onClick={e => {
                  e.preventDefault()
                  onGo(child.id)
                }}
                style={{
                  ...navChildStyle,
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderLeftColor: active ? 'var(--accent-primary)' : 'var(--border-default)',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {child.label}. {child.title}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---------------- 右栏 ---------------- */
function RightRail({ chapter, activeId, onGo }: { chapter: NavNode; activeId: string; onGo: (id: string) => void }) {
  const items = chapter.children ?? []
  return (
    <aside style={rightRailStyle}>
      <div style={railLabelStyle}>本节内容</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
        {chapter.label}. {chapter.title}
      </div>
      {items.length > 0 ? (
        items.map(item => {
          const active = item.id === activeId
          return (
            <a
              key={item.id}
              href={`#/theory#${item.id}`}
              onClick={e => {
                e.preventDefault()
                onGo(item.id)
              }}
              style={{
                ...tocItemStyle,
                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderLeftColor: active ? 'var(--accent-primary)' : 'transparent',
                fontWeight: active ? 700 : 500,
              }}
            >
              {item.title}
            </a>
          )
        })
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>本章无子节</div>
      )}
    </aside>
  )
}

/* ---------------- 文档头尾 ---------------- */
function DocHeader() {
  return (
    <div style={{ marginBottom: 44 }}>
      <div style={docEyebrowStyle}>建模文档</div>
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
const topBarStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  height: 56,
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid var(--border-default)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 var(--space-6)',
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

const iconBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: 8,
}

const leftRailStyle: CSSProperties = {
  position: 'sticky',
  top: 56,
  alignSelf: 'flex-start',
  width: 272,
  flexShrink: 0,
  height: 'calc(100vh - 56px)',
  overflowY: 'auto',
  padding: '28px 16px 40px 24px',
  borderRight: '1px solid var(--border-default)',
}

const drawerStyle: CSSProperties = {
  position: 'fixed',
  top: 56,
  left: 0,
  zIndex: 90,
  width: 280,
  height: 'calc(100vh - 56px)',
  overflowY: 'auto',
  padding: '24px 16px 40px 24px',
  background: 'var(--bg-surface)',
  borderRight: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-lg)',
}

const scrimStyle: CSSProperties = {
  position: 'fixed',
  inset: '56px 0 0 0',
  zIndex: 80,
  background: 'rgba(0,0,0,0.28)',
}

const rightRailStyle: CSSProperties = {
  position: 'sticky',
  top: 56,
  alignSelf: 'flex-start',
  width: 224,
  flexShrink: 0,
  height: 'calc(100vh - 56px)',
  overflowY: 'auto',
  padding: '32px 24px 40px 16px',
}

const mainStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
}

const railLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  marginBottom: 14,
}

const navChapterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 10px',
  fontSize: 14,
  fontWeight: 700,
  textDecoration: 'none',
  borderRadius: 6,
}

const navNumStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 22,
  fontSize: 11,
  fontWeight: 800,
  color: 'var(--text-secondary)',
}

const navChildStyle: CSSProperties = {
  display: 'block',
  padding: '5px 10px 5px 14px',
  marginLeft: 18,
  fontSize: 13,
  textDecoration: 'none',
  borderLeft: '2px solid var(--border-default)',
}

const tocItemStyle: CSSProperties = {
  display: 'block',
  padding: '5px 0 5px 12px',
  fontSize: 13,
  textDecoration: 'none',
  borderLeft: '2px solid transparent',
  lineHeight: 1.4,
}

const docEyebrowStyle: CSSProperties = {
  display: 'inline-flex',
  padding: '5px 12px',
  background: 'var(--accent-subtle)',
  color: 'var(--accent-primary)',
  fontSize: 12,
  fontWeight: 800,
  borderRadius: 999,
  marginBottom: 16,
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
