import { describe, it, expect } from 'vitest'
import { buildDocAlignedSimConfig } from './presets'
import { runSimulation } from './simulation'

describe('doc-aligned preset', () => {
  it('test-standard preset produces the doc default SimConfig', () => {
    const config = buildDocAlignedSimConfig('test-circle')

    expect(config.droneConfig.frameId).toBe('test-frame')
    expect(config.droneConfig.motorId).toBe('test-motor')
    expect(config.droneConfig.propellerId).toBe('test-prop')
    expect(config.droneConfig.escId).toBe('test-esc')
    expect(config.droneConfig.batteryCellId).toBe('test-battery')
    expect(config.droneConfig.batteryCells).toBe(6)
    expect(config.droneConfig.batteryCapacity).toBe(8000)
    expect(config.droneConfig.totalWeight).toBeCloseTo(1.5, 6)

    expect(config.motorParams.backEmfCoeff).toBeCloseTo(0.02, 6)
    expect(config.motorParams.torqueCoeff).toBeCloseTo(0.02, 6)
    expect(config.motorParams.resistance).toBeCloseTo(0.1, 6)
    expect(config.motorParams.rotorInertia).toBeCloseTo(2e-5, 9)

    expect(config.propParams.diameter).toBeCloseTo(0.254, 6)
    expect(config.propParams.thrustCurve[0][1]).toBeCloseTo(0.1393674, 6)
    expect(config.propParams.torqueCurve[0][1]).toBeCloseTo(0.0243863, 6)

    expect(config.batteryParams.cells).toBe(6)
    expect(config.batteryParams.capacityAh).toBe(8)
    expect(config.batteryParams.internalResistance).toBeCloseTo(0.05, 6)
    expect(config.batteryParams.dynamicResistance).toBeCloseTo(0.02, 6)

    expect(config.armLength).toBeCloseTo(0.23, 6)
    expect(config.config).toBe('X')
  })

  it('doc-aligned hover mission starts from the B01 propulsion trim point', () => {
    const config = buildDocAlignedSimConfig('test-hover')

    expect(config.initialPropulsionState?.motorSpeeds).toEqual([
      452.078533,
      452.078533,
      452.078533,
      452.078533,
    ])
    expect(config.initialPropulsionState?.motorCurrents).toEqual([8.175, 8.175, 8.175, 8.175])
    expect(config.initialPropulsionState?.dutyCycles).toEqual([0.410998, 0.410998, 0.410998, 0.410998])
  })

  it('doc-aligned circle mission tracks the 2 m/s reference', () => {
    const result = runSimulation({
      ...buildDocAlignedSimConfig('test-circle'),
      maxSimTime: 120,
    })

    const stableStartIdx = result.time.findIndex(t => t >= 10)
    const stableEndIdx = result.time.findIndex(t => t >= 60)
    const endIdx = stableEndIdx > 0 ? stableEndIdx : result.time.length

    const positions = result.position.slice(stableStartIdx, endIdx)
    const vx = result.velocity.slice(stableStartIdx, endIdx).map(v => v[0])
    const vy = result.velocity.slice(stableStartIdx, endIdx).map(v => v[1])

    const avgSpeed =
      vx.reduce((s, v, i) => s + Math.sqrt(v * v + vy[i] * vy[i]), 0) / vx.length

    const xs = positions.map(p => p[0])
    const ys = positions.map(p => p[1])
    const rx = (Math.max(...xs) - Math.min(...xs)) / 2
    const ry = (Math.max(...ys) - Math.min(...ys)) / 2

    expect(avgSpeed).toBeCloseTo(2, 0)
    expect(rx).toBeCloseTo(5, 0)
    expect(ry).toBeCloseTo(5, 0)

    const powers = result.power.slice(stableStartIdx, endIdx)
    const avgPower = powers.reduce((s, p) => s + p, 0) / powers.length
    expect(avgPower).toBeCloseTo(341.3, -1)
  })

  it('doc-aligned circle mission also supports the 7 m/s endurance case', () => {
    const config = buildDocAlignedSimConfig('test-circle-7')

    expect(config.missionParams?.radius).toBe(5)
    expect(config.missionParams?.speed).toBe(7)
    expect(config.maxSimTime).toBeGreaterThan(842.6)
  })

  it('doc-aligned circle mission controls the 7 m/s reference to the SOC cutoff', () => {
    const result = runSimulation(buildDocAlignedSimConfig('test-circle-7'))
    const stableStartIdx = result.time.findIndex(t => t >= 20)
    const stableEndIdx = result.time.findIndex(t => t >= 120)
    const endIdx = stableEndIdx > 0 ? stableEndIdx : result.time.length

    const positions = result.position.slice(stableStartIdx, endIdx)
    const velocities = result.velocity.slice(stableStartIdx, endIdx)
    const avg = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length
    const avgRadius = avg(positions.map(p => Math.hypot(p[0], p[1])))
    const avgSpeed = avg(velocities.map(v => Math.hypot(v[0], v[1])))

    expect(avgRadius).toBeCloseTo(5, 0)
    expect(avgSpeed).toBeCloseTo(7, 0)

    const last = result.time.length - 1
    expect(result.soc[last]).toBeCloseTo(0.2, 2)
    expect(Math.abs(result.time[last] - 842.6)).toBeLessThanOrEqual(80)
  }, 120000)

  it('doc-aligned fullspeed mission tracks 5 m/s level flight', () => {
    const result = runSimulation(buildDocAlignedSimConfig('fullspeed'))

    const stableStartIdx = result.time.findIndex(t => t >= 60)
    expect(stableStartIdx).toBeGreaterThan(0)

    const vx = result.velocity.slice(stableStartIdx).map(v => v[0])
    const avgSpeed = vx.reduce((s, v) => s + Math.abs(v), 0) / vx.length
    expect(avgSpeed).toBeCloseTo(5, 0)

    const altitudes = result.position.slice(stableStartIdx).map(p => -p[2])
    expect(altitudes.every(z => Math.abs(z - 5) < 0.5)).toBe(true)

    const powers = result.power.slice(stableStartIdx)
    const avgPower = powers.reduce((s, p) => s + p, 0) / powers.length
    expect(avgPower).toBeCloseTo(341.2, -1)
  }, 30000)

  it('doc test-hover stops at the SOC cutoff instead of adding a landing tail', () => {
    const base = buildDocAlignedSimConfig('test-hover')
    const result = runSimulation({
      ...base,
      maxSimTime: 2000,
    })

    const last = result.time.length - 1
    expect(result.time[last]).toBeCloseTo(1491, -1)
    expect(result.position[last][2]).toBeLessThan(-4)
  }, 120000)
})
