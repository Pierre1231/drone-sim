import { describe, expect, it } from 'vitest'
import { computeStepResponseMetrics } from './controlMetrics'

describe('computeStepResponseMetrics', () => {
  it('computes rise time, overshoot, settling and steady-state error', () => {
    const metrics = computeStepResponseMetrics(
      [0, 0.5, 1, 1.5, 2, 2.5, 3],
      [0, 0, 0.2, 0.95, 1.1, 1.01, 1],
      1,
    )
    expect(metrics).not.toBeNull()
    expect(metrics?.riseTime).toBe(0.5)
    expect(metrics?.overshootPercent).toBeCloseTo(10)
    expect(metrics?.settlingTime).toBe(2)
    expect(metrics?.steadyStateError).toBeCloseTo(0)
    expect(metrics?.diverged).toBe(false)
  })

  it('handles negative NED altitude steps', () => {
    const metrics = computeStepResponseMetrics([0, 0.5, 1, 2], [0, 0, -0.5, -1], -1)
    expect(metrics?.riseTime).toBe(1)
    expect(metrics?.overshootPercent).toBe(0)
    expect(metrics?.steadyStateError).toBeCloseTo(0)
  })

  it('marks responses far beyond the requested amplitude as diverged', () => {
    const metrics = computeStepResponseMetrics([0, 0.5, 1], [0, 0, 12], 1)
    expect(metrics?.diverged).toBe(true)
  })
})
