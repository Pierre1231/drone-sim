import { useEffect, useState } from 'react'
import App from './App.tsx'
import TheoryPage from './theory/TheoryPage.tsx'

function getRoute() {
  return window.location.hash.startsWith('#/theory') ? 'theory' : 'home'
}

export default function Root() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const onHash = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // 进入文档页时回到顶部，避免沿用主站滚动位置
  useEffect(() => {
    if (route === 'theory') window.scrollTo(0, 0)
  }, [route])

  return route === 'theory' ? <TheoryPage /> : <App />
}
