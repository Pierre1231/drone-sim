import { describe, it, expect } from 'vitest'
import { designController } from './controllerDesign'

describe('designController', () => {
  it('should compute positive PID gains for a typical config', () => {
    const gains = designController({
      mass: 1.5,
      inertia: [0.01, 0.01, 0.02],
      maxThrustPerMotor: 15,
      motorTimeConstant: 0.02,
      armLength: 0.225,
    })

    // All gains should be positive
    expect(gains.rateKp).toBeGreaterThan(0)
    expect(gains.rateKd).toBeGreaterThan(0)
    expect(gains.attitudeKp).toBeGreaterThan(0)
    expect(gains.velocityKp).toBeGreaterThan(0)
    expect(gains.velocityKi).toBeGreaterThan(0)
    expect(gains.positionKp).toBeGreaterThan(0)
    expect(gains.positionKi).toBeGreaterThan(0)

    // All bandwidths should be positive and ordered
    expect(gains.rateBandwidth).toBeGreaterThan(0)
    expect(gains.attitudeBandwidth).toBeGreaterThan(0)
    expect(gains.velocityBandwidth).toBeGreaterThan(0)
    expect(gains.positionBandwidth).toBeGreaterThan(0)
  })

  it('should have inner loop bandwidth > outer loop bandwidth', () => {
    const gains = designController({
      mass: 1.5,
      inertia: [0.01, 0.01, 0.02],
      maxThrustPerMotor: 15,
      motorTimeConstant: 0.02,
      armLength: 0.225,
    })

    // Inner loops should have higher bandwidth than outer loops
    expect(gains.rateBandwidth).toBeGreaterThan(gains.attitudeBandwidth)
    expect(gains.attitudeBandwidth).toBeGreaterThan(gains.velocityBandwidth)
    expect(gains.velocityBandwidth).toBeGreaterThan(gains.positionBandwidth)
  })

  it('should produce higher gains for heavier drone', () => {
    const light = designController({
      mass: 0.5,
      inertia: [0.005, 0.005, 0.01],
      maxThrustPerMotor: 8,
      motorTimeConstant: 0.02,
      armLength: 0.15,
    })

    const heavy = designController({
      mass: 3.0,
      inertia: [0.03, 0.03, 0.05],
      maxThrustPerMotor: 25,
      motorTimeConstant: 0.02,
      armLength: 0.3,
    })

    // Heavier drone needs higher velocity loop gain
    expect(heavy.velocityKp).toBeGreaterThan(light.velocityKp)

    // Heavier drone needs higher position loop gain
    expect(heavy.positionKp).toBeGreaterThan(light.positionKp)
  })

  it('should handle minimum valid inputs', () => {
    const gains = designController({
      mass: 0.1,
      inertia: [0.001, 0.001, 0.002],
      maxThrustPerMotor: 2,
      motorTimeConstant: 0.01,
      armLength: 0.05,
    })

    expect(gains.rateKp).toBeGreaterThan(0)
    expect(gains.positionKp).toBeGreaterThan(0)
  })
})
