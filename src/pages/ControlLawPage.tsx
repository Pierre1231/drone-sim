import ConstellationCardVisual from '../components/ConstellationCardVisual'

interface LawCardProps {
  title: string
  status: string
  href: string
  variant: string
}

function LawCard({ title, status, href, variant }: LawCardProps) {
  return (
    <a href={href} className={`control-law-card control-law-card--${variant} apple-press`}>
      <div className="control-law-card__visual">
        <ConstellationCardVisual variant={variant as 'pid' | 'lqr' | 'mpc'} />
        <span className="control-law-card__index">0{variant === 'pid' ? 1 : variant === 'lqr' ? 2 : 3}</span>
      </div>
      <div className="control-law-card__content">
        <span className="control-law-card__eyebrow">CONTROL SYSTEM</span>
        <h2 style={cardTitleStyle}>{title}</h2>
        <p style={cardStatusStyle}>{status}</p>
        <span className="control-law-card__enter">进入模块 →</span>
      </div>
    </a>
  )
}

export default function ControlLawPage() {
  return (
    <div className="page-container space-content-page">
      <h1 className="ds-display app-page-title">控制律模式</h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 32 }}>
        基于同一套无人机动力学，设计并对比不同控制律。
      </p>

      <section className="control-law-grid ds-stagger">
        <LawCard
          title="PID 控制律"
          status="可无极调参"
          href="#/control-law/pid"
          variant="pid"
        />
        <LawCard
          title="LQR 控制律"
          status="开发中"
          href="#/control-law/lqr"
          variant="lqr"
        />
        <LawCard
          title="MPC 控制律"
          status="开发中"
          href="#/control-law/mpc"
          variant="mpc"
        />
      </section>
    </div>
  )
}

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(30px, 4vw, 52px)',
  fontWeight: 800,
  color: '#ffffff',
  margin: '10px 0 8px',
}

const cardStatusStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255, 255, 255, .72)',
}
