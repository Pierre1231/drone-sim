import { describe, it, expect } from 'vitest'
import { StandardAtmosphere, WindModel, Environment, computeAirspeed } from './environment'
import { vec3, quat } from './coordinates'

describe('environment', () => {
  describe('StandardAtmosphere', () => {
    it('returns sea level ISA density at h=0', () => {
      const atm = new StandardAtmosphere()
      expect(atm.getDensity(0)).toBeCloseTo(1.225, 3)
      expect(atm.getPressure(0)).toBeCloseTo(101325, 0)
      expect(atm.getTemperature(0)).toBeCloseTo(288.15, 2)
    })

    it('matches ISA table at 1000 m using document constants', () => {
      const atm = new StandardAtmosphere()
      expect(atm.getTemperature(1000)).toBeCloseTo(281.65, 2)
      // Values below use g=9.81, R=287.05, L=0.0065 from the math model doc.
      expect(atm.getPressure(1000)).toBeCloseTo(89870.8, 0)
      expect(atm.getDensity(1000)).toBeCloseTo(1.11161, 4)
    })

    it('applies a uniform temperature offset', () => {
      const atm = new StandardAtmosphere({ deltaT: 10 })
      expect(atm.getSeaLevelTemperature()).toBeCloseTo(298.15, 2)
      expect(atm.getTemperature(0)).toBeCloseTo(298.15, 2)
      // At fixed sea-level pressure, higher temperature reduces density.
      expect(atm.getDensity(0)).toBeLessThan(1.225)
      expect(atm.getDensity(0)).toBeCloseTo(1.1839, 4)
    })
  })

  describe('WindModel', () => {
    it('returns steady wind unchanged', () => {
      const wind = new WindModel({ steady: vec3(2, -1, 0.5) })
      const w = wind.getWind(vec3(0, 0, 10))
      expect(w[0]).toBeCloseTo(2, 6)
      expect(w[1]).toBeCloseTo(-1, 6)
      expect(w[2]).toBeCloseTo(0.5, 6)
    })

    it('produces a 1-cos gust centered at mid duration', () => {
      const wind = new WindModel({
        gust: {
          amplitude: 4,
          direction: [1, 0, 0],
          startTime: 0,
          duration: 2,
        }
      })
      expect(wind.getGust(0)[0]).toBeCloseTo(0, 6)
      expect(wind.getGust(1)[0]).toBeCloseTo(4, 6) // peak at midpoint
      expect(wind.getGust(2)[0]).toBeCloseTo(0, 6)
      expect(wind.getGust(3)[0]).toBeCloseTo(0, 6) // outside gust
    })

    it('scales wind with altitude via power-law shear', () => {
      const wind = new WindModel({
        shear: {
          referenceSpeed: 5,
          referenceAltitude: 10,
          exponent: 0.143,
          direction: [1, 0, 0],
        }
      })
      // At NED z = -10, altitude = 10 m
      const w10 = wind.getShear(10)
      expect(w10[0]).toBeCloseTo(5, 4)
      // At ground level altitude = 0
      const w0 = wind.getShear(0)
      expect(w0[0]).toBeCloseTo(0, 4)
    })

    it('computes body-frame airspeed from NED velocity minus wind', () => {
      const vNED = [10, 0, 0] as const
      const wNED = [2, 0, 0] as const
      const q = quat(1, 0, 0, 0)
      const va = computeAirspeed(vNED, wNED, q)
      expect(va[0]).toBeCloseTo(8, 6)
      expect(va[1]).toBeCloseTo(0, 6)
      expect(va[2]).toBeCloseTo(0, 6)
    })
  })

  describe('Environment', () => {
    it('combines atmosphere and wind for a given position', () => {
      const env = new Environment({
        atmosphere: { deltaT: 0 },
        wind: { steady: [5, 0, 0] },
      })
      const pos = [0, 0, -10] as const // 10 m altitude in NED
      expect(env.getDensity(pos)).toBeCloseTo(1.2238, 4)
      const wind = env.getWind(pos)
      expect(wind[0]).toBeCloseTo(5, 6)
      const va = env.getAirspeed([15, 0, 0], quat(1, 0, 0, 0), pos)
      expect(va[0]).toBeCloseTo(10, 6)
    })
  })
})
