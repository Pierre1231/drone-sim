import { describe, expect, it } from 'vitest'
import { createDocumentControllerGains } from './controller'
import { computeStepResponseMetrics } from './controlMetrics'
import { quatToEuler } from './dynamics'
import { buildDocAlignedSimConfig } from './presets'
import { runSimulation, type SimConfig } from './simulation'

function tuningGains() {
  const gains = createDocumentControllerGains()
  gains.positionKp = [0.5, 0.5, 0.5]
  gains.positionKi = [0, 0, 0]
  gains.velocityKp = [0.5, 0.5, 0.5]
  gains.velocityKi = [0, 0, 0]
  gains.velocityKd = [0.02, 0.02, 0.02]
  return gains
}

function baseStepConfig(missionType: SimConfig['missionType'], maxSimTime: number): SimConfig {
  return {
    ...buildDocAlignedSimConfig('test-hover'),
    missionType,
    initialState: {
      position: [0, 0, 0],
      velocity: [0, 0, 0],
      quaternion: [1, 0, 0, 0],
      angularVelocity: [0, 0, 0],
    },
    initialPropulsionState: undefined,
    controllerGains: tuningGains(),
    maxSimTime,
  }
}

describe('control-law inner-loop step responses', () => {
  it('tracks velocity without position-loop interference', () => {
    const result = runSimulation({
      ...baseStepConfig('step-velocity', 8),
      stepAxis: 0,
      stepAmplitude: 1,
    })
    const metrics = computeStepResponseMetrics(result.time, result.velocity.map(value => value[0]), 1)!

    expect(Math.abs(metrics.steadyStateError)).toBeLessThan(0.05)
    expect(metrics.overshootPercent).toBeLessThan(5)
    expect(metrics.settlingTime).not.toBeNull()
    expect(metrics.settlingTime!).toBeLessThan(8)
  })

  it('tracks a five-degree pitch step', () => {
    const target = 5 * Math.PI / 180
    const result = runSimulation({
      ...baseStepConfig('step-attitude', 5),
      stepAxis: 1,
      stepAmplitude: target,
    })
    const pitch = result.quaternion.map(q => quatToEuler(q as [number, number, number, number])[1])
    const metrics = computeStepResponseMetrics(result.time, pitch, target)!

    expect(Math.abs(metrics.steadyStateError)).toBeLessThan(0.002)
    expect(metrics.overshootPercent).toBeLessThan(15)
    expect(metrics.settlingTime).not.toBeNull()
    expect(metrics.settlingTime!).toBeLessThan(2)
  })

  it('tracks a body-rate step and records the commanded moment', () => {
    const result = runSimulation({
      ...baseStepConfig('step-rate', 5),
      stepAxis: 0,
      stepAmplitude: 0.5,
    })
    const metrics = computeStepResponseMetrics(result.time, result.angularVelocity.map(value => value[0]), 0.5)!

    expect(Math.abs(metrics.steadyStateError)).toBeLessThan(0.03)
    expect(metrics.overshootPercent).toBeLessThan(5)
    expect(metrics.settlingTime).not.toBeNull()
    expect(result.commandedMoments).toHaveLength(result.time.length)
  })
})
