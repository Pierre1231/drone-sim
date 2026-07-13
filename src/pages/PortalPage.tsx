import { Cog, Cpu, Gauge } from 'lucide-react'

interface ModeCardProps {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}

function ModeCard({ icon, title, description, href }: ModeCardProps) {
  return (
    <a href={href} style={cardStyle}>
      <div style={iconWrapperStyle}>{icon}</div>
      <h2 style={cardTitleStyle}>{title}</h2>
      <p style={cardDescriptionStyle}>{description}</p>
      <span style={cardActionStyle}>进入模式 →</span>
    </a>
  )
}

export default function PortalPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-20) var(--space-6)' }}>
        <section style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={eyebrowStyle}>四旋翼无人机设计与分析平台</div>
          <h1 style={heroTitleStyle}>统一门户</h1>
          <p style={heroTextStyle}>
            从部件选型到控制律调参，基于同一套动力学模型，快速迭代你的无人机设计。
          </p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          <ModeCard
            icon={<Cog size={32} color="var(--accent-primary)" />}
            title="选型模式"
            description="选择机架、电机、桨叶、电池等部件，快速估算悬停与高速前飞工况下的续航与功率。"
            href="#/selection"
          />
          <ModeCard
            icon={<Gauge size={32} color="var(--accent-primary)" />}
            title="仿真模式"
            description="运行完整六自由度仿真，回放飞行过程，对比文档工况。功能持续完善中。"
            href="#/simulation"
          />
          <ModeCard
            icon={<Cpu size={32} color="var(--accent-primary)" />}
            title="控制律模式"
            description="在同一套动力学下设计并调参控制律，实时观察阶跃响应与控制量变化。"
            href="#/control-law"
          />
        </section>
      </main>

      <footer style={{ padding: 'var(--space-10) var(--space-6)', background: 'oklch(15% 0.02 240)', color: 'oklch(70% 0.02 240)', textAlign: 'center' }}>
        <p style={{ fontSize: 13 }}>四旋翼无人机文档工况仿真平台</p>
      </footer>
    </div>
  )
}

const eyebrowStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '8px 14px',
  background: 'var(--accent-subtle)',
  color: 'var(--accent-primary)',
  fontSize: 13,
  fontWeight: 800,
  borderRadius: 999,
  marginBottom: 24,
}

const heroTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(36px, 5vw, 56px)',
  fontWeight: 800,
  lineHeight: 1.1,
  color: 'var(--text-primary)',
  marginBottom: 20,
}

const heroTextStyle: React.CSSProperties = {
  fontSize: 18,
  color: 'var(--text-secondary)',
  maxWidth: 640,
  margin: '0 auto',
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 28,
  background: 'var(--bg-surface)',
  borderRadius: 16,
  border: '1px solid var(--border-default)',
  boxShadow: 'var(--shadow-sm)',
  textDecoration: 'none',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
}

const iconWrapperStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 12,
  background: 'var(--accent-subtle)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 20,
}

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 10,
}

const cardDescriptionStyle: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  marginBottom: 20,
  flex: 1,
}

const cardActionStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--accent-primary)',
}
