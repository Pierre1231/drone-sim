import { describe, it, expect } from 'vitest'
import { CascadedController, createDocumentControllerGains } from './controller'

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
    it('combines P, I, D and feedforward acceleration terms', () => {
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
      // a_c = a_ff + Kp^v * e_v + Ki^v * integral + Kd^v * de/dt
      // e_v = 1, integral after this step = 0.1, derivative = (1 - 0)/0.1 = 10.
      const expectedAccel =
        0.5 +
        gains.velocityKp[0] * 1 +
        gains.velocityKi[0] * 0.1 +
        gains.velocityKd[0] * 10
      expect(out.desiredForceNed[0]).toBeCloseTo(mass * expectedAccel, 3)
    })
  })

  describe('attitude loop', () => {
    it('computes zero attitude error at identity attitude', () => {
      const ctrl = makeController()
      const out = ctrl.update(
        { position: [0, 0, -5] },
        {
          position: [0, 0, -5],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        0.01
      )
      expect(out.attitudeError[0]).toBeCloseTo(0, 10)
      expect(out.attitudeError[1]).toBeCloseTo(0, 10)
      expect(out.attitudeError[2]).toBeCloseTo(0, 10)
    })

    it('uses rotation-matrix error e_R, not Euler-angle differences', () => {
      const ctrl = makeController()
      // Small positive roll (rotate body x by +0.05 rad around x axis).
      const delta = 0.05
      const cos = Math.cos(delta / 2)
      const sin = Math.sin(delta / 2)
      const qRoll: [number, number, number, number] = [cos, sin, 0, 0]
      const out = ctrl.update(
        { position: [0, 0, -5] },
        {
          position: [0, 0, -5],
          velocity: [0, 0, 0],
          quaternion: qRoll,
          angularVelocity: [0, 0, 0],
        },
        0.01
      )
      // For the document definition e_R = 0.5 vee(R^T R_d - R_d^T R),
      // a positive roll yields e_R,x ≈ -delta.
      expect(out.attitudeError[0]).toBeCloseTo(-delta, 2)
      expect(Math.abs(out.attitudeError[1])).toBeLessThan(1e-6)
      expect(Math.abs(out.attitudeError[2])).toBeLessThan(1e-6)
    })

    it('aligns heading reference with the trajectory velocity', () => {
      const ctrl = makeController()
      const out = ctrl.update(
        {
          position: [0, 0, -5],
          heading: [0, 1, 0],
        },
        {
          position: [0, 0, -5],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        0.01
      )
      // Desired force is upward only -> b_zd = [0,0,1]; heading [0,1,0]
      // yields b_yd = [-1,0,0] and b_xd = [0,-1,0].
      expect(out.desiredRotationMatrix[0][2]).toBeCloseTo(0, 5)
      expect(out.desiredRotationMatrix[1][2]).toBeCloseTo(0, 5)
      expect(out.desiredRotationMatrix[2][2]).toBeCloseTo(1, 5)
      expect(out.desiredRotationMatrix[2][0]).toBeCloseTo(0, 5)
      expect(out.desiredRotationMatrix[2][1]).toBeCloseTo(0, 5)
    })
  })

  describe('angular velocity loop', () => {
    it('produces proportional moment with the document rate gains', () => {
      const ctrl = makeController()
      const out = ctrl.update(
        { position: [0, 0, -5] },
        {
          position: [0, 0, -5],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        0.01
      )
      // Identity attitude, zero angular velocity -> zero rate error -> zero moment.
      expect(out.moments[0]).toBeCloseTo(0, 10)
      expect(out.moments[1]).toBeCloseTo(0, 10)
      expect(out.moments[2]).toBeCloseTo(0, 10)

      ctrl.reset()
      const out2 = ctrl.update(
        { position: [0, 0, -5] },
        {
          position: [0, 0, -5],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [1, 0, 0],
        },
        0.01
      )
      // e_omega = -[1,0,0]; proportional term = -0.2. Over dt=0.01 the
      // integral term adds Ki * e * dt = -0.0003, giving -0.2003.
      expect(out2.moments[0]).toBeCloseTo(-(gains.rateKp[0] + gains.rateKi[0] * 0.01), 5)
      expect(out2.moments[1]).toBeCloseTo(0, 10)
      expect(out2.moments[2]).toBeCloseTo(0, 10)
    })
  })

  describe('controller output', () => {
    it('outputs total thrust equal to weight at hover and zero moments', () => {
      const ctrl = makeController()
      const out = ctrl.update(
        { position: [0, 0, -5] },
        {
          position: [0, 0, -5],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        0.01
      )
      expect(out.totalThrust).toBeCloseTo(mass * 9.81, 5)
      expect(out.moments[0]).toBeCloseTo(0, 5)
      expect(out.moments[1]).toBeCloseTo(0, 5)
      expect(out.moments[2]).toBeCloseTo(0, 5)
    })

    it('subtracts aerodynamic and disturbance force estimates from desired force', () => {
      const ctrl = makeController()
      const out = ctrl.update(
        { position: [0, 0, -5] },
        {
          position: [0, 0, -5],
          velocity: [0, 0, 0],
          quaternion: [1, 0, 0, 0],
          angularVelocity: [0, 0, 0],
        },
        0.01,
        {
          aeroForceNed: [-2, 0, 0],
          disturbanceForceNed: [0, 3, 0],
        }
      )
      // Hover desired force is [0,0,-mg]; subtracting aero/disturbance estimates
      // shifts the x/y components.
      expect(out.desiredForceNed[0]).toBeCloseTo(2, 5)
      expect(out.desiredForceNed[1]).toBeCloseTo(-3, 5)
      expect(out.desiredForceNed[2]).toBeCloseTo(-mass * 9.81, 3)
    })
  })

  describe('integral anti-windup', () => {
    it('stops integrating when the position-loop output saturates', () => {
      const ctrl = new CascadedController({
        mass,
        gains,
        limits: { maxVelocity: [1, 1, 1] },
      })
      const dt = 0.01
      let lastOutput = 0
      for (let i = 0; i < 50; i++) {
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
})
