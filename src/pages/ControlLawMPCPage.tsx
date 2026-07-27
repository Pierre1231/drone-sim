import { Cpu, ArrowLeft, Home } from 'lucide-react'

export default function ControlLawMPCPage() {
  return (
    <div className="page-container space-content-page" style={{ textAlign: 'center', paddingTop: 'var(--space-16)' }}>
      <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
        <Cpu size={36} color="var(--accent-primary)" />
      </div>
      <h1 className="ds-display app-page-title">MPC 控制律</h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto var(--space-6)' }}>
        模型预测控制（MPC）在每个控制周期求解带约束的优化问题，支持预测时域与输入约束配置。该功能正在开发中。
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
