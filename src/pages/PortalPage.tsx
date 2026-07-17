import { ArrowRight } from 'lucide-react'
import LetterGlitch from '../components/LetterGlitch'

const HERO_GLITCH_COLORS = ['#1d4ed8', '#3b82f6', '#9bc1ff', '#cee1ff']

export default function PortalPage() {
  return (
    <section style={heroSectionStyle} className="ds-fade-in">
      <div style={heroGlitchStyle} aria-hidden="true">
        <LetterGlitch
          glitchColors={HERO_GLITCH_COLORS}
          glitchSpeed={50}
          smooth={true}
          mask="quadcopter"
          backgroundColor="#ffffff"
          outerVignette={false}
        />
      </div>
      <div style={heroContainerStyle}>
        <div style={heroTextStyle}>
          <h1 className="ds-display" style={heroTitleStyle}>
            从设计到仿真<br />一站式验证
          </h1>
          <p style={heroBodyStyle}>
            在统一的动力学模型上完成部件选型、控制律调参与六自由度仿真，
            让每一次设计迭代都有数据支撑。
          </p>
          <div style={heroActionsStyle}>
            <a href="#/selection" className="ds-button" style={heroActionStyle}>
              开始选型 <ArrowRight size={14} style={{ marginLeft: 6, flexShrink: 0 }} />
            </a>
            <a href="#/simulation" className="ds-button secondary" style={heroActionStyle}>
              运行仿真
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

const heroSectionStyle: React.CSSProperties = {
  position: 'relative',
  minHeight: 'min(calc(100vh - 56px), calc(100vw * 3 / 4))',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'flex-end',
}

const heroGlitchStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
}

const heroContainerStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: '100%',
  padding: 'clamp(20px, 4vmin, 48px) 24px',
  paddingLeft: 50,
  display: 'flex',
  alignItems: 'flex-end',
  minHeight: 'min(calc(100vh - 56px), calc(100vw * 3 / 4))',
}

const heroTextStyle: React.CSSProperties = {
  maxWidth: 'min(620px, 60vw)',
}

const heroTitleStyle: React.CSSProperties = {
  fontSize: 'clamp(28px, 6vmin, 56px)',
  color: 'var(--text-primary)',
  marginBottom: 'clamp(10px, 1.8vmin, 20px)',
}

const heroBodyStyle: React.CSSProperties = {
  fontSize: 'clamp(14px, 2vmin, 17px)',
  lineHeight: 1.6,
  color: 'rgba(15, 23, 42, 0.82)',
  marginBottom: 'clamp(16px, 2.8vmin, 32px)',
}

const heroActionsStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'clamp(8px, 1.5vmin, 12px)',
}

const heroActionStyle: React.CSSProperties = {
  fontSize: 'clamp(13px, 1.8vmin, 14px)',
  padding: 'clamp(8px, 1.6vmin, 10px) clamp(14px, 2.2vmin, 18px)',
}
