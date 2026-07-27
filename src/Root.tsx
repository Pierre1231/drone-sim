import { useEffect, useState } from 'react'
import { getRoute, type AppRoute } from './lib/routing'
import SiteHeader from './components/SiteHeader'
import PortalPage from './pages/PortalPage'
import SelectionPage from './pages/SelectionPage'
import SimulationPage from './pages/SimulationPage'
import ControlLawPage from './pages/ControlLawPage'
import ControlLawPIDPage from './pages/ControlLawPIDPage'
import ControlLawLQRPage from './pages/ControlLawLQRPage'
import ControlLawMPCPage from './pages/ControlLawMPCPage'
import TheoryPage from './theory/TheoryPage'
import SelectionStarfield from './components/SelectionStarfield'

function getControlLawSubPage(hash: string): 'overview' | 'pid' | 'lqr' | 'mpc' {
  if (hash.startsWith('#/control-law/pid')) return 'pid'
  if (hash.startsWith('#/control-law/lqr')) return 'lqr'
  if (hash.startsWith('#/control-law/mpc')) return 'mpc'
  return 'overview'
}

function ControlLawRouter() {
  const [subPage, setSubPage] = useState(() => getControlLawSubPage(window.location.hash))

  useEffect(() => {
    const onHash = () => setSubPage(getControlLawSubPage(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  switch (subPage) {
    case 'pid': return <ControlLawPIDPage />
    case 'lqr': return <ControlLawLQRPage />
    case 'mpc': return <ControlLawMPCPage />
    default: return <ControlLawPage />
  }
}

export default function Root() {
  const [route, setRoute] = useState<AppRoute>(() => getRoute(window.location.hash))

  useEffect(() => {
    const onHash = () => setRoute(getRoute(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // 进入文档页时回到顶部，避免沿用主站滚动位置
  useEffect(() => {
    if (route === 'theory') window.scrollTo(0, 0)
  }, [route])

  const renderPage = () => {
    switch (route) {
      case 'selection': return <SelectionPage />
      case 'simulation': return <SimulationPage />
      case 'control-law': return <ControlLawRouter />
      case 'theory': return <TheoryPage />
      default: return <PortalPage />
    }
  }

  return (
    <div className={route === 'theory' ? 'app-root' : 'app-root app-root--space'}>
      <SiteHeader currentRoute={route} />
      {route !== 'theory' && route !== 'selection' && <SelectionStarfield />}
      <main className="app-page-layer">{renderPage()}</main>
    </div>
  )
}
