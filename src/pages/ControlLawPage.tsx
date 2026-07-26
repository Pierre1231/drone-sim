interface LawCardProps {
  title: string
  status: string
  href: string
  variant: string
}

function LawCard({ title, status, href, variant }: LawCardProps) {
  return (
    <a href={href} className={`control-law-card control-law-card--${variant} apple-press`}>
      <div className="control-law-card__shade" />
      <div className="control-law-card__content">
        <h2 style={cardTitleStyle}>{title}</h2>
        <p style={cardStatusStyle}>{status}</p>
      </div>
    </a>
  )
}

export default function ControlLawPage() {
  return (
    <div className="page-container">
      <h1 className="ds-display" style={{ fontSize: 32, marginBottom: 12 }}>控制律模式</h1>
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
  fontSize: 18,
  fontWeight: 700,
  color: '#ffffff',
  marginBottom: 4,
}

const cardStatusStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'rgba(255, 255, 255, 0.82)',
}
