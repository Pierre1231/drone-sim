/**
 * Aerodynamic force and moment models.
 *
 * Conventions follow the project math model document:
 * - Body-frame airspeed v_a^b = [u_b, v_b, w_b]^T.
 * - Drag force: F_d^b = -D_v(ρ) [u_b|u_b|, v_b|v_b|, w_b|w_b|]^T.
 *   D_v(ρ) = (ρ/ρ_ref) D_v,ref = ½ ρ diag(C_Dx A_x, C_Dy A_y, C_Dz A_z).
 * - Aerodynamic damping moment: M_d^b = -D_ω(ρ) [p|p|, q|q|, r|r|]^T.
 * - Drag moment arm: M_arm^b = r_d^b × F_d^b.
 *
 * StandardAtmosphere is re-exported from ./environment to avoid duplication.
 */

export { StandardAtmosphere } from './environment'

export interface DragCoefficients {
  cdx: number
  cdy: number
  cdz: number
}

export interface LowSpeedDragParams extends DragCoefficients {
  /** Reference density (kg/m³) at which the coefficients are identified. Default 1.225. */
  referenceDensity?: number
}

/**
 * Quadratic drag model in body frame with optional density scaling.
 *
 * The constructor coefficients correspond to the reference density. At a
 * different density the force is scaled by ρ/ρ_ref.
 */
export class LowSpeedDrag {
  private coeffs: DragCoefficients
  private referenceDensity: number

  constructor(params: LowSpeedDragParams) {
    this.coeffs = { cdx: params.cdx, cdy: params.cdy, cdz: params.cdz }
    this.referenceDensity = params.referenceDensity ?? 1.225
  }

  /**
   * Compute drag force in body frame (N).
   * @param airspeed - [u, v, w] body-frame airspeed components (m/s)
   * @param density - local air density (kg/m³). Defaults to reference density.
   * @returns [Fx, Fy, Fz] drag force (N), opposes motion
   */
  compute(
    airspeed: readonly [number, number, number],
    density: number = this.referenceDensity
  ): [number, number, number] {
    const [u, v, w] = airspeed
    const scale = density / this.referenceDensity
    const fx = u === 0 ? 0 : -scale * this.coeffs.cdx * Math.abs(u) * u
    const fy = v === 0 ? 0 : -scale * this.coeffs.cdy * Math.abs(v) * v
    const fz = w === 0 ? 0 : -scale * this.coeffs.cdz * Math.abs(w) * w
    return [fx, fy, fz]
  }
}

export interface AerodynamicDampingParams {
  /** Reference damping coefficients (N·m·s²/rad²) at referenceDensity. */
  dwx: number
  dwy: number
  dwz: number
  /** Reference density (kg/m³). Default 1.225. */
  referenceDensity?: number
}

/**
 * Quadratic aerodynamic damping moment model.
 *
 * Document formula:
 *   M_d^b = -D_ω(ρ) [p|p|, q|q|, r|r|]^T
 *   D_ω(ρ) = (ρ/ρ_ref) D_ω,ref
 */
export class AerodynamicDamping {
  private d: { x: number; y: number; z: number }
  private referenceDensity: number

  constructor(params: AerodynamicDampingParams) {
    this.d = { x: params.dwx, y: params.dwy, z: params.dwz }
    this.referenceDensity = params.referenceDensity ?? 1.225
  }

  compute(
    angularVelocity: readonly [number, number, number],
    density: number = this.referenceDensity
  ): [number, number, number] {
    const [p, q, r] = angularVelocity
    const scale = density / this.referenceDensity
    const mx = p === 0 ? 0 : -scale * this.d.x * Math.abs(p) * p
    const my = q === 0 ? 0 : -scale * this.d.y * Math.abs(q) * q
    const mz = r === 0 ? 0 : -scale * this.d.z * Math.abs(r) * r
    return [mx, my, mz]
  }
}

/**
 * Compute the moment produced by a drag force applied at an offset from the CG.
 *
 * Document formula: M_arm^b = r_d^b × F_d^b
 */
export function computeDragMomentArm(
  dragForce: readonly [number, number, number],
  dragCenter: readonly [number, number, number]
): [number, number, number] {
  const [fx, fy, fz] = dragForce
  const [rx, ry, rz] = dragCenter
  return [
    ry * fz - rz * fy,
    rz * fx - rx * fz,
    rx * fy - ry * fx,
  ]
}

/** Compute airspeed magnitude V_a = ||v_a^b||. */
export function computeAirspeedMagnitude(airspeed: readonly [number, number, number]): number {
  return Math.sqrt(airspeed[0] ** 2 + airspeed[1] ** 2 + airspeed[2] ** 2)
}

/** Compute angle of attack α = atan2(w_b, u_b), returning 0 when V_a is small. */
export function computeAngleOfAttack(
  airspeed: readonly [number, number, number],
  epsilonV: number = 1e-3
): number {
  const Va = computeAirspeedMagnitude(airspeed)
  if (Va < epsilonV) return 0
  return Math.atan2(airspeed[2], airspeed[0])
}

/** Compute sideslip angle β = atan2(v_b, sqrt(u_b² + w_b²)), returning 0 when V_a is small. */
export function computeSideslipAngle(
  airspeed: readonly [number, number, number],
  epsilonV: number = 1e-3
): number {
  const Va = computeAirspeedMagnitude(airspeed)
  if (Va < epsilonV) return 0
  return Math.atan2(airspeed[1], Math.sqrt(airspeed[0] ** 2 + airspeed[2] ** 2))
}
