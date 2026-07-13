import { ArrowRight, Cog, Cpu, Gauge } from 'lucide-react'

interface ModeCardProps {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}

function ModeCard({ icon, title, description, href }: ModeCardProps) {
  return (
    <a href={href} style={cardStyle} className="ds-card apple-press">
      <div style={iconWrapperStyle}>{icon}</div>
      <h2 className="ds-headline" style={cardTitleStyle}>{title}</h2>
      <p style={cardDescriptionStyle}>{description}</p>
      <span style={cardActionStyle}>进入模式 <ArrowRight size={14} style={{ marginLeft: 4 }} /></span>
    </a>
  )
}

export default function PortalPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <section style={heroSectionStyle} className="ds-fade-in">
        <div style={heroImageStyle} aria-hidden="true" />
        <div style={heroOverlayStyle} aria-hidden="true" />
        <div style={heroContainerStyle}>
          <div style={heroTextStyle}>
            <h1 className="ds-display" style={heroTitleStyle}>
              从设计到仿真<br />一站式验证
            </h1>
            <p style={heroBodyStyle}>
              在统一的动力学模型上完成部件选型、控制律调参与六自由度仿真，
              让每一次设计迭代都有数据支撑。
            </p>
            <div style={heroActionsStyle}>
              <a href="#/selection" className="ds-button" style={heroActionStyle}>
                开始选型 <ArrowRight size={14} style={{ marginLeft: 6, flexShrink: 0 }} />
              </a>
              <a href="#/simulation" className="ds-button secondary" style={heroActionStyle}>
                运行仿真
              </a>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--bg-primary)', padding: 'var(--space-20) var(--space-6)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 className="ds-headline" style={{ fontSize: 28, marginBottom: 10 }}>三种工作模式</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto' }}>
              从配置到验证，按需进入对应模块，所有数据基于同一套物理模型。
            </p>
          </div>
          <div style={cardsGridStyle} className="ds-stagger">
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
          </div>
        </div>
      </section>

      <footer style={{ marginTop: 'auto', padding: 'var(--space-10) var(--space-6)', background: 'oklch(15% 0.02 240)', color: 'oklch(70% 0.02 240)', textAlign: 'center' }}>
        <p style={{ fontSize: 13 }}>四旋翼无人机文档工况仿真平台</p>
      </footer>
    </div>
  )
}

const heroSectionStyle: React.CSSProperties = {
  position: 'relative',
  minHeight: 'min(calc(100vh - 56px), calc(100vw * 3 / 4))',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'flex-end',
}

const heroImageStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage: 'url(/assets/hero-drone.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: '75% bottom',
  backgroundRepeat: 'no-repeat',
  transform: 'scale(1.02)',
}

const heroOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'transparent',
}

const heroContainerStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: '100%',
  padding: 'clamp(20px, 4vmin, 48px) 24px',
  paddingLeft: 50,
  display: 'flex',
  alignItems: 'flex-end',
  minHeight: 'min(calc(100vh - 56px), calc(100vw * 3 / 4))',
}

const heroTextStyle: React.CSSProperties = {
  maxWidth: 'min(620px, 60vw)',
}

const heroTitleStyle: React.CSSProperties = {
  fontSize: 'clamp(28px, 6vmin, 56px)',
  color: 'var(--text-primary)',
  marginBottom: 'clamp(10px, 1.8vmin, 20px)',
}

const heroBodyStyle: React.CSSProperties = {
  fontSize: 'clamp(14px, 2vmin, 17px)',
  lineHeight: 1.6,
  color: 'rgba(15, 23, 42, 0.82)',
  marginBottom: 'clamp(16px, 2.8vmin, 32px)',
}

const heroActionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'clamp(8px, 1.5vmin, 12px)',
}

const heroActionStyle: React.CSSProperties = {
  fontSize: 'clamp(13px, 1.8vmin, 14px)',
  padding: 'clamp(8px, 1.6vmin, 10px) clamp(14px, 2.2vmin, 18px)',
}

const cardsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 24,
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 28,
  textDecoration: 'none',
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
  fontSize: 22,
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
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--accent-primary)',
}
