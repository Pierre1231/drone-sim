import { describe, expect, it } from 'vitest'
import { runSimulation } from './simulation'
import { buildDocAlignedSimConfig } from './presets'
import { createDocumentControllerGains } from './controller'
import { quatToEuler } from './dynamics'

describe('control-law position step', () => {
  it('returns toward a one-metre horizontal target after overshoot', () => {
    const gains = createDocumentControllerGains()
    gains.positionKp = [0.5, 0.5, 0.5]
    gains.positionKi = [0, 0, 0]
    gains.velocityKp = [0.5, 0.5, 0.5]
    gains.velocityKi = [0, 0, 0]
    gains.velocityKd = [0.02, 0.02, 0.02]

    const result = runSimulation({
      ...buildDocAlignedSimConfig('test-hover'),
      missionType: 'step-position',
      stepAxis: 0,
      initialPropulsionState: undefined,
      initialState: {
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        quaternion: [1, 0, 0, 0],
        angularVelocity: [0, 0, 0],
      },
      controllerGains: gains,
      controllerLimits: {
        maxVelocity: [0.75, 0.75, 1],
        maxAcceleration: [0.15, 0.15, 0.5],
        maxAngularVelocity: [3, 3, 2],
        maxMoment: [1, 1, 0.5],
      },
      maxSimTime: 12,
    })

    const x = result.position.map(position => position[0])
    const peak = Math.max(...x)
    const final = x.at(-1) ?? 0
    const maxPitch = Math.max(...result.quaternion.map(q => (
      Math.abs(quatToEuler(q as [number, number, number, number])[1])
    )))

    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThan(1.25)
    expect(final).toBeLessThan(peak - 0.05)
    expect(Math.abs(final - 1)).toBeLessThan(0.1)
    expect(maxPitch).toBeLessThan(5 * Math.PI / 180)
  })

  it.each([0, 1, 2] as const)('keeps axis %i response bounded', (axis) => {
    const gains = createDocumentControllerGains()
    gains.positionKp = [0.5, 0.5, 0.5]
    gains.positionKi = [0, 0, 0]
    gains.velocityKp = [0.5, 0.5, 0.5]
    gains.velocityKi = [0, 0, 0]
    gains.velocityKd = [0.02, 0.02, 0.02]

    const result = runSimulation({
      ...buildDocAlignedSimConfig('test-hover'),
      missionType: 'step-position',
      stepAxis: axis,
      stepAmplitude: axis === 2 ? -1 : 1,
      initialPropulsionState: undefined,
      initialState: {
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        quaternion: [1, 0, 0, 0],
        angularVelocity: [0, 0, 0],
      },
      controllerGains: gains,
      controllerLimits: {
        maxVelocity: [0.75, 0.75, 1],
        maxAcceleration: [0.15, 0.15, 0.5],
        maxAngularVelocity: [3, 3, 2],
        maxMoment: [1, 1, 0.5],
      },
      maxSimTime: 12,
    })

    const response = result.position.map(position => position[axis])
    const final = response.at(-1) ?? 0
    expect(Math.max(...response.map(Math.abs))).toBeLessThan(1.5)
    const target = axis === 2 ? -1 : 1
    expect(Math.abs(final - target)).toBeLessThan(0.25)
  })
})
