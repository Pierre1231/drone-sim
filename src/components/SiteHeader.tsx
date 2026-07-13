import type { AppRoute } from '@/lib/routing'

interface SiteHeaderProps {
  currentRoute: AppRoute
}

const links: { label: string; href: string; route: AppRoute }[] = [
  { label: '选型模式', href: '#/selection', route: 'selection' },
  { label: '仿真模式', href: '#/simulation', route: 'simulation' },
  { label: '控制律模式', href: '#/control-law', route: 'control-law' },
  { label: '原理', href: '#/theory', route: 'theory' },
]

export default function SiteHeader({ currentRoute }: SiteHeaderProps) {
  return (
    <header style={headerStyle} className="ds-nav-material">
      <a href="#/" style={brandStyle} className="apple-press">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span style={brandTextStyle}>DroneSim</span>
      </a>
      <nav style={{ display: 'flex', gap: 4 }}>
        {links.map(item => {
          const active = currentRoute === item.route
          return (
            <a
              key={item.href}
              href={item.href}
              className="apple-press"
              style={active ? { ...navLinkStyle, ...activeNavLinkStyle } : navLinkStyle}
            >
              {item.label}
            </a>
          )
        })}
      </nav>
    </header>
  )
}

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  height: 56,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 var(--space-6)',
}

const brandStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  textDecoration: 'none',
}

const brandTextStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--text-primary)',
}

const navLinkStyle: React.CSSProperties = {
  padding: '8px 14px',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 8,
}

const activeNavLinkStyle: React.CSSProperties = {
  color: 'var(--accent-primary)',
  background: 'var(--accent-subtle)',
}
