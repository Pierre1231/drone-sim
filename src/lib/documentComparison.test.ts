import { describe, expect, it } from 'vitest'
import type { SimResult } from './simulation'
import { buildDocumentComparison } from './documentComparison'

function makeResult(overrides: Partial<SimResult> = {}): SimResult {
  const time = [0, 20, 60, 120, 600, 1491]
  const length = time.length
  return {
    time,
    position: Array.from({ length }, () => [0, 0, -5]),
    velocity: Array.from({ length }, () => [0, 0, 0]),
    quaternion: Array.from({ length }, () => [1, 0, 0, 0]),
    angularVelocity: Array.from({ length }, () => [0, 0, 0]),
    motorSpeeds: Array.from({ length }, () => [0, 0, 0, 0]),
    motorCurrents: Array.from({ length }, () => [0, 0, 0, 0]),
    thrusts: Array.from({ length }, () => [0, 0, 0, 0]),
    voltage: Array.from({ length }, () => 19.674),
    current: Array.from({ length }, () => 17.2498),
    power: Array.from({ length }, () => 339.373061),
    soc: [1, 0.99, 0.96, 0.94, 0.697615, 0.2],
    totalThrust: Array.from({ length }, () => 14.715),
    refPosition: Array.from({ length }, () => [0, 0, -5]),
    ...overrides,
  }
}

describe('document comparison', () => {
  it('builds passing B01 hover rows from simulation telemetry', () => {
    const comparison = buildDocumentComparison('test-hover', makeResult())

    expect(comparison.rows).toHaveLength(6)
    expect(comparison.rows.every(row => row.verdict === 'pass')).toBe(true)
    expect(comparison.rows.map(row => row.actual)).toContain('339.373 W')
    expect(comparison.rows.map(row => row.actual)).toContain('1491.000 s')
  })

  it('classifies document metric errors as pass, warn, or fail', () => {
    const warnComparison = buildDocumentComparison(
      'test-hover',
      makeResult({ power: Array.from({ length: 6 }, () => 351.373061) })
    )
    const failComparison = buildDocumentComparison(
      'test-hover',
      makeResult({ power: Array.from({ length: 6 }, () => 359.373061) })
    )

    expect(warnComparison.rows[0].verdict).toBe('warn')
    expect(failComparison.rows[0].verdict).toBe('fail')
  })

  it('selects the document case that matches the mission type', () => {
    const fullSpeed = buildDocumentComparison(
      'fullspeed',
      makeResult({
        power: Array.from({ length: 6 }, () => 341.223962),
        soc: [1, 0.99, 0.96, 0.94, 0.695826, 0.2],
        voltage: Array.from({ length: 6 }, () => 19.667),
        current: Array.from({ length: 6 }, () => 17.35),
      })
    )
    const circle2 = buildDocumentComparison(
      'test-circle',
      makeResult({
        power: Array.from({ length: 6 }, () => 341.294069),
        soc: [1, 0.99, 0.96, 0.94, 0.695758, 0.2],
        time: [0, 20, 60, 120, 600, 1482.1],
      })
    )
    const circle7 = buildDocumentComparison(
      'test-circle-7',
      makeResult({
        power: Array.from({ length: 6 }, () => 578.013196),
        soc: [1, 0.99, 0.96, 0.94, 0.449874, 0.2],
        time: [0, 20, 60, 120, 600, 842.6],
      })
    )

    expect(fullSpeed.rows).toHaveLength(5)
    expect(circle2.rows).toHaveLength(3)
    expect(circle7.rows).toHaveLength(3)
    expect([...fullSpeed.rows, ...circle2.rows, ...circle7.rows].every(row => row.verdict === 'pass')).toBe(true)
  })

  it('returns a fallback comparison for unmatched mission types', () => {
    const comparison = buildDocumentComparison(null, makeResult())

    expect(comparison.rows).toEqual([])
    expect(comparison.title).toBe('未匹配文档工况')
  })
})
