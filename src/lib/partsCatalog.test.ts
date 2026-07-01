import { describe, expect, it } from 'vitest'
import type { DroneConfig } from '@/store/configStore'
import type { PartsDatabase } from '@/types/parts'
import { mat3, vec3 } from './coordinates'
import { createPartsCatalog } from './partsCatalog'

const baseConfig: DroneConfig = {
  temperature: 15,
  pressure: 1013,
  altitude: 0,
  frameId: 'frame',
  totalWeight: 1.5,
  motorId: 'motor',
  escId: 'esc',
  propellerId: 'prop',
  batteryCellId: 'cell',
  batteryCells: 6,
  batteryCapacity: 8000,
  batteryDischargeRate: 25,
  batteryInternalResistance: 5,
  batteryWeight: 450,
  maxThrottlePercent: 100,
  lowVoltageThreshold: 16.8,
  missionType: 'hover',
  config: 'X',
}

const catalogData: PartsDatabase = {
  frames: [{
    id: 'frame',
    name: 'Frame',
    mass: 0.3,
    wheelbase: 500,
    inertiaMatrix: mat3(0.01, 0, 0, 0, 0.02, 0, 0, 0, 0.03),
    propPositions: [],
    propDirections: [],
    torqueSigns: [1, -1, 1, -1],
    aeroRefArea: 0.1,
    aeroRefSpan: 0.5,
    aeroRefChord: 0.1,
    dragCoeffs: { cdx: 0.4, cdy: 0.5, cdz: 0.6 },
    dragCenter: vec3(0.01, 0.02, 0.03),
    dampingCoeffs: { dwx: 0.1, dwy: 0.2, dwz: 0.3 },
  }],
  motors: [{
    id: 'motor',
    name: 'Motor',
    mass: 0.05,
    kv: 900,
    resistance: 0.1,
    backEmfCoeff: 0.02,
    torqueCoeff: 0.02,
    rotorInertia: 2e-5,
    viscousDamping: 0,
    noLoadCurrent: 0.5,
  }],
  propellers: [{
    id: 'prop',
    name: 'Prop',
    mass: 0.01,
    diameter: 0.254,
    thrustCurve: [[0, 0.1]],
    torqueCurve: [[0, 0.01]],
    torqueThrustRatio: 0.04,
  }],
  batteryCells: [{
    id: 'cell',
    name: 'Cell',
    type: 'LiPo',
    ocvCoeffs: [3.3, 0.9, 0, 0],
    internalResistance: 0.002,
    maxDischargeRate: 30,
    dynamicResistance: 0.001,
    polarizationTau: 20,
  }],
  escs: [{
    id: 'esc',
    name: 'ESC',
    mass: 0.02,
    maxCurrent: 30,
    resistance: 0.004,
    responseTimeConstant: 0.05,
    throttleExponent: 1.2,
    wireResistance: 0.002,
    switchingLossCoeff: 0.001,
    pwmFrequency: 24000,
    maxSpeedFactor: 50,
  }],
}

describe('parts catalog', () => {
  it('resolves selected parts and derived electrical and geometry defaults', () => {
    const resolved = createPartsCatalog(catalogData).resolveSelectedParts(baseConfig)

    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.parts.frame?.id).toBe('frame')
    expect(resolved.derived.armLength).toBeCloseTo(0.25)
    expect(resolved.derived.inertia).toEqual([0.01, 0.02, 0.03])
    expect(resolved.derived.batteryParams.internalResistance).toBeCloseTo(0.017)
    expect(resolved.derived.batteryParams.maxDischargeCurrent).toBe(240)
    expect(resolved.derived.escParams.maxSpeedAtNominalVoltage).toBeCloseTo(1110)
    expect(resolved.derived.dragParams).toEqual({ cdx: 0.4, cdy: 0.5, cdz: 0.6, referenceDensity: 1.225 })
  })

  it('returns displayable validation errors for missing required parts', () => {
    const resolved = createPartsCatalog({ ...catalogData, motors: [] }).resolveSelectedParts(baseConfig)

    expect(resolved.ok).toBe(false)
    if (resolved.ok) return
    expect(resolved.errors).toContain('Motor not found: motor')
  })

  it('uses defaults for optional frame, battery, and ESC fields', () => {
    const data: PartsDatabase = {
      ...catalogData,
      frames: [],
      batteryCells: [],
      escs: [],
    }
    const resolved = createPartsCatalog(data).resolveSelectedParts(baseConfig)

    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.parts.frame).toBeUndefined()
    expect(resolved.parts.batteryCell).toBeUndefined()
    expect(resolved.parts.esc).toBeUndefined()
    expect(resolved.derived.armLength).toBeCloseTo(0.225)
    expect(resolved.derived.frameMass).toBe(0.28)
    expect(resolved.derived.batteryParams.ocvCoeffs).toEqual([3.0, 3.5, -2.0, 1.0])
    expect(resolved.derived.escParams.resistance).toBe(0.003)
  })
})
