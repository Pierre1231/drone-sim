import ConfigPanel from '@/components/ConfigPanel'
import PlaybackPanel from '@/components/PlaybackPanel'
import DataPanel from '@/components/DataPanel'
import InfoPanel from '@/components/InfoPanel'
import { ChevronDown } from 'lucide-react'

function App() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <Header />
      <Hero />
      <ConfigPanel />
      <PlaybackSection />
      <DataSection />
      <TheorySection />
      <Footer />
      <InfoPanel />
    </div>
  )
}

function Header() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100, height: 56,
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-default)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 var(--space-6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
          DroneSim
        </h1>
      </div>
      <nav style={{ display: 'flex', gap: 'var(--space-1)' }}>
        {[
          { label: '配置', href: '#config' },
          { label: '回放', href: '#playback' },
          { label: '数据', href: '#data' },
          { label: '原理', href: '#theory' },
        ].map(item => (
          <a key={item.href} href={item.href} style={{
            padding: 'var(--space-2) var(--space-4)', color: 'var(--text-secondary)',
            textDecoration: 'none', fontSize: 13, fontWeight: 500,
            borderRadius: 'var(--radius-md)', transition: 'all 0.15s ease',
          }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'oklch(96% 0.005 250)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section style={{
      padding: 'var(--space-20) var(--space-6)', textAlign: 'center',
      background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-surface) 100%)',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-4)', background: 'var(--accent-subtle)',
          color: 'var(--accent-primary)', fontSize: 13, fontWeight: 600,
          borderRadius: 100, marginBottom: 'var(--space-6)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          基于完整六自由度动力学模型
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
          color: 'var(--text-primary)', marginBottom: 'var(--space-5)',
        }}>
          四旋翼无人机<br />参数选型与飞行仿真
        </h2>
        <p style={{
          fontSize: 18, color: 'var(--text-secondary)',
          marginBottom: 'var(--space-8)', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto',
        }}>
          选择部件型号，运行高精度飞行仿真，以 3D 动画 + 数据图表直观展示结果
        </p>
        <a href="#config" style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-4) var(--space-8)', background: 'var(--accent-primary)',
          color: 'var(--text-inverse)', fontSize: 15, fontWeight: 600,
          border: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
          transition: 'all 0.15s ease', textDecoration: 'none',
        }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
          开始配置
          <ChevronDown size={16} />
        </a>
      </div>
    </section>
  )
}

function PlaybackSection() {
  return (
    <section id="playback" style={{
      background: 'oklch(15% 0.02 240)', color: 'var(--text-inverse)',
      padding: 'var(--space-16) var(--space-6)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600,
            letterSpacing: '-0.02em', color: 'var(--text-inverse)', marginBottom: 'var(--space-3)',
          }}>
            3D 飞行回放
          </h2>
          <p style={{ fontSize: 16, color: 'oklch(70% 0.02 240)', maxWidth: 600 }}>
            仿真完成后，以 3D 动画形式回放无人机飞行过程
          </p>
        </div>
        <div style={{
          background: 'oklch(12% 0.02 240)', borderRadius: 'var(--radius-xl)',
          overflow: 'hidden', border: '1px solid oklch(25% 0.02 240)',
        }}>
          <PlaybackPanel />
        </div>
      </div>
    </section>
  )
}

function DataSection() {
  return (
    <section id="data" style={{ width: '100%', padding: 'var(--space-16) var(--space-6)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600,
            letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 'var(--space-3)',
          }}>
            仿真数据
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 600 }}>
            多维度分析仿真结果，从概览到细节层层深入
          </p>
        </div>
        <DataPanel />
      </div>
    </section>
  )
}

