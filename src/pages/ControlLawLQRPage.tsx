import { FlaskConical, ArrowLeft, Home } from 'lucide-react'

export default function ControlLawLQRPage() {
  return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: 'var(--space-16)' }}>
      <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
        <FlaskConical size={36} color="var(--accent-primary)" />
      </div>
      <h1 className="ds-display" style={{ fontSize: 32, marginBottom: 12 }}>LQR 控制律</h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto var(--space-6)' }}>
        线性二次调节器（LQR）通过状态反馈与权重矩阵 Q/R 优化控制性能。该功能正在开发中。
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <a href="#/control-law/pid" className="ds-button secondary">
          <ArrowLeft size={16} />
          返回 PID 调参
        </a>
        <a href="#/" className="ds-button secondary">
          <Home size={16} />
          返回门户
        </a>
      </div>
    </div>
  )
}
