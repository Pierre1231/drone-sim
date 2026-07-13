import { Cpu, FlaskConical, Settings2 } from 'lucide-react'

interface LawCardProps {
  icon: React.ReactNode
  title: string
  status: string
  href: string
}

function LawCard({ icon, title, status, href }: LawCardProps) {
  return (
    <a href={href} style={cardStyle}>
      <div style={iconWrapperStyle}>{icon}</div>
      <div>
        <h2 style={cardTitleStyle}>{title}</h2>
        <p style={cardStatusStyle}>{status}</p>
      </div>
    </a>
  )
}

export default function ControlLawPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-16) var(--space-6)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
        控制律模式
      </h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 32 }}>
        基于同一套无人机动力学，设计并对比不同控制律。
      </p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <LawCard
          icon={<Settings2 size={28} color="var(--accent-primary)" />}
          title="PID 控制律"
          status="可无极调参"
          href="#/control-law/pid"
        />
        <LawCard
          icon={<FlaskConical size={28} color="var(--text-secondary)" />}
          title="LQR 控制律"
          status="开发中"
          href="#/control-law/lqr"
        />
        <LawCard
          icon={<Cpu size={28} color="var(--text-secondary)" />}
          title="MPC 控制律"
          status="开发中"
          href="#/control-law/mpc"
        />
      </section>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: 20,
  background: 'var(--bg-surface)',
  borderRadius: 12,
  border: '1px solid var(--border-default)',
  textDecoration: 'none',
}

const iconWrapperStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 10,
  background: 'var(--accent-subtle)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 4,
}

const cardStatusStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-secondary)',
}
