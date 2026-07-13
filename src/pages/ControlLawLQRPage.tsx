import { FlaskConical } from 'lucide-react'

export default function ControlLawLQRPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-16) var(--space-6)', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
        <FlaskConical size={36} color="var(--accent-primary)" />
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
        LQR 控制律
      </h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto var(--space-6)' }}>
        线性二次调节器（LQR）通过状态反馈与权重矩阵 Q/R 优化控制性能。该功能正在开发中。
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <a href="#/control-law/pid" style={secondaryButtonStyle}>返回 PID 调参</a>
        <a href="#/" style={secondaryButtonStyle}>返回门户</a>
      </div>
    </div>
  )
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 8,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-surface)',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 600,
}
