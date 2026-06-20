import { describe, it, expect } from 'vitest'
import { integrate, createState, simulateMultiRate, type ForcesAndMoments } from './dynamics'

describe('dynamics', () => {
  const dt = 0.001 // 1ms step

  it('should keep position stable in hover condition', () => {
    const state = createState({ mass: 1.5 })
    const forces: ForcesAndMoments = {
      totalForceBody: [0, 0, -1.5 * 9.81], // thrust = weight, upward
      totalMomentBody: [0, 0, 0],
    }

    // Integrate for 1 second
    let current = state
    for (let i = 0; i < 1000; i++) {
      current = integrate(current, forces, dt)
    }

    // Position should remain near origin (small numerical drift allowed)
    expect(current.position[0]).toBeCloseTo(0, 1)
    expect(current.position[1]).toBeCloseTo(0, 1)
    expect(current.position[2]).toBeCloseTo(0, 1)

    // Velocity should be near zero
    expect(current.velocity[0]).toBeCloseTo(0, 1)
    expect(current.velocity[1]).toBeCloseTo(0, 1)
    expect(current.velocity[2]).toBeCloseTo(0, 1)

    // Quaternion should remain near identity
    expect(current.quaternion[0]).toBeCloseTo(1, 2)
    expect(current.quaternion[1]).toBeCloseTo(0, 1)
    expect(current.quaternion[2]).toBeCloseTo(0, 1)
    expect(current.quaternion[3]).toBeCloseTo(0, 1)
  })

  it('should ascend when thrust > weight', () => {
    const state = createState({ mass: 1.5 })
    const forces: ForcesAndMoments = {
      totalForceBody: [0, 0, -1.5 * 9.81 * 1.5], // 1.5x weight
      totalMomentBody: [0, 0, 0],
    }

    let current = state
    for (let i = 0; i < 1000; i++) {
      current = integrate(current, forces, dt)
    }

    // Should have positive upward velocity (NED: z is down, so negative z velocity means ascending)
    // Wait — in NED, thrust is upward = negative z direction. So ascending means position z decreases.
    expect(current.velocity[2]).toBeLessThan(-0.1)
    expect(current.position[2]).toBeLessThan(-0.01)
  })

  it('should rotate when moment is applied', () => {
    const state = createState({ mass: 1.5 })
    const forces: ForcesAndMoments = {
      totalForceBody: [0, 0, -1.5 * 9.81], // hover thrust
      totalMomentBody: [0.1, 0, 0], // roll moment
    }

    let current = state
    for (let i = 0; i < 1000; i++) {
      current = integrate(current, forces, dt)
    }

    // Should have non-zero angular velocity around x axis
    expect(Math.abs(current.angularVelocity[0])).toBeGreaterThan(0.01)

    // Quaternion should deviate from identity
    const identityDeviation = Math.abs(current.quaternion[1]) +
                               Math.abs(current.quaternion[2]) +
                               Math.abs(current.quaternion[3])
    expect(identityDeviation).toBeGreaterThan(0.001)
  })

  it('should maintain quaternion normalization', () => {
    const state = createState({ mass: 1.5 })
    const forces: ForcesAndMoments = {
      totalForceBody: [0, 0, -1.5 * 9.81],
      totalMomentBody: [0.1, 0.05, 0.03],
    }

    let current = state
    for (let i = 0; i < 5000; i++) {
      current = integrate(current, forces, dt)
    }

    // Quaternion must remain normalized
    const norm = Math.sqrt(
      current.quaternion[0] ** 2 +
      current.quaternion[1] ** 2 +
      current.quaternion[2] ** 2 +
      current.quaternion[3] ** 2
    )
    expect(norm).toBeCloseTo(1, 6)
  })
})

describe('multi-rate integration', () => {
  it('runs 100 fast steps for each slow step and keeps state synchronized', () => {
    const fastDt = 0.001
    const slowDt = 0.1
    const endTime = 0.5
    const forces: ForcesAndMoments = {
      totalForceBody: [0, 0, -1.5 * 9.81],
      totalMomentBody: [0, 0, 0],
    }

    let fastCount = 0
    let slowCount = 0
    let lastFastTime = -1
    let lastSlowTime = -1

    const final = simulateMultiRate({
      fastDt,
      slowDt,
      endTime,
      initialState: createState({ mass: 1.5 }),
      params: { mass: 1.5, inertia: [0.02, 0.02, 0.03] },
      forces: () => forces,
      onFast: (_state, time) => {
        fastCount++
        lastFastTime = time
      },
      onSlow: (_state, time) => {
        slowCount++
        lastSlowTime = time
      },
    })

    expect(fastCount).toBe(endTime / fastDt)
    expect(slowCount).toBe(endTime / slowDt)
    expect(lastFastTime).toBeCloseTo(endTime, 6)
    expect(lastSlowTime).toBeCloseTo(endTime, 6)
    // Hover force should keep the drone near the origin across all rates.
    expect(final.position[2]).toBeCloseTo(0, 3)
    expect(final.velocity[2]).toBeCloseTo(0, 3)
  })
})
