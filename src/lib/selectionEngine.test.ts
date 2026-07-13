import { describe, expect, it } from 'vitest'
import { estimateEndurance } from './selectionEngine'
import type { DroneConfig } from '@/store/configStore'

function makeConfig(overrides: Partial<DroneConfig> = {}): DroneConfig {
  return {
    temperature: 15,
    pressure: 1013,
    altitude: 0,
    frameId: 'f450',
    totalWeight: 1.5,
    motorId: '2212-920',
    escId: 'esc-30a',
    propellerId: '9450',
    batteryCellId: 'lipo-3.7',
    batteryCells: 4,
    batteryCapacity: 5000,
    batteryDischargeRate: 25,
    batteryInternalResistance: 5,
    batteryWeight: 450,
    maxThrottlePercent: 80,
    lowVoltageThreshold: 14.0,
    missionType: 'hover',
    config: 'X',
    ...overrides,
  }
}

describe('estimateEndurance', () => {
  it('returns positive hover endurance and power for a standard config', () => {
    const result = estimateEndurance(makeConfig())
    expect(result.hover.enduranceMin).toBeGreaterThan(0)
    expect(result.hover.currentA).toBeGreaterThan(0)
    expect(result.hover.powerW).toBeGreaterThan(0)
    expect(result.hover.thrustPerMotorN).toBeCloseTo((1.5 * 9.81) / 4, 1)
  })

  it('returns lower endurance at high speed than at hover', () => {
    const result = estimateEndurance(makeConfig())
    expect(result.highSpeed.enduranceMin).toBeGreaterThan(0)
    expect(result.highSpeed.enduranceMin).toBeLessThan(result.hover.enduranceMin)
    expect(result.highSpeed.powerW).toBeGreaterThan(result.hover.powerW)
  })

  it('reports a forward pitch angle for high speed flight', () => {
    const result = estimateEndurance(makeConfig({
      frameId: 'test-frame',
      motorId: 'test-motor',
      escId: 'test-esc',
      propellerId: 'test-prop',
      batteryCellId: 'test-battery',
      batteryCells: 6,
      batteryCapacity: 8000,
      batteryInternalResistance: 0,
      totalWeight: 1.5,
    }))
    expect(result.highSpeed.pitchAngleDeg).toBeGreaterThan(0)
    expect(result.highSpeed.pitchAngleDeg).toBeLessThan(45)
  })

  it('warns when thrust is insufficient for the configured weight', () => {
    const result = estimateEndurance(makeConfig({ totalWeight: 20 }))
    expect(result.warnings.some(w => w.type === 'thrust-insufficient')).toBe(true)
  })

  it('warns when motor current exceeds ESC rating', () => {
    // Use a heavy config with a small ESC to force ESC overload without thrust insufficiency
    const result = estimateEndurance(makeConfig({
      totalWeight: 5,
      escId: 'esc-30a',
      motorId: '2212-1000',
      propellerId: '1045',
    }))
    expect(result.warnings.some(w => w.type === 'esc-overload')).toBe(true)
  })

  it('warns when total current exceeds battery max discharge current', () => {
    // Small battery with high discharge capacity but low absolute current limit
    const result = estimateEndurance(makeConfig({
      batteryCapacity: 1000,
      batteryDischargeRate: 5,
    }))
    expect(result.warnings.some(w => w.type === 'battery-overload')).toBe(true)
  })

  it('reports higher hover endurance for a larger battery capacity', () => {
    const small = estimateEndurance(makeConfig({ batteryCapacity: 3000 }))
    const large = estimateEndurance(makeConfig({ batteryCapacity: 6000 }))
    expect(large.hover.enduranceMin).toBeGreaterThan(small.hover.enduranceMin)
  })
})
