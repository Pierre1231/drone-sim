export type AppRoute = 'portal' | 'selection' | 'simulation' | 'control-law' | 'theory'

export function getRoute(hash: string): AppRoute {
  if (hash.startsWith('#/theory')) return 'theory'
  if (hash.startsWith('#/selection')) return 'selection'
  if (hash.startsWith('#/simulation')) return 'simulation'
  if (hash.startsWith('#/control-law')) return 'control-law'
  return 'portal'
}
