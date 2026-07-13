import { Cpu } from 'lucide-react'

export default function ControlLawMPCPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-16) var(--space-6)', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
        <Cpu size={36} color="var(--accent-primary)" />
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
        MPC 控制律
      </h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto var(--space-6)' }}>
        模型预测控制（MPC）在每个控制周期求解带约束的优化问题，支持预测时域与输入约束配置。该功能正在开发中。
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
