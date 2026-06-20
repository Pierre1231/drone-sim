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
      diameter: 0.2286,
      thrustCurve,
      torqueCurve,
      torqueThrustRatio: 0.025,
    })

    const result = prop.compute(0, 300)
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
    const forwardResult = prop.compute(5, 300)
    expect(forwardResult.thrust).toBeLessThan(hoverResult.thrust)
  })

  it('matches static thrust model T = k_T(ρ) ω² at zero advance velocity', () => {
    const prop = new PropellerModel({
      diameter: 0.2286,
      thrustCurve,
      torqueCurve,
      torqueThrustRatio: 0.025,
    })
    const omega = 300
    const rho = 1.225
    const kT = prop.getStaticThrustCoefficient(rho)
    const expectedThrust = kT * omega * omega
    const result = prop.compute(0, omega, rho)
    expect(result.thrust).toBeCloseTo(expectedThrust, 6)
  })

  it('scales thrust with air density', () => {
    const prop = new PropellerModel({
      diameter: 0.2286,
      thrustCurve,
      torqueCurve,
      torqueThrustRatio: 0.025,
    })
    const omega = 300
    const seaLevel = prop.compute(0, omega, 1.225)
    const highAltitude = prop.compute(0, omega, 0.819)
    expect(highAltitude.thrust).toBeLessThan(seaLevel.thrust)
    expect(highAltitude.thrust / seaLevel.thrust).toBeCloseTo(0.819 / 1.225, 4)
  })

  it('computes target omega from desired thrust', () => {
    const prop = new PropellerModel({
      diameter: 0.2286,
      thrustCurve,
      torqueCurve,
      torqueThrustRatio: 0.025,
    })
    const omega = prop.getTargetOmega(8, 1.225)
    const result = prop.compute(0, omega, 1.225)
    expect(result.thrust).toBeCloseTo(8, 6)
  })
})