function TheorySection() {
  return (
    <section id="theory" style={{ width: '100%', padding: 'var(--space-16) var(--space-6)', background: 'var(--bg-surface)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600,
            letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 'var(--space-3)',
          }}>
            原理说明
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 600 }}>
            了解仿真背后的物理原理和数学模型
          </p>
        </div>
        <TheoryContent />
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer style={{
      padding: 'var(--space-10) var(--space-6)', background: 'oklch(15% 0.02 240)',
      color: 'oklch(60% 0.02 240)', textAlign: 'center',
    }}>
      <p style={{ fontSize: 13 }}>四旋翼无人机参数选型与飞行仿真平台 · 基于完整六自由度动力学模型</p>
    </footer>
  )
}

function TheoryContent() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-5) var(--space-6)', background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)',
        cursor: 'pointer', transition: 'all 0.2s ease', width: '100%',
        fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
        color: 'var(--text-primary)',
      }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'oklch(80% 0.01 250)'; e.currentTarget.style.background = 'oklch(98% 0.005 250)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-surface)' }}>
        <span>展开原理说明</span>
        <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>

      {isOpen && (
        <div style={{ padding: 'var(--space-8) 0' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}>
            坐标系定义
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 'var(--space-8)' }}>
            <thead>
              <tr>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'oklch(97% 0.005 250)' }}>符号</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'oklch(97% 0.005 250)' }}>含义</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'oklch(97% 0.005 250)' }}>说明</th>
              </tr>
            </thead>
            <tbody>
              {[
                { sym: 'On xn yn zn', meaning: 'NED 地理坐标系', desc: '北-东-下，原点位于起飞点' },
                { sym: 'Ob xb yb zb', meaning: '机体坐标系', desc: '原点在质心，x轴指向机头' },
                { sym: 'φ, θ, ψ', meaning: '欧拉角', desc: '滚转、俯仰、偏航角' },
                { sym: 'q', meaning: '姿态四元数', desc: '[q₀, q₁, q₂, q₃]ᵀ' },
                { sym: 'vb', meaning: '机体系速度', desc: '[u, v, w]ᵀ' },
                { sym: 'ωb', meaning: '机体系角速度', desc: '[p, q, r]ᵀ' },
              ].map(row => (
                <tr key={row.sym} style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-primary)' }}>{row.sym}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 14, color: 'var(--text-primary)' }}>{row.meaning}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 14, color: 'var(--text-primary)' }}>{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: 18, fontWeight: 600, margin: 'var(--space-10) 0 var(--space-5)', color: 'var(--text-primary)' }}>
            模型层次
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
            仿真引擎基于完整的六自由度刚体动力学模型，包含以下子系统：
          </p>
          <ul style={{ color: 'var(--text-secondary)', paddingLeft: 'var(--space-6)', marginBottom: 'var(--space-8)', lineHeight: 2 }}>
            <li>坐标系转换与姿态表示（四元数）</li>
            <li>六自由度刚体动力学方程</li>
            <li>PID 串级控制器（位置环 + 姿态环）</li>
            <li>控制分配（四个电机的推力分配）</li>
            <li>电机电气/机械模型（含电气暂态）</li>
            <li>电调响应模型（含延迟和损耗）</li>
            <li>电池 SOC/极化/热模型</li>
            <li>螺旋桨推进比模型（推力/扭矩系数曲线）</li>
            <li>标准大气环境模型</li>
          </ul>

          <h3 style={{ fontSize: 18, fontWeight: 600, margin: 'var(--space-10) 0 var(--space-5)', color: 'var(--text-primary)' }}>
            关键公式
          </h3>
          <div style={{
            background: 'oklch(97% 0.005 250)', borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)', fontFamily: 'var(--font-mono)', fontSize: 14,
            color: 'var(--text-primary)', lineHeight: 2,
          }}>
            <div>T = Cₜ(J) · ρ · n² · D⁴</div>
            <div>Q = Cᵩ(J) · ρ · n² · D⁵</div>
            <div>U<sub>b</sub> = U<sub>oc</sub> - I·R<sub>int</sub></div>
            <div>SOC[k+1] = SOC[k] - I·T<sub>s</sub>/(3600·Q<sub>nom</sub>)</div>
          </div>
        </div>
      )}
    </>
  )
}

import { useState } from 'react'

export default App
