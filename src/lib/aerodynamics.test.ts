import { describe, it, expect } from 'vitest'
import { StandardAtmosphere, LowSpeedDrag, AerodynamicDamping, computeDragMomentArm, computeAngleOfAttack, computeSideslipAngle } from './aerodynamics'

describe('StandardAtmosphere', () => {
  it('should return sea level density at h=0', () => {
    const atm = new StandardAtmosphere()
    const rho = atm.getDensity(0)
    expect(rho).toBeCloseTo(1.225, 3)
  })

  it('should decrease density with altitude', () => {
    const atm = new StandardAtmosphere()
    const rho0 = atm.getDensity(0)
    const rho1000 = atm.getDensity(1000)
    const rho3000 = atm.getDensity(3000)

    expect(rho1000).toBeLessThan(rho0)
    expect(rho3000).toBeLessThan(rho1000)
  })

  it('should return correct temperature at sea level', () => {
    const atm = new StandardAtmosphere()
    const T = atm.getTemperature(0)
    expect(T).toBeCloseTo(288.15, 2) // 15°C in Kelvin
  })

  it('should decrease temperature with altitude', () => {
    const atm = new StandardAtmosphere()
    const T0 = atm.getTemperature(0)
    const T1000 = atm.getTemperature(1000)

    expect(T1000).toBeLessThan(T0)
  })
})

describe('LowSpeedDrag', () => {
  it('should return zero drag at zero airspeed', () => {
    const drag = new LowSpeedDrag({
      cdx: 0.5,
      cdy: 0.5,
      cdz: 0.8,
    })

    const result = drag.compute([0, 0, 0])
    expect(result[0]).toBe(0)
    expect(result[1]).toBe(0)
    expect(result[2]).toBe(0)
  })

  it('should produce drag opposing motion', () => {
    const drag = new LowSpeedDrag({
      cdx: 0.5,
      cdy: 0.5,
      cdz: 0.8,
    })

    // Moving north (+x)
    const result = drag.compute([5, 0, 0])
    expect(result[0]).toBeLessThan(0) // drag opposes motion
    expect(result[1]).toBe(0)
    expect(result[2]).toBe(0)
  })

  it('should increase drag with speed squared', () => {
    const drag = new LowSpeedDrag({
      cdx: 1.0,
      cdy: 1.0,
      cdz: 1.0,
    })

    const f1 = drag.compute([1, 0, 0])
    const f2 = drag.compute([2, 0, 0])

    // Drag ~ v^2, so 2x speed → 4x drag force
    expect(Math.abs(f2[0])).toBeCloseTo(Math.abs(f1[0]) * 4, 1)
  })

  it('should compute drag in all three axes independently', () => {
    const drag = new LowSpeedDrag({
      cdx: 0.5,
      cdy: 0.3,
      cdz: 0.8,
    })

    const result = drag.compute([3, 4, 5])

    // Each axis drag depends on its own coefficient and speed
    expect(result[0]).toBeLessThan(0)
    expect(result[1]).toBeLessThan(0)
    expect(result[2]).toBeLessThan(0)

    // z-axis has higher coefficient, so more drag for same speed
    // But here speeds are different, so just check signs
  })

  it('scales drag with air density relative to reference', () => {
    const drag = new LowSpeedDrag({ cdx: 1.0, cdy: 1.0, cdz: 1.0, referenceDensity: 1.225 })
    const seaLevel = drag.compute([2, 0, 0], 1.225)
    const thinAir = drag.compute([2, 0, 0], 0.6125)
    expect(thinAir[0]).toBeCloseTo(seaLevel[0] * 0.5, 6)
  })

  it('computes drag moment arm about the CG', () => {
    const force: [number, number, number] = [-10, 0, 0]
    const center: [number, number, number] = [0, 0.1, 0]
    const moment = computeDragMomentArm(force, center)
    expect(moment[2]).toBeCloseTo(1, 6) // r_y * F_x with sign r×F = 0.1*(-10)? wait cross: r×F = (0.1*0 - 0*0, 0*(-10)-0*0, 0*0 - 0.1*(-10)) = (0,0,1)
    expect(moment[0]).toBeCloseTo(0, 6)
    expect(moment[1]).toBeCloseTo(0, 6)
  })
})

describe('AerodynamicDamping', () => {
  it('produces damping moment opposing angular velocity', () => {
    const damp = new AerodynamicDamping({ dwx: 0.01, dwy: 0.01, dwz: 0.02 })
    const moment = damp.compute([2, 0, 0], 1.225)
    expect(moment[0]).toBeLessThan(0)
    expect(moment[1]).toBe(0)
    expect(moment[2]).toBe(0)
  })

  it('scales damping moment with air density', () => {
    const damp = new AerodynamicDamping({ dwx: 0.01, dwy: 0.01, dwz: 0.01, referenceDensity: 1.225 })
    const m1 = damp.compute([2, 0, 0], 1.225)
    const m2 = damp.compute([2, 0, 0], 0.6125)
    expect(m2[0]).toBeCloseTo(m1[0] * 0.5, 6)
  })
})

describe('flow angles', () => {
  it('computes angle of attack from body airspeed', () => {
    expect(computeAngleOfAttack([1, 0, 1])).toBeCloseTo(Math.PI / 4, 6)
    expect(computeAngleOfAttack([0, 0, 0])).toBe(0)
  })

  it('computes sideslip angle from body airspeed', () => {
    expect(computeSideslipAngle([1, 1, 0])).toBeCloseTo(Math.PI / 4, 6)
    expect(computeSideslipAngle([0, 0, 0])).toBe(0)
  })
})
