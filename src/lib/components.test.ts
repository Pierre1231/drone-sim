import { describe, it, expect } from 'vitest'
import { BatteryModel, MotorModel, ESCModel } from './components'

describe('BatteryModel', () => {
  it('should discharge correctly with constant current', () => {
    const battery = new BatteryModel({
      cells: 4,
      capacityAh: 5,
      ocvCoeffs: [3.0, 3.5, -2.0, 1.0],
      internalResistance: 0.005,
    })

    const initialSoc = battery.getSOC()
    expect(initialSoc).toBe(1.0)

    // Discharge at 10A for 1 hour = 10Ah drawn from 5Ah battery
    const dt = 1 // 1 second steps
    for (let i = 0; i < 3600; i++) {
      battery.update(10, dt)
    }

    // After 1 hour at 10A: should have discharged 2x capacity
    // SOC should be near 0 (or stopped at cutoff)
    const finalSoc = battery.getSOC()
    expect(finalSoc).toBeLessThan(0.5)
    expect(finalSoc).toBeGreaterThanOrEqual(0)
  })

  it('should decrease voltage as SOC drops', () => {
    const battery = new BatteryModel({
      cells: 4,
      capacityAh: 5,
      ocvCoeffs: [3.0, 3.5, -2.0, 1.0],
      internalResistance: 0.005,
    })

    const v1 = battery.getVoltage(10)

    // Discharge 50%
    for (let i = 0; i < 1800; i++) {
      battery.update(10, 1)
    }

    const v2 = battery.getVoltage(10)
    expect(v2).toBeLessThan(v1)
  })
})

describe('MotorModel', () => {
  it('should reach steady-state speed matching KV value', () => {
    const motor = new MotorModel({
      resistance: 0.08,
      kv: 920,
      backEmfCoeff: 0.0105,
      torqueCoeff: 0.0105,
      rotorInertia: 1e-5,
      viscousDamping: 1e-6,
    })

    // Apply 14.8V (4S nominal), no load
    const dt = 0.001
    for (let i = 0; i < 5000; i++) {
      motor.update(14.8, 0, dt) // voltage, no load torque
    }

    const speed = motor.getSpeed()
    // KV = 920 RPM/V, at 14.8V → ~13600 RPM = ~1425 rad/s
    // Allow some tolerance due to damping
    expect(speed).toBeGreaterThan(1200)
    expect(speed).toBeLessThan(1500)
  })

  it('should draw more current under load', () => {
    const motor = new MotorModel({
      resistance: 0.08,
      kv: 920,
      backEmfCoeff: 0.0105,
      torqueCoeff: 0.0105,
      rotorInertia: 1e-5,
      viscousDamping: 1e-6,
    })

    // No load — run to steady state
    for (let i = 0; i < 5000; i++) {
      motor.update(14.8, 0, 0.001)
    }
    const currentNoLoad = motor.getCurrent()

    // With load torque — run to steady state
    motor.reset()
    for (let i = 0; i < 5000; i++) {
      motor.update(14.8, 0.5, 0.001)
    }
    const currentWithLoad = motor.getCurrent()

    expect(currentWithLoad).toBeGreaterThan(currentNoLoad)
  })
})

describe('ESCModel', () => {
  it('should output duty cycle between 0 and 1', () => {
    const esc = new ESCModel({
      minSpeed: 100,
      maxSpeedAtNominalVoltage: 12000,
    })

    // Zero command → 0 duty
    esc.updateCommand(0, 14.8)
    expect(esc.getDutyCycle()).toBe(0)

    // Max command → 1 duty
    esc.updateCommand(12000, 14.8)
    expect(esc.getDutyCycle()).toBeCloseTo(1, 2)

    // Half command → ~0.5 duty (approximately)
    esc.updateCommand(6000, 14.8)
    expect(esc.getDutyCycle()).toBeGreaterThan(0.3)
    expect(esc.getDutyCycle()).toBeLessThan(0.7)
  })

  it('should output motor voltage proportional to duty and bus voltage', () => {
    const esc = new ESCModel({
      minSpeed: 100,
      maxSpeedAtNominalVoltage: 12000,
    })

    esc.updateCommand(6000, 14.8)
    const duty = esc.getDutyCycle()
    const outputVoltage = esc.getOutputVoltage()

    expect(outputVoltage).toBeCloseTo(duty * 14.8, 1)
  })
})
