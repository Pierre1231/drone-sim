/**
 * Environment model: standard atmosphere and wind field.
 *
 * Conventions follow the project math model document:
 * - ISA temperature lapse with optional offset ΔT
 * - Pressure and density derived from the barometric formula
 * - Wind is expressed in NED frame and subtracted from inertial velocity
 *   to obtain airspeed.
 */

import { vec3, rotateNedToBody, type Vec3 } from './coordinates'

/** Standard atmosphere constants. */
const G = 9.81 // m/s²
const R_AIR = 287.05 // J/(kg·K)
const T0_ISA = 288.15 // K
const L = 0.0065 // K/m
const P0 = 101325 // Pa

export interface StandardAtmosphereParams {
  /** Temperature offset from ISA at sea level (K). Default 0. */
  deltaT?: number
}

export class StandardAtmosphere {
  private readonly deltaT: number

  constructor(params?: StandardAtmosphereParams) {
    this.deltaT = params?.deltaT ?? 0
  }

  /** Sea level temperature including offset: T_sl = T0 + ΔT (K). */
  getSeaLevelTemperature(): number {
    return T0_ISA + this.deltaT
  }

  /** Temperature (K) at given altitude (m): T_a = T_sl - L·h. */
  getTemperature(altitude: number): number {
    return this.getSeaLevelTemperature() - L * altitude
  }

  /** Pressure (Pa) at given altitude (m). */
  getPressure(altitude: number): number {
    const Tsl = this.getSeaLevelTemperature()
    const T = this.getTemperature(altitude)
    const exponent = G / (R_AIR * L)
    return P0 * Math.pow(T / Tsl, exponent)
  }

  /** Density (kg/m³) at given altitude (m): ρ = p / (R·T). */
  getDensity(altitude: number): number {
    const T = this.getTemperature(altitude)
    const p = this.getPressure(altitude)
    return p / (R_AIR * T)
  }
}

export interface WindComponents {
  /** Constant mean wind in NED (m/s). */
  steady: Vec3
  /** Transient gust in NED (m/s). */
  gust: Vec3
  /** Stochastic turbulence in NED (m/s). */
  turbulence: Vec3
  /** Altitude-dependent wind shear in NED (m/s). */
  shear: Vec3
}

export interface GustParams {
  /** Peak gust amplitude (m/s). */
  amplitude: number
  /** Unit vector defining gust direction in NED. */
  direction: readonly [number, number, number]
  /** Start time (s). Default 0. */
  startTime?: number
  /** Gust duration (s). Default 1. */
  duration?: number
}

export interface TurbulenceParams {
  /** Turbulence intensity: standard deviation of fluctuation (m/s). */
  intensity: number
  /** Seed for deterministic pseudo-random generation. Default 0. */
  seed?: number
}

export interface WindShearParams {
  /** Wind speed at reference altitude (m/s). */
  referenceSpeed: number
  /** Reference altitude (m). Default 10. */
  referenceAltitude?: number
  /** Power-law exponent. Default 1/7 ≈ 0.143. */
  exponent?: number
  /** Unit vector of wind direction in NED horizontal plane. Default [1,0,0]. */
  direction?: readonly [number, number, number]
}

export interface WindModelParams {
  steady?: readonly [number, number, number]
  gust?: GustParams
  turbulence?: TurbulenceParams
  shear?: WindShearParams
}

/**
 * Wind field model combining steady wind, discrete gust, turbulence and shear.
 *
 * Document convention: wind is expressed in NED frame and subtracted from the
 * inertial velocity to obtain airspeed.
 */
export class WindModel {
  private readonly steady: Vec3
  private readonly gust?: GustParams
  private readonly turbulence?: TurbulenceParams
  private readonly shear?: WindShearParams

  constructor(params?: WindModelParams) {
    this.steady = vec3(
      params?.steady?.[0] ?? 0,
      params?.steady?.[1] ?? 0,
      params?.steady?.[2] ?? 0
    )
    this.gust = params?.gust
    this.turbulence = params?.turbulence
    this.shear = params?.shear
  }

  /** Return the steady wind component in NED. */
  getSteady(): Vec3 {
    return this.steady
  }

  /**
   * Compute the gust component at a given time.
   * Uses a 1 - cos discrete gust profile.
   */
  getGust(time: number): Vec3 {
    if (!this.gust) return vec3(0, 0, 0)
    const t0 = this.gust.startTime ?? 0
    const T = this.gust.duration ?? 1
    if (time < t0 || time > t0 + T) return vec3(0, 0, 0)
    const s = (time - t0) / T
    const factor = 0.5 * this.gust.amplitude * (1 - Math.cos(2 * Math.PI * s))
    const d = this.gust.direction
    return vec3(factor * d[0], factor * d[1], factor * d[2])
  }