describe('ControlAllocator', () => {
  const L = 0.225
  const X_positions: [number, number, number][] = [
    [L, L, 0],
    [-L, L, 0],
    [-L, -L, 0],
    [L, -L, 0],
  ]
  const directions: [number, number, number][] = [
    [0, 0, -1],
    [0, 0, -1],
    [0, 0, -1],
    [0, 0, -1],
  ]

  it('should distribute hover thrust equally among 4 motors in X config', () => {
    const allocator = new ControlAllocator({
      positions: X_positions,
      directions,
      torqueSigns: [-1, 1, -1, 1],
      torqueThrustRatio: 0.025,
    })

    const totalThrust = 15
    const result = allocator.allocateWithResidual(totalThrust, [0, 0, 0])

    expect(result.thrusts).toHaveLength(4)
    result.thrusts.forEach(t => expect(t).toBeCloseTo(totalThrust / 4, 5))
    expect(result.residual.every(r => Math.abs(r) < 1e-9)).toBe(true)
  })

  it('should create differential thrust for roll moment in X config', () => {
    const allocator = new ControlAllocator({
      positions: X_positions,
      directions,
      torqueSigns: [-1, 1, -1, 1],
      torqueThrustRatio: 0.025,
    })

    // Positive roll moment is produced by rotors on the left side (negative y)
    const result = allocator.allocateWithResidual(15, [0.5, 0, 0])

    expect(result.thrusts[2]).toBeGreaterThan(result.thrusts[0])
    expect(result.thrusts[2]).toBeGreaterThan(result.thrusts[1])
    expect(result.thrusts[3]).toBeGreaterThan(result.thrusts[0])
    expect(result.thrusts[3]).toBeGreaterThan(result.thrusts[1])

    const sum = result.thrusts.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(15, 5)
  })

  it('should produce yaw moment from differential thrust in X config', () => {
    const kappa = 0.025
    const allocator = new ControlAllocator({
      positions: X_positions,
      directions,
      torqueSigns: [-1, 1, -1, 1],
      torqueThrustRatio: kappa,
    })

    const result = allocator.allocateWithResidual(15, [0, 0, 0.1])
    const yaw = kappa * (result.thrusts[0] - result.thrusts[1] + result.thrusts[2] - result.thrusts[3])
    expect(yaw).toBeCloseTo(0.1, 5)
  })

  it('should use l/√2 moment arm for X config', () => {
    const arm = 0.2
    const positions: [number, number, number][] = [
      [arm, arm, 0],
      [-arm, arm, 0],
      [-arm, -arm, 0],
      [arm, -arm, 0],
    ]
    const allocator = new ControlAllocator({
      positions,
      directions,
      torqueSigns: [-1, 1, -1, 1],
      torqueThrustRatio: 0.025,
    })

    const result = allocator.allocateWithResidual(10, [0.1, 0, 0])
    const sumPos = result.thrusts[2] + result.thrusts[3]
    const sumNeg = result.thrusts[0] + result.thrusts[1]
    const moment = arm * (sumPos - sumNeg)
    expect(moment).toBeCloseTo(0.1, 5)
  })

  it('should return non-zero residual when a motor saturates at T_max', () => {
    const allocator = new ControlAllocator({
      positions: X_positions,
      directions,
      torqueSigns: [-1, 1, -1, 1],
      torqueThrustRatio: 0.025,
    })

    const result = allocator.allocateWithResidual(20, [2, 0, 0], { T_max: 2 })
    expect(result.thrusts.some(t => Math.abs(t - 2) < 1e-6)).toBe(true)
    expect(result.residual.some(r => Math.abs(r) > 1e-3)).toBe(true)
  })

  it('reduces allocation residual by solving a constrained QP instead of clipping', () => {
    const allocator = new ControlAllocator({
      positions: X_positions,
      directions,
      torqueSigns: [-1, 1, -1, 1],
      torqueThrustRatio: 0.025,
    })

    // Demand that pushes multiple rotors against both upper and lower bounds.
    const result = allocator.allocateWithResidual(8, [0.8, 0.8, 0.2], { T_max: 3.5 })

    result.thrusts.forEach((t) => {
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThanOrEqual(3.5 + 1e-9)
    })

    const residualNorm = Math.sqrt(result.residual.reduce((s, r) => s + r * r, 0))
    // Simple clipping gives a residual norm around 1.0; the QP should do much better.
    expect(residualNorm).toBeLessThan(0.5)
  })

  it('should penalize thrust changes when lambda is non-zero', () => {
    const allocator = new ControlAllocator({
      positions: X_positions,
      directions,
      torqueSigns: [-1, 1, -1, 1],
      torqueThrustRatio: 0.025,
      lambda: 10,
    })

    const prev = [4, 4, 4, 4]
    const result = allocator.allocateWithResidual(16, [0.2, 0, 0], { previousThrust: prev })

    // Thrusts should deviate less from the previous vector than an unconstrained solution
    const deviation = result.thrusts.reduce((s, t, i) => s + Math.abs(t - prev[i]), 0)
    expect(deviation).toBeGreaterThan(0)
    expect(deviation).toBeLessThan(2)
  })
})

describe('PIDController', () => {
  it('should reduce error over time for proportional control', () => {
    const pid = new PIDController({ kp: 2.0, ki: 0, kd: 0 })

    expect(pid.update(1.0, 0.01)).toBe(2.0)
    expect(pid.update(0.5, 0.01)).toBe(1.0)
    expect(pid.update(0.0, 0.01)).toBe(0)
  })

  it('should accumulate integral term', () => {
    const pid = new PIDController({ kp: 0, ki: 1.0, kd: 0 })

    pid.update(1.0, 0.1)
    pid.update(1.0, 0.1)
    pid.update(1.0, 0.1)

    expect(pid.update(1.0, 0.1)).toBeCloseTo(0.4, 5)
  })

  it('should compute derivative term', () => {
    const pid = new PIDController({ kp: 0, ki: 0, kd: 1.0 })

    pid.update(1.0, 0.1)
    const result = pid.update(0.5, 0.1)

    expect(result).toBeCloseTo(-5.0, 5)
  })

  it('should handle reset correctly', () => {
    const pid = new PIDController({ kp: 0, ki: 1.0, kd: 0 })

    pid.update(1.0, 0.1)
    pid.reset()

    expect(pid.update(1.0, 0.1)).toBeCloseTo(0.1, 5)
  })
})
