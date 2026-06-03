import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'

export default function InfoPanel() {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 16, right: 16,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: 14, color: 'var(--text-secondary)',
          cursor: 'pointer', zIndex: 50, fontFamily: 'var(--font-body)',
          fontWeight: 500,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'oklch(80% 0.01 250)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-default)' }}
      >
        <BookOpen size={16} /> 原理说明
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16,
      width: 500, maxHeight: '70vh',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-lg)',
      overflowY: 'auto', zIndex: 50,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-4)', borderBottom: '1px solid var(--border-default)',
      }}>
        <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>原理说明</h3>
        <button onClick={() => setIsOpen(false)} style={{
          color: 'var(--text-secondary)', cursor: 'pointer',
          background: 'none', border: 'none', padding: 4,
        }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: 'var(--space-5)', fontSize: 14, lineHeight: 1.8 }}>
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>四旋翼结构</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            标准 X 型四旋翼，四个电机对称分布在机架四角。电机 1&4 顺时针旋转，电机 2&3 逆时针旋转，
            通过反扭矩平衡实现偏航控制。
          </p>
          <div style={{
            background: 'oklch(97% 0.005 250)', borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3)', fontSize: 12, fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
          }}>
            {`  [2]    [1]`}<br />
            {`    \\  /`}<br />
            {`     CG`}<br />
            {`    /  \\`}<br />
            {`  [3]    [4]`}
          </div>
        </section>

        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>坐标系定义</h4>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { sym: 'NED (n)', desc: '地理坐标系：x北 y东 z下' },
                { sym: 'Body (b)', desc: '机体坐标系：原点在质心' },
                { sym: 'Prop (pᵢ)', desc: '第 i 个螺旋桨坐标系' },
              ].map(row => (
                <tr key={row.sym} style={{ borderTop: '1px solid var(--border-default)' }}>
                  <td style={{ padding: 'var(--space-2) 0', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)' }}>{row.sym}</td>
                  <td style={{ padding: 'var(--space-2) 0', color: 'var(--text-secondary)' }}>{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>仿真模型层次</h4>
          <ol style={{
            color: 'var(--text-secondary)', paddingLeft: 'var(--space-5)',
            lineHeight: 2,
          }}>
            <li>六自由度刚体动力学（位置/速度/姿态/角速度）</li>
            <li>电池动态模型（SOC / 极化电压 / 内阻）</li>
            <li>电机电气-机械耦合模型（RL电路 + 转子动力学）</li>
            <li>电调响应模型（占空比映射 + 输出电压）</li>
            <li>螺旋桨推进模型（推力系数随推进比变化）</li>
            <li>串级 PID 控制器（位置→速度→姿态→角速度）</li>
            <li>气动力模型（低速二次阻力）</li>
            <li>标准大气环境模型（ISA）</li>
          </ol>
        </section>

        <section>
          <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>关键公式</h4>
          <div style={{
            background: 'oklch(97% 0.005 250)', borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)', fontSize: 13, fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)', lineHeight: 2,
          }}>
            <div>T = Cₜ(J) · ρ · n² · D⁴</div>
            <div>Q = Cᵩ(J) · ρ · n² · D⁵</div>
            <div>U<sub>b</sub> = U<sub>oc</sub> - I·R<sub>int</sub></div>
            <div>SOC[k+1] = SOC[k] - I·T<sub>s</sub>/(3600·Q<sub>nom</sub>)</div>
          </div>
        </section>
      </div>
    </div>
  )
}