  /** Simple deterministic turbulence as band-limited pseudo-random noise. */
  getTurbulence(time: number): Vec3 {
    if (!this.turbulence) return vec3(0, 0, 0)
    const seed = this.turbulence.seed ?? 0
    const intensity = this.turbulence.intensity
    // Deterministic hash of time and seed; not a real Dryden spectrum but
    // sufficient for parameterized disturbances and reproducible tests.
    const hash = (x: number) => {
      const n = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453
      return n - Math.floor(n)
    }
    const u = (hash(time) - 0.5) * 2 * intensity
    const v = (hash(time + 1) - 0.5) * 2 * intensity
    const w = (hash(time + 2) - 0.5) * 2 * intensity
    return vec3(u, v, w)
  }

  /** Power-law wind shear as a function of altitude. */
  getShear(altitude: number): Vec3 {
    if (!this.shear) return vec3(0, 0, 0)
    const hRef = this.shear.referenceAltitude ?? 10
    const alpha = this.shear.exponent ?? 1 / 7
    const d = this.shear.direction ?? [1, 0, 0]
    const ratio = Math.max(altitude, 0) / hRef
    const speed = this.shear.referenceSpeed * Math.pow(ratio, alpha)
    return vec3(speed * d[0], speed * d[1], speed * d[2])
  }

  /** Return all wind components at a given NED position and time. */
  getComponents(
    position: readonly [number, number, number],
    time: number
  ): WindComponents {
    const altitude = -position[2] // NED z is down
    return {
      steady: this.steady,
      gust: this.getGust(time),
      turbulence: this.getTurbulence(time),
      shear: this.getShear(altitude),
    }
  }

  /** Total wind vector in NED at the given position and time. */
  getWind(
    position: readonly [number, number, number],
    time: number = 0
  ): Vec3 {
    const c = this.getComponents(position, time)
    return vec3(
      c.steady[0] + c.gust[0] + c.turbulence[0] + c.shear[0],
      c.steady[1] + c.gust[1] + c.turbulence[1] + c.shear[1],
      c.steady[2] + c.gust[2] + c.turbulence[2] + c.shear[2]
    )
  }
}

/** Combined environment: atmosphere + wind. */
export class Environment {
  readonly atmosphere: StandardAtmosphere
  readonly wind: WindModel

  constructor(params?: { atmosphere?: StandardAtmosphereParams; wind?: WindModelParams }) {
    this.atmosphere = new StandardAtmosphere(params?.atmosphere)
    this.wind = new WindModel(params?.wind)
  }

  /** Air density (kg/m³) at the given NED position. */
  getDensity(position: readonly [number, number, number]): number {
    const altitude = -position[2]
    return this.atmosphere.getDensity(altitude)
  }

  /** Temperature (K) at the given NED position. */
  getTemperature(position: readonly [number, number, number]): number {
    const altitude = -position[2]
    return this.atmosphere.getTemperature(altitude)
  }

  /** Wind in NED at the given position and time. */
  getWind(
    position: readonly [number, number, number],
    time: number = 0
  ): Vec3 {
    return this.wind.getWind(position, time)
  }

  /**
   * Body-frame airspeed from NED velocity, attitude, and internal wind.
   */
  getAirspeed(
    velocityNED: readonly [number, number, number],
    q: readonly [number, number, number, number],
    position: readonly [number, number, number],
    time: number = 0
  ): Vec3 {
    const windNED = this.getWind(position, time)
    return computeAirspeed(velocityNED, windNED, q)
  }
}

/** Compute NED-frame wind velocity at the given position and time. */
export function getWindNED(
  wind: WindModel,
  position: readonly [number, number, number],
  time: number = 0
): Vec3 {
  return wind.getWind(position, time)
}

/**
 * Compute body-frame airspeed from NED velocity, NED wind, and attitude.
 * V_a = R_n^b (v^n - w^n)
 */
export function computeAirspeed(
  velocityNED: readonly [number, number, number],
  windNED: readonly [number, number, number],
  q: readonly [number, number, number, number]
): Vec3 {
  return rotateNedToBody(
    vec3(
      velocityNED[0] - windNED[0],
      velocityNED[1] - windNED[1],
      velocityNED[2] - windNED[2]
    ),
    q
  )
}
