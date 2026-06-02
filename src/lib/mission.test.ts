import { describe, it, expect } from 'vitest'
import { HoverMission, Figure8Mission } from './mission'

describe('HoverMission', () => {
  it('should generate hover setpoint at target altitude', () => {
    const mission = new HoverMission({
      targetAltitude: 10,
      takeoffDuration: 5,
      batteryCutoffSoc: 0.2,
    })

    // After takeoff (t=10s), should be hovering at 10m
    const setpoint = mission.getSetpoint(10)
    expect(setpoint.position[0]).toBe(0)
    expect(setpoint.position[1]).toBe(0)
    expect(setpoint.position[2]).toBe(10)
    expect(setpoint.velocity[0]).toBe(0)
    expect(setpoint.velocity[1]).toBe(0)
    expect(setpoint.velocity[2]).toBe(0)
  })

  it('should ascend during takeoff phase', () => {
    const mission = new HoverMission({
      targetAltitude: 10,
      takeoffDuration: 5,
      batteryCutoffSoc: 0.2,
    })

    const sp1 = mission.getSetpoint(1)
    const sp2 = mission.getSetpoint(3)
    const sp3 = mission.getSetpoint(5)

    expect(sp1.position[2]).toBeGreaterThan(0)
    expect(sp2.position[2]).toBeGreaterThan(sp1.position[2])
    expect(sp3.position[2]).toBeCloseTo(10, 1)
  })

  it('should signal landing when battery is low', () => {
    const mission = new HoverMission({
      targetAltitude: 10,
      takeoffDuration: 5,
      batteryCutoffSoc: 0.2,
    })

    // Simulate battery at 15% SOC
    const setpoint = mission.getSetpoint(60, { soc: 0.15 })
    expect(setpoint.landing).toBe(true)
    expect(setpoint.position[2]).toBeLessThan(10)
  })

  it('should not signal landing when battery is above cutoff', () => {
    const mission = new HoverMission({
      targetAltitude: 10,
      takeoffDuration: 5,
      batteryCutoffSoc: 0.2,
    })

    const setpoint = mission.getSetpoint(60, { soc: 0.5 })
    expect(setpoint.landing).toBe(false)
  })
})

describe('Figure8Mission', () => {
  it('should generate hover setpoint before figure8 starts', () => {
    const mission = new Figure8Mission({
      targetAltitude: 10,
      takeoffDuration: 5,
      hoverDuration: 3,
      radius: 5,
      speed: 2,
      batteryCutoffSoc: 0.2,
    })

    const sp = mission.getSetpoint(7) // 5s takeoff + 2s hover
    expect(sp.position[0]).toBe(0)
    expect(sp.position[1]).toBe(0)
    expect(sp.position[2]).toBe(10)
  })

  it('should generate figure8 trajectory after hover', () => {
    const mission = new Figure8Mission({
      targetAltitude: 10,
      takeoffDuration: 5,
      hoverDuration: 3,
      radius: 5,
      speed: 2,
      batteryCutoffSoc: 0.2,
    })

    // After takeoff + hover, figure8 should be active
    const sp1 = mission.getSetpoint(10)
    const sp2 = mission.getSetpoint(20)

    // Should have moved away from origin
    expect(Math.abs(sp1.position[0]) + Math.abs(sp1.position[1])).toBeGreaterThan(0)
    expect(Math.abs(sp2.position[0]) + Math.abs(sp2.position[1])).toBeGreaterThan(0)

    // Altitude should remain at target
    expect(sp1.position[2]).toBeCloseTo(10, 1)
    expect(sp2.position[2]).toBeCloseTo(10, 1)
  })

  it('should return periodic trajectory', () => {
    const mission = new Figure8Mission({
      targetAltitude: 10,
      takeoffDuration: 5,
      hoverDuration: 3,
      radius: 5,
      speed: 2,
      batteryCutoffSoc: 0.2,
    })

    // After a full figure8 period, should return near starting point
    // Period = 2π * r * 2.5 / speed ≈ 39.3s
    const period = (2 * Math.PI * 5 * 2.5) / 2
    const sp1 = mission.getSetpoint(10) // start of figure8
    const sp2 = mission.getSetpoint(10 + period)

    // Positions should be close (periodic)
    expect(sp1.position[0]).toBeCloseTo(sp2.position[0], 0)
    expect(sp1.position[1]).toBeCloseTo(sp2.position[1], 0)
  })
})
