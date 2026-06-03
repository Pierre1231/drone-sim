import { describe, it, expect } from 'vitest'
import { HoverMission, CircleMission } from './mission'

describe('HoverMission', () => {
  it('should generate hover setpoint at target altitude', () => {
    const mission = new HoverMission({
      targetAltitude: 10,
      takeoffDuration: 5,
      batteryCutoffSoc: 0.2,
    })

    // After takeoff (t=10s), should be hovering at 10m (NED: z = -10)
    const setpoint = mission.getSetpoint(10)
    expect(setpoint.position[0]).toBe(0)
    expect(setpoint.position[1]).toBe(0)
    expect(setpoint.position[2]).toBe(-10) // NED: z positive = down
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

    // NED: z becomes more negative as we ascend
    expect(sp1.position[2]).toBeLessThan(0)
    expect(sp2.position[2]).toBeLessThan(sp1.position[2])
    expect(sp3.position[2]).toBeCloseTo(-10, 1)
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
    expect(setpoint.position[2]).toBeGreaterThan(-10) // Landing target is 0 (ground)
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

describe('CircleMission', () => {
  it('should generate hover setpoint before circle starts', () => {
    const mission = new CircleMission({
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
    expect(sp.position[2]).toBe(-10) // NED: z = -altitude
  })

  it('should generate circle trajectory after hover', () => {
    const mission = new CircleMission({
      targetAltitude: 10,
      takeoffDuration: 5,
      hoverDuration: 3,
      radius: 5,
      speed: 2,
      batteryCutoffSoc: 0.2,
    })

    // After takeoff + hover, circle should be active
    const sp1 = mission.getSetpoint(10)
    const sp2 = mission.getSetpoint(20)

    // Should have moved away from origin
    expect(Math.abs(sp1.position[0]) + Math.abs(sp1.position[1])).toBeGreaterThan(0)
    expect(Math.abs(sp2.position[0]) + Math.abs(sp2.position[1])).toBeGreaterThan(0)

    // Altitude should remain at target (NED: z = -10)
    expect(sp1.position[2]).toBeCloseTo(-10, 1)
    expect(sp2.position[2]).toBeCloseTo(-10, 1)

    // Verify circle shape: x in [-5, 5], y in [-5, 5]
    expect(Math.abs(sp1.position[0])).toBeLessThanOrEqual(5)
    expect(Math.abs(sp1.position[1])).toBeLessThanOrEqual(5)

    // At a time when theta=π/4
    // period = 2*PI*5/2 = 5*PI, so omega = 2*PI/period = 2/5 = 0.4
    // theta = π/4 at circleTime = (π/4) / 0.4 = 5π/16 ≈ 0.98s
    const figure8Start = 5 + 3 // takeoff + hover
    const period = (2 * Math.PI * 5) / 2
    const omega = (2 * Math.PI) / period
    const tAtPi4 = figure8Start + (Math.PI / 4) / omega
    const sp3 = mission.getSetpoint(tAtPi4)
    expect(sp3.position[0]).toBeCloseTo(5 * Math.cos(Math.PI / 4), 1)
    expect(sp3.position[1]).toBeCloseTo(5 * Math.sin(Math.PI / 4), 1)
  })

  it('should return periodic trajectory', () => {
    const mission = new CircleMission({
      targetAltitude: 10,
      takeoffDuration: 5,
      hoverDuration: 3,
      radius: 5,
      speed: 2,
      batteryCutoffSoc: 0.2,
    })

    // After a full circle period, should return near starting point
    // Period = 2π * r / speed ≈ 15.7s
    const period = (2 * Math.PI * 5) / 2
    const sp1 = mission.getSetpoint(10) // start of circle
    const sp2 = mission.getSetpoint(10 + period)

    // Positions should be close (periodic)
    expect(sp1.position[0]).toBeCloseTo(sp2.position[0], 0)
    expect(sp1.position[1]).toBeCloseTo(sp2.position[1], 0)
  })
})
