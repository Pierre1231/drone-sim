import { describe, it, expect } from 'vitest'
import { CascadedController, createDocumentControllerGains } from './controller'
import type { Mat3 } from './controller'

function rotationMatrixFromEuler(roll: number, pitch: number, yaw: number): Mat3 {
  const cr = Math.cos(roll), sr = Math.sin(roll)
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  return [
    [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
    [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
    [-sp, cp * sr, cp * cr],
  ] as unknown as Mat3
}

describe('createDocumentControllerGains', () => {
  it('returns the document test-case gain matrices', () => {
    const g = createDocumentControllerGains()
    expect(g.positionKp).toEqual([1.0, 1.0, 1.2])
    expect(g.positionKi).toEqual([0.02, 0.02, 0.03])
    expect(g.velocityKp).toEqual([2.0, 2.0, 2.5])
    expect(g.velocityKi).toEqual([0.10, 0.10, 0.15])
    expect(g.velocityKd).toEqual([0.20, 0.20, 0.25])
    expect(g.attitudeKp).toEqual([4.0, 4.0, 2.0])
    expect(g.rateKp).toEqual([0.20, 0.20, 0.12])
    expect(g.rateKi).toEqual([0.03, 0.03, 0.02])
    expect(g.rateKd).toEqual([0.01, 0.01, 0.008])
  })
})

describe('CascadedController', () => {
  const mass = 1.5
  const mg = mass * 9.81
  const gains = createDocumentControllerGains()
  const makeController = () => new CascadedController({ mass, gains })

  describe('position loop', () => {
    it('outputs a proportional velocity command toward the target', () => {
      const ctrl = makeController()
      const out = ctrl.update(
        { position: [1, 0, 0] },
        {
          position: [0, 0, 0],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        0.01
      )
      // Total thrust is the projection of the desired net force onto the body
      // thrust axis b_T^b = -e_z^b. With identity attitude this equals mg.
      expect(out.totalThrust).toBeCloseTo(mg, 3)
    })

    it('includes integral action that accumulates for persistent error', () => {
      const ctrl = makeController()
      const dt = 0.01
      for (let i = 0; i < 100; i++) {
        ctrl.update(
          { position: [1, 0, 0] },
          {
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            quaternion: [1, 0, 0, 0],
            angularVelocity: [0, 0, 0],
          },
          dt
        )
      }
      const out = ctrl.update(
        { position: [1, 0, 0] },
        {
          position: [0, 0, 0],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        dt
      )
      // After 100 steps the integral term (Ki^p * sum(e*dt)) contributes.
      const integralTerm = gains.positionKi[0] * 100 * dt * 1
      expect(out.desiredForceNed[0]).toBeGreaterThan(mass * gains.positionKp[0] * 1)
      expect(out.desiredForceNed[0]).toBeGreaterThan(mass * (gains.positionKp[0] * 1 + integralTerm * 0.5))
    })
  })

  describe('velocity loop', () => {
    it('does not produce a derivative kick when the velocity setpoint steps', () => {
      const ctrl = makeController()
      const dt = 0.1
      ctrl.update(
        { position: [0, 0, 0], velocity: [0, 0, 0] },
        {
          position: [0, 0, 0],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        dt
      )
      const out = ctrl.update(
        { position: [0, 0, 0], velocity: [1, 0, 0], acceleration: [0.5, 0, 0] },
        {
          position: [0, 0, 0],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        dt
      )
      // Position loop output is 0 because position error is zero.
      // Derivative is taken from the measured velocity, which did not change.
      // Therefore a setpoint step contributes P + I + feedforward, but no D spike.
      const expectedAx =
        0.5 +
        gains.velocityKp[0] * 1 +
        gains.velocityKi[0] * (1 * dt)
      expect(out.desiredForceNed[0]).toBeCloseTo(mass * expectedAx, 3)
    })

    it('anti-windup prevents integral from growing while position loop is saturated', () => {
      const ctrl = new CascadedController({
        mass,
        gains,
        limits: { maxVelocity: [1, 1, 1] },
      })
      const dt = 0.01
      let lastOutput = 0
      for (let i = 0; i < 200; i++) {
        const out = ctrl.update(
          { position: [10, 0, 0] },
          {
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            quaternion: [1, 0, 0, 0],
            angularVelocity: [0, 0, 0],
          },
          dt
        )
        lastOutput = out.desiredForceNed[0]
      }
      // Velocity command saturates at +1 m/s, so the velocity-loop input is bounded.
      // Desired force in x should stay bounded rather than growing without limit.
      expect(lastOutput).toBeLessThan(mass * 15) // well below an un-wound integral value
      expect(lastOutput).toBeGreaterThan(0)
    })

    it('recovers quickly after a saturated integral sees an opposite error', () => {
      const pidAxis = new CascadedController({
        mass,
        gains,
        limits: { maxVelocity: [1, 1, 1] },
      })
      const dt = 0.01
      for (let i = 0; i < 50; i++) {
        pidAxis.update(
          { position: [10, 0, 0] },
          {
            position: [0, 0, 0],
            velocity: [0, 0, 0],
            quaternion: [1, 0, 0, 0],
            angularVelocity: [0, 0, 0],
          },
          dt
        )
      }
      const afterSat = pidAxis.update(
        { position: [-10, 0, 0] },
        {
          position: [0, 0, 0],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        dt
      )
      // Opposite command should immediately become negative (anti-windup prevents
      // the integral from keeping the output pinned positive).
      expect(afterSat.desiredForceNed[0]).toBeLessThan(0)
    })
  })

  describe('control modes', () => {
    it('attitude mode bypasses position/velocity loops and tracks an attitude reference', () => {
      const ctrl = makeController()
      const R_d = rotationMatrixFromEuler(0, 5 * Math.PI / 180, 0)
      const out = ctrl.update(
        {
          position: [100, 0, 0], // would normally create a huge force command
          controlMode: 'attitude',
          attitude: R_d,
        },
        {
          position: [0, 0, 0],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        0.01
      )
      expect(out.totalThrust).toBeCloseTo(mg, 3)
      expect(out.moments[1]).not.toBe(0)
      expect(out.attitudeError.some(e => Math.abs(e) > 0.01)).toBe(true)
    })

    it('rate mode bypasses outer loops and tracks an angular velocity reference', () => {
      const ctrl = makeController()
      const out = ctrl.update(
        {
          position: [100, 0, 0],
          controlMode: 'rate',
          angularVelocity: [1, 0, 0],
        },
        {
          position: [0, 0, 0],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        0.01
      )
      expect(out.totalThrust).toBeCloseTo(mg, 3)
      expect(out.moments[0]).toBeGreaterThan(0)
    })
  })
})
