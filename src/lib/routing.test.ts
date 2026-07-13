import { describe, expect, it } from 'vitest'
import { getRoute, type AppRoute } from './routing'

describe('getRoute', () => {
  const cases: [string, AppRoute][] = [
    ['', 'portal'],
    ['#/', 'portal'],
    ['#/selection', 'selection'],
    ['#/simulation', 'simulation'],
    ['#/control-law', 'control-law'],
    ['#/control-law/pid', 'control-law'],
    ['#/control-law/lqr', 'control-law'],
    ['#/control-law/mpc', 'control-law'],
    ['#/theory', 'theory'],
    ['#/theory/coordinate-system', 'theory'],
    ['#/unknown', 'portal'],
  ]

  it.each(cases)('parses %s as %s', (hash, expected) => {
    expect(getRoute(hash)).toBe(expected)
  })
})
