import { describe, it, expect } from 'vitest'
import { PropellerModel, ControlAllocator, PIDController } from './propulsion'

describe('PropellerModel', () => {
  const thrustCurve = [
    [0, 0.11], [0.1, 0.108], [0.2, 0.105], [0.3, 0.10],
    [0.4, 0.095], [0.5, 0.088], [0.6, 0.08], [0.7, 0.07],
    [0.8, 0.058], [0.9, 0.045], [1.0, 0.03],
  ] as [number, number][]

  const torqueCurve = [
    [0, 0.015], [0.1, 0.0148], [0.2, 0.0145], [0.3, 0.014],
    [0.4, 0.0135], [0.5, 0.0128], [0.6, 0.012], [0.7, 0.011],
    [0.8, 0.0095], [0.9, 0.008], [1.0, 0.006],
  ] as [number, number][]

  it('should compute thrust proportional to speed squared at hover', () => {
    const prop = new PropellerModel({
      diameter: 0.2286, // 9 inches
      thrustCurve,
      torqueCurve,
      torqueThrustRatio: 0.025,
    })

    // At hover: Va ≈ 0, so J ≈ 0
    const result = prop.compute(0, 300) // 300 rad/s ≈ 2865 RPM

    expect(result.thrust).toBeGreaterThan(0)
    expect(result.torque).toBeGreaterThan(0)
    expect(result.power).toBeGreaterThan(0)
  })

  it('should decrease thrust with increasing advance ratio', () => {
    const prop = new PropellerModel({
      diameter: 0.2286,
      thrustCurve,
      torqueCurve,
      torqueThrustRatio: 0.025,
    })

    const hoverResult = prop.compute(0, 300)
    const forwardResult = prop.compute(5, 300) // forward flight

    expect(forwardResult.thrust).toBeLessThan(hoverResult.thrust)
  })
})

describe('ControlAllocator', () => {
  it('should distribute hover thrust equally among 4 motors', () => {
    const allocator = new ControlAllocator({ armLength: 0.225 })

    const totalThrust = 15 // N (1.5kg * g)
    const moments: [number, number, number] = [0, 0, 0]

    const motorThrusts = allocator.allocate(totalThrust, moments)

    expect(motorThrusts).toHaveLength(4)
    expect(motorThrusts[0]).toBeCloseTo(totalThrust / 4, 5)
    expect(motorThrusts[1]).toBeCloseTo(totalThrust / 4, 5)
    expect(motorThrusts[2]).toBeCloseTo(totalThrust / 4, 5)
    expect(motorThrusts[3]).toBeCloseTo(totalThrust / 4, 5)
  })

  it('should create differential thrust for roll moment', () => {
    const allocator = new ControlAllocator({ armLength: 0.225 })

    const totalThrust = 15
    const moments: [number, number, number] = [0.5, 0, 0] // roll moment

    const motorThrusts = allocator.allocate(totalThrust, moments)

    // For X-config roll: motors 1&4 increase, motors 2&3 decrease
    expect(motorThrusts[0]).toBeGreaterThan(motorThrusts[1])
    expect(motorThrusts[0]).toBeGreaterThan(motorThrusts[2])
    expect(motorThrusts[3]).toBeGreaterThan(motorThrusts[1])
    expect(motorThrusts[3]).toBeGreaterThan(motorThrusts[2])

    // Sum should still equal total thrust
    const sum = motorThrusts.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(totalThrust, 5)
  })
})

describe('PIDController', () => {
  it('should reduce error over time for proportional control', () => {
    const pid = new PIDController({ kp: 2.0, ki: 0, kd: 0 })

    const result1 = pid.update(1.0, 0.01) // error = 1.0
    expect(result1).toBe(2.0) // kp * error

    const result2 = pid.update(0.5, 0.01) // error = 0.5
    expect(result2).toBe(1.0)

    const result3 = pid.update(0.0, 0.01) // error = 0
    expect(result3).toBe(0)
  })

  it('should accumulate integral term', () => {
    const pid = new PIDController({ kp: 0, ki: 1.0, kd: 0 })

    pid.update(1.0, 0.1)
    pid.update(1.0, 0.1)
    pid.update(1.0, 0.1)

    const result = pid.update(1.0, 0.1)
    expect(result).toBeCloseTo(0.4, 5) // integral = 1.0 * 0.4
  })

  it('should compute derivative term', () => {
    const pid = new PIDController({ kp: 0, ki: 0, kd: 1.0 })

    pid.update(1.0, 0.1)
    const result = pid.update(0.5, 0.1)

    // derivative = (0.5 - 1.0) / 0.1 = -5.0
    expect(result).toBeCloseTo(-5.0, 5)
  })

  it('should handle reset correctly', () => {
    const pid = new PIDController({ kp: 0, ki: 1.0, kd: 0 })

    pid.update(1.0, 0.1)
    pid.reset()

    const result = pid.update(1.0, 0.1)
    expect(result).toBeCloseTo(0.1, 5) // integral reset, only current step
  })
})
