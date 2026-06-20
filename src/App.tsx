import { ChevronDown } from 'lucide-react'
import ConfigPanel from '@/components/ConfigPanel'
import PlaybackPanel from '@/components/PlaybackPanel'
import DataPanel from '@/components/DataPanel'

function App() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Header />
      <Hero />
      <ConfigPanel />
      <PlaybackSection />
      <DataSection />
      <Footer />
    </div>
  )
}

function Header() {
  const links = [
    { label: '配置', href: '#config' },
    { label: '回放', href: '#playback' },
    { label: '数据', href: '#data' },
    { label: '原理', href: '#/theory' },
  ]

  return (
    <header style={headerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>DroneSim</h1>
      </div>
      <nav style={{ display: 'flex', gap: 4 }}>
        {links.map(item => (
          <a key={item.href} href={item.href} style={navLinkStyle}>{item.label}</a>
        ))}
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section style={{ padding: 'var(--space-20) var(--space-6)', textAlign: 'center', background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-surface) 100%)' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={eyebrowStyle}>严格对齐《四旋翼数学模型.md》和《四旋翼仿真测试用例.md》</div>
        <h2 style={heroTitleStyle}>四旋翼无人机<br />文档工况仿真与对比</h2>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 28 }}>
          运行 B01 悬停、B02 5 m/s 直线、B03 圆轨迹 2 m/s 与 7 m/s 工况，并直接对比文档给出的 SOC、功率和续航时间。
        </p>
        <a href="#config" style={primaryLinkStyle}>开始配置 <ChevronDown size={16} /></a>
      </div>
    </section>
  )
}

function PlaybackSection() {
  return (
    <section id="playback" style={{ background: 'oklch(15% 0.02 240)', color: 'var(--text-inverse)', padding: 'var(--space-16) var(--space-6)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeading title="3D 飞行回放" text="仿真完成后，按真实仿真时间回放位置、姿态和任务轨迹。" inverse />
        <div style={{ background: 'oklch(12% 0.02 240)', borderRadius: 8, overflow: 'hidden', border: '1px solid oklch(25% 0.02 240)' }}>
          <PlaybackPanel />
        </div>
      </div>
    </section>
  )
}

function DataSection() {
  return (
    <section id="data" style={{ width: '100%', padding: 'var(--space-16) var(--space-6)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeading title="仿真数据" text="优先显示与文档测试用例的对比，只对文档明确给出的输出做通过/失败判定。" />
        <DataPanel />
      </div>
    </section>
  )
}

function SectionHeading({ title, text, inverse = false }: { title: string; text: string; inverse?: boolean }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: inverse ? 'var(--text-inverse)' : 'var(--text-primary)', marginBottom: 10 }}>{title}</h2>
      <p style={{ fontSize: 16, color: inverse ? 'oklch(74% 0.02 240)' : 'var(--text-secondary)', maxWidth: 720 }}>{text}</p>
    </div>
  )
}

function Footer() {
  return (
    <footer style={{ padding: 'var(--space-10) var(--space-6)', background: 'oklch(15% 0.02 240)', color: 'oklch(70% 0.02 240)', textAlign: 'center' }}>
      <p style={{ fontSize: 13 }}>四旋翼无人机文档工况仿真平台</p>
    </footer>
  )
}

const headerStyle: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 100, height: 56, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-6)' }
const navLinkStyle: React.CSSProperties = { padding: '8px 14px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13, fontWeight: 600, borderRadius: 8 }
const eyebrowStyle: React.CSSProperties = { display: 'inline-flex', padding: '8px 14px', background: 'var(--accent-subtle)', color: 'var(--accent-primary)', fontSize: 13, fontWeight: 800, borderRadius: 999, marginBottom: 24 }
const heroTitleStyle: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: 20 }
const primaryLinkStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '13px 24px', background: 'var(--accent-primary)', color: 'var(--text-inverse)', fontSize: 15, fontWeight: 800, borderRadius: 8, textDecoration: 'none' }

export default App
