import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import ConfigPanel from '@/components/ConfigPanel'
import PlaybackPanel from '@/components/PlaybackPanel'
import DataPanel from '@/components/DataPanel'

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
    </div>
  )
}

function Header() {
  const links = [
    { label: '配置', href: '#config' },
    { label: '回放', href: '#playback' },
    { label: '数据', href: '#data' },
    { label: '原理', href: '#theory' },
  ]

  return (
    <header style={headerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>DroneSim</h1>
      </div>
      <nav style={{ display: 'flex', gap: 4 }}>
        {links.map(item => (
          <a key={item.href} href={item.href} style={navLinkStyle}>{item.label}</a>
        ))}
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section style={{ padding: 'var(--space-20) var(--space-6)', textAlign: 'center', background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-surface) 100%)' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={eyebrowStyle}>严格对齐《四旋翼数学模型.md》和《四旋翼仿真测试用例.md》</div>
        <h2 style={heroTitleStyle}>四旋翼无人机<br />文档工况仿真与对比</h2>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 28 }}>
          运行 B01 悬停、B02 5 m/s 直线、B03 圆轨迹 2 m/s 与 7 m/s 工况，并直接对比文档给出的 SOC、功率和续航时间。
        </p>
        <a href="#config" style={primaryLinkStyle}>开始配置 <ChevronDown size={16} /></a>
      </div>
    </section>
  )
}

function PlaybackSection() {
  return (
    <section id="playback" style={{ background: 'oklch(15% 0.02 240)', color: 'var(--text-inverse)', padding: 'var(--space-16) var(--space-6)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeading title="3D 飞行回放" text="仿真完成后，按真实仿真时间回放位置、姿态和任务轨迹。" inverse />
        <div style={{ background: 'oklch(12% 0.02 240)', borderRadius: 8, overflow: 'hidden', border: '1px solid oklch(25% 0.02 240)' }}>
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
        <SectionHeading title="仿真数据" text="优先显示与文档测试用例的对比，只对文档明确给出的输出做通过/失败判定。" />
        <DataPanel />
      </div>
    </section>
  )
}

function TheorySection() {
  return (
    <section id="theory" style={{ width: '100%', padding: 'var(--space-16) var(--space-6)', background: 'var(--bg-surface)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeading title="原理说明" text="以下说明基于项目根目录的《四旋翼数学模型.md》，按仿真求解链路展开。" />
        <TheoryContent />
      </div>
    </section>
  )
}

function SectionHeading({ title, text, inverse = false }: { title: string; text: string; inverse?: boolean }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: inverse ? 'var(--text-inverse)' : 'var(--text-primary)', marginBottom: 10 }}>{title}</h2>
      <p style={{ fontSize: 16, color: inverse ? 'oklch(74% 0.02 240)' : 'var(--text-secondary)', maxWidth: 720 }}>{text}</p>
    </div>
  )
}

function TheoryContent() {
  const [isOpen, setIsOpen] = useState(true)
  const rows = [
    ['坐标与状态', '采用 NED 地理系和机体系；状态包含位置 p^n、速度 v^n、四元数 q_nb、机体系角速度 omega^b。'],
    ['刚体动力学', '合力先在机体系累加，再经 R_b^n 转到 NED；重力沿 +z_n；姿态由四元数积分并归一化。'],
    ['任务输入', '控制器接收 p_d^n、v_d^n、a_ff^n、航向参考 b_x,ref^n；B03 圆轨迹使用文档给出的圆周位置、速度和前馈加速度。'],
    ['串级控制', '位置 PI 生成速度命令，速度 PID 加前馈生成期望合力，姿态环用旋转矩阵误差，角速度环输出控制力矩。'],
    ['控制分配', '四旋翼 X 构型按文档电机顺序和 s=chi=[1,-1,1,-1] 建立分配矩阵，带非负推力和母线电压约束。'],
    ['推进系统', '电调占空比决定电机端电压；电机电流和转速由电气/机械动态更新；螺旋桨推力和反扭矩由 C_T(J)、C_Q(J) 计算。'],
    ['电池与能耗', '电池端电压由 OCV、内阻和极化电压组成；SOC 用慢步长按平均母线电流更新，辅助功率 P_aux=10 W。'],
    ['环境与气动', '文档工况默认无风；空气密度按标准环境取值；机体阻力按低速二次阻力模型进入控制前馈和刚体受力。'],
  ]

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)} style={toggleStyle}>
        <span>展开/收起原理说明</span>
        <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>

      {isOpen && (
        <div style={{ paddingTop: 22 }}>
          <div style={theoryGridStyle}>
            {rows.map(([title, text]) => (
              <div key={title} style={theoryCardStyle}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{text}</p>
              </div>
            ))}
          </div>

          <div style={formulaBoxStyle}>
            <div><strong>刚体平动：</strong> m dot(v^n) = F^n + m g e_z^n</div>
            <div><strong>刚体转动：</strong> J dot(omega^b) = M^b - omega^b x J omega^b</div>
            <div><strong>圆轨迹：</strong> p_d=[R cos(Omega t), R sin(Omega t), -5]^T, Omega=v/R</div>
            <div><strong>电池：</strong> U_b = U_oc(SOC) - I_bat R_int - U_dyn</div>
          </div>
        </div>
      )}
    </div>
  )
}

function Footer() {
  return (
    <footer style={{ padding: 'var(--space-10) var(--space-6)', background: 'oklch(15% 0.02 240)', color: 'oklch(70% 0.02 240)', textAlign: 'center' }}>
      <p style={{ fontSize: 13 }}>四旋翼无人机文档工况仿真平台</p>
    </footer>
  )
}

const headerStyle: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 100, height: 56, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-6)' }
const navLinkStyle: React.CSSProperties = { padding: '8px 14px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13, fontWeight: 600, borderRadius: 8 }
const eyebrowStyle: React.CSSProperties = { display: 'inline-flex', padding: '8px 14px', background: 'var(--accent-subtle)', color: 'var(--accent-primary)', fontSize: 13, fontWeight: 800, borderRadius: 999, marginBottom: 24 }
const heroTitleStyle: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: 20 }
const primaryLinkStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '13px 24px', background: 'var(--accent-primary)', color: 'var(--text-inverse)', fontSize: 15, fontWeight: 800, borderRadius: 8, textDecoration: 'none' }
const toggleStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer', width: '100%', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }
const theoryGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14, marginBottom: 18 }
const theoryCardStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 16 }
const formulaBoxStyle: React.CSSProperties = { background: 'oklch(97% 0.005 250)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 16, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 2 }

export default App
