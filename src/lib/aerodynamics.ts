// Standard Atmosphere (ISA) model
const G = 9.81 // m/s²
const R_AIR = 287.05 // J/(kg·K)
const T0 = 288.15 // K (15°C at sea level)
const L = 0.0065 // K/m (temperature lapse rate)
const P0 = 101325 // Pa (sea level pressure)

export class StandardAtmosphere {
  /** Get temperature (K) at given altitude (m) */
  getTemperature(altitude: number): number {
    return T0 - L * altitude
  }

  /** Get pressure (Pa) at given altitude (m) */
  getPressure(altitude: number): number {
    const T = this.getTemperature(altitude)
    const exponent = G / (R_AIR * L)
    return P0 * Math.pow(T / T0, exponent)
  }

  /** Get air density (kg/m³) at given altitude (m) */
  getDensity(altitude: number): number {
    const T = this.getTemperature(altitude)
    const p = this.getPressure(altitude)
    return p / (R_AIR * T)
  }
}

export interface DragCoefficients {
  cdx: number
  cdy: number
  cdz: number
}

export class LowSpeedDrag {
  private coeffs: DragCoefficients

  constructor(coeffs: DragCoefficients) {
    this.coeffs = coeffs
  }

  /**
   * Compute drag force in body frame (N)
   * @param airspeed - [u, v, w] body-frame airspeed components (m/s)
   * @returns [Fx, Fy, Fz] drag force (N), opposes motion
   */
  compute(airspeed: [number, number, number]): [number, number, number] {
    const [u, v, w] = airspeed
    // Avoid -0 in output for cleaner comparisons
    const fx = u === 0 ? 0 : -this.coeffs.cdx * Math.abs(u) * u
    const fy = v === 0 ? 0 : -this.coeffs.cdy * Math.abs(v) * v
    const fz = w === 0 ? 0 : -this.coeffs.cdz * Math.abs(w) * w
    return [fx, fy, fz]
  }
}
