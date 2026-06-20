import { describe, it, expect } from 'vitest'
import {
  computeRotorAngularMomentum,
  computeGyroscopicMoment,
  computeRotorAccelerationMoment,
  computeRotorMoment,
  makeRotorState,
} from './rotorDynamics'

describe('rotor dynamics', () => {
  describe('computeRotorAngularMomentum', () => {
    it('sums signed rotor angular momenta along z', () => {
      const rotors = [
        makeRotorState(300, 1e-5, -1),
        makeRotorState(300, 1e-5, 1),
        makeRotorState(300, 1e-5, -1),
        makeRotorState(300, 1e-5, 1),
      ]
      const H = computeRotorAngularMomentum(rotors)
      expect(H[0]).toBeCloseTo(0, 10)
      expect(H[1]).toBeCloseTo(0, 10)
      expect(H[2]).toBeCloseTo(0, 10)
    })

    it('returns non-zero H_z when signs do not cancel', () => {
      const rotors = [
        makeRotorState(300, 1e-5, 1),
        makeRotorState(300, 1e-5, 1),
      ]
      const H = computeRotorAngularMomentum(rotors)
      expect(H[2]).toBeCloseTo(2 * 300 * 1e-5, 10)
    })
  })

  describe('computeGyroscopicMoment', () => {
    it('is zero when body angular velocity is zero', () => {
      const H: [number, number, number] = [0, 0, 0.006]
      const M = computeGyroscopicMoment([0, 0, 0], H)
      expect(M[0]).toBeCloseTo(0, 10)
      expect(M[1]).toBeCloseTo(0, 10)
      expect(M[2]).toBeCloseTo(0, 10)
    })

    it('produces roll and pitch moments for a vertical angular momentum', () => {
      // H_r^b = [0, 0, H_z], ω^b = [p, q, 0]
      // ω × H = [-q H_z, p H_z, 0], so M_gyro = [q H_z, -p H_z, 0]
      const H: [number, number, number] = [0, 0, 0.006]
      const omega: [number, number, number] = [0.5, 0.3, 0]
      const M = computeGyroscopicMoment(omega, H)
      expect(M[0]).toBeCloseTo(-0.3 * 0.006, 10)
      expect(M[1]).toBeCloseTo(0.5 * 0.006, 10)
      expect(M[2]).toBeCloseTo(0, 10)
    })
  })

  describe('computeRotorAccelerationMoment', () => {
    it('opposes the change in rotor angular momentum', () => {
      const prev = [makeRotorState(100, 1e-5, 1)]
      const curr = [makeRotorState(300, 1e-5, 1)]
      const dt = 0.1
      const M = computeRotorAccelerationMoment(curr, prev, dt)
      // dH_z/dt = J*(300-100)/dt = +0.02, so M_acc,z = -0.02
      expect(M[2]).toBeCloseTo(-0.02, 10)
    })
  })

  describe('computeRotorMoment', () => {
    it('returns the sum of gyroscopic and acceleration moments', () => {
      const H: [number, number, number] = [0, 0, 0.006]
      const omega: [number, number, number] = [0.5, 0, 0]
      const prev = [makeRotorState(100, 1e-5, 1)]
      const curr = [makeRotorState(100, 1e-5, 1)]
      const M = computeRotorMoment(omega, H, curr, prev, 0.1)
      // Only gyroscopic pitch moment: M_gyro,y = p * H_z
      expect(M[0]).toBeCloseTo(0, 10)
      expect(M[1]).toBeCloseTo(0.5 * 0.006, 10)
      expect(M[2]).toBeCloseTo(0, 10)
    })
  })
})
