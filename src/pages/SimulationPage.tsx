import { Construction, ArrowLeft, Home } from 'lucide-react'

export default function SimulationPage() {
  return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: 'var(--space-16)' }}>
      <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
        <Construction size={36} color="var(--accent-primary)" />
      </div>
      <h1 className="ds-display" style={{ fontSize: 32, marginBottom: 12 }}>仿真模式</h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto var(--space-6)' }}>
        完整六自由度仿真、3D 回放与数据对比功能正在开发中，敬请期待。
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <a href="#/selection" className="ds-button secondary">
          <ArrowLeft size={16} />
          返回选型模式
        </a>
        <a href="#/" className="ds-button secondary">
          <Home size={16} />
          返回门户
        </a>
      </div>
    </div>
  )
}
