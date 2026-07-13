import { Construction } from 'lucide-react'

export default function SimulationPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-16) var(--space-6)', textAlign: 'center' }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
        <Construction size={40} color="var(--accent-primary)" />
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
        仿真模式
      </h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto' }}>
        完整六自由度仿真、3D 回放与数据对比功能正在开发中，敬请期待。
      </p>
    </div>
  )
}
