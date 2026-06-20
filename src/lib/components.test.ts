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

  it('should compute bus current including auxiliary load and duty cycles', () => {
    const battery = new BatteryModel({
      cells: 4,
      capacityAh: 5,
      ocvCoeffs: [3.3, 0.9, 0, 0],
      internalResistance: 0.01,
    })

    // Two motors at 10 A with duty 0.5, plus 10 W aux load
    const I_bat = battery.computeBusCurrent([10, 10], [0.5, 0.5], 10)
    expect(I_bat).toBeGreaterThan(10) // 10 A PWM current + aux
    expect(I_bat).toBeCloseTo(10 + 10 / battery.getTerminalVoltage(), 2)
  })
})

describe('BatteryModel discharge current limit', () => {
  const baseParams = {
    cells: 6,
    capacityAh: 8,
    ocvCoeffs: [3.3, 0.9, 0, 0] as [number, number, number, number],
    internalResistance: 0.05,
    dynamicResistance: 0.02,
    polarizationTau: 30,
    thermalCapacitance: 1500,
    thermalResistance: 1,
    ambientTemperature: 298.15,
  }

  it('leaves small bus currents unchanged when a high limit is set', () => {
    const battery = new BatteryModel({ ...baseParams, maxDischargeCurrent: 100 })
    const motorCurrents = [8, 8, 8, 8]
    const dutyCycles = [0.4, 0.4, 0.4, 0.4]
    const I_bat = battery.computeBusCurrent(motorCurrents, dutyCycles, 10)

    const pwmCurrent = motorCurrents.reduce((sum, im, i) => sum + dutyCycles[i] * im, 0)
    expect(I_bat).toBeGreaterThan(pwmCurrent)
    expect(I_bat).toBeLessThan(100)
  })

  it('clamps computed bus current to the pack discharge limit', () => {
    const battery = new BatteryModel({ ...baseParams, maxDischargeCurrent: 10 })
    const I_bat = battery.computeBusCurrent(
      [20, 20, 20, 20],
      [0.5, 0.5, 0.5, 0.5],
      10
    )

    expect(I_bat).toBeLessThanOrEqual(10 + 1e-9)
    expect(I_bat).toBeGreaterThan(0)
  })

  it('uses the clamped current for SOC update, not the raw demand', () => {
    const battery = new BatteryModel({ ...baseParams, maxDischargeCurrent: 10 })
    battery.update([20, 20, 20, 20], 60, {
      dutyCycles: [0.5, 0.5, 0.5, 0.5],
      P_aux: 10,
    })

    // At 10 A for 60 s from 8 Ah, SOC drop = 10*60/(3600*8) = 0.020833
    expect(battery.getSOC()).toBeCloseTo(1 - 10 * 60 / (3600 * 8), 4)
  })

  it('keeps the current limit constant in SOC (no SOC derating)', () => {
    // Per the test-case document I_bat,max is a constant rated value; the SOC
    // dependence of the power envelope enters via the falling terminal voltage,
    // not by derating the current limit. A flat limit is required so the hover
    // is not starved before SOC reaches 20% (B01 endurance case).
    const full = new BatteryModel({
      ...baseParams,
      maxDischargeCurrent: 100,
      socMin: 0.2,
      initialSOC: 1.0,
    })
    const nearMin = new BatteryModel({
      ...baseParams,
      maxDischargeCurrent: 100,
      socMin: 0.2,
      initialSOC: 0.21,
    })

    expect(full.getMaxDischargeCurrent()).toBeCloseTo(100, 6)
    expect(nearMin.getMaxDischargeCurrent()).toBeCloseTo(100, 6)
  })

  it('derates the current limit at high battery temperature', () => {
    const battery = new BatteryModel({
      ...baseParams,
      maxDischargeCurrent: 100,
      thermalCapacitance: 1,
      thermalResistance: 1,
      ambientTemperature: 298.15,
    })

    // Force a moderate temperature rise without fully cutting off.
    battery.update(10, 10)
    expect(battery.getTemperature()).toBeGreaterThan(323.15)

    const I_max = battery.getMaxDischargeCurrent()
    expect(I_max).toBeLessThan(100)
    expect(I_max).toBeGreaterThan(0)
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

  it('can initialize motor speed and current from a trim point', () => {
    const motor = new MotorModel({
      resistance: 0.1,
      backEmfCoeff: 0.02,
      torqueCoeff: 0.02,
      rotorInertia: 2e-5,
      viscousDamping: 0,
    })

    motor.setState({ speed: 452.078533, current: 8.175 })

    expect(motor.getSpeed()).toBeCloseTo(452.078533, 6)
    expect(motor.getCurrent()).toBeCloseTo(8.175, 6)
  })

  it('should exhibit transient current spike when inductance is included', () => {
    const motor = new MotorModel({
      resistance: 0.08,
      backEmfCoeff: 0.0105,
      torqueCoeff: 0.0105,
      rotorInertia: 1e-5,
      viscousDamping: 1e-6,
      inductance: 1e-5,
      noLoadCurrent: 0.5,
    })

    motor.update(14.8, 0, 0.0001)
    const spikeCurrent = motor.getCurrent()
    expect(spikeCurrent).toBeGreaterThan(100) // L di/dt dominates briefly

    for (let i = 0; i < 50000; i++) {
      motor.update(14.8, 0, 0.0001)
    }
    const steadyCurrent = motor.getCurrent()
    expect(steadyCurrent).toBeLessThan(spikeCurrent)
    expect(steadyCurrent).toBeGreaterThan(0) // motor draws current to overcome damping/friction
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

  it('should follow a first-order step response when tau_esc is set', () => {
    const esc = new ESCModel({
      minSpeed: 0,
      maxSpeedAtNominalVoltage: 1000,
      responseTimeConstant: 0.05,
    })

    esc.updateCommand(1000, 14.8)
    expect(esc.getDutyCycle()).toBeCloseTo(0, 3) // starts at 0

    for (let i = 0; i < 50; i++) {
      esc.update(0.01)
    }
    const duty = esc.getDutyCycle()
    expect(duty).toBeGreaterThan(0.5)
    expect(duty).toBeLessThan(1.0)
  })

  it('can initialize duty cycle and bus voltage from a trim point', () => {
    const esc = new ESCModel({
      minSpeed: 0,
      maxSpeedAtNominalVoltage: 44.8821 * (6 * 3.7),
      nominalVoltage: 6 * 3.7,
      resistance: 0.01,
      wireResistance: 0.01,
      switchingLossCoeff: 0.00611621,
      pwmFrequency: 1,
    })

    esc.setState({ dutyCycle: 0.410998, dutyCycleTarget: 0.410998, busVoltage: 23.2 })

    expect(esc.getDutyCycle()).toBeCloseTo(0.410998, 6)
    expect(esc.getOutputVoltage(8.175)).toBeCloseTo(0.410998 * 23.2 - 8.175 * (0.01 + 0.01 + 0.00611621), 6)
  })
})
