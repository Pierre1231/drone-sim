/**
 * Rotor angular momentum, gyroscopic and acceleration moments.
 *
 * Conventions follow the project math model document:
 * - Each rotor spins about the body z-axis (positive downward when viewed from
 *   above for one rotation sense). The angular momentum direction is
 *   e_Ω,i^b = s_i e_z^b, where s_i ∈ {+1, -1}.
 * - H_r^b = Σ J_rot,i ω_i e_Ω,i^b.
 * - M_gyro^b = -ω^b × H_r^b.
 * - M_acc^b = -(dH_r^b/dt)|_b.
 * - M_rotor^b = M_gyro^b + M_acc^b.
 */

export interface RotorState {
  /** Angular speed magnitude (rad/s). */
  speed: number
  /** Moment of inertia about the spin axis (kg·m²). */
  inertia: number
  /** Angular momentum direction sign relative to body z-axis. */
  sign: number
}

/**
 * Compute the total rotor angular momentum in the body frame.
 *
 * Document formula:
 *   H_r^b = Σ_i J_rot,i ω_i e_Ω,i^b
 *
 * When all rotors are aligned with the body z-axis this reduces to
 *   H_z = Σ_i s_i J_rot,i ω_i.
 */
export function computeRotorAngularMomentum(
  rotors: readonly RotorState[],
  spinAxis: readonly [number, number, number] = [0, 0, 1]
): [number, number, number] {
  let hx = 0
  let hy = 0
  let hz = 0
  for (const r of rotors) {
    const h = r.inertia * r.speed * Math.sign(r.sign)
    hx += h * spinAxis[0]
    hy += h * spinAxis[1]
    hz += h * spinAxis[2]
  }
  return [hx, hy, hz]
}

/** Compute the gyroscopic moment M_gyro^b = -ω^b × H_r^b. */
export function computeGyroscopicMoment(
  angularVelocity: readonly [number, number, number],
  angularMomentum: readonly [number, number, number]
): [number, number, number] {
  const [p, q, r] = angularVelocity
  const [hx, hy, hz] = angularMomentum
  // ω × H
  const crossX = q * hz - r * hy
  const crossY = r * hx - p * hz
  const crossZ = p * hy - q * hx
  return [-crossX, -crossY, -crossZ]
}

/**
 * Compute the rotor acceleration (angular momentum change) moment.
 *
 * Document formula:
 *   M_acc^b = -(dH_r^b/dt)|_b
 *
 * For rotors aligned with the body z-axis:
 *   H_z = Σ_i s_i J_rot,i ω_i
 *   M_acc^b = [0, 0, -dH_z/dt]^T
 */
export function computeRotorAccelerationMoment(
  rotors: readonly RotorState[],
  previousRotors: readonly RotorState[],
  dt: number,
  spinAxis: readonly [number, number, number] = [0, 0, 1]
): [number, number, number] {
  let dHz = 0
  for (let i = 0; i < rotors.length; i++) {
    const r = rotors[i]
    const prev = previousRotors[i]
    const sign = Math.sign(r.sign)
    dHz += sign * r.inertia * (r.speed - prev.speed) / dt
  }
  return [-dHz * spinAxis[0], -dHz * spinAxis[1], -dHz * spinAxis[2]]
}

/**
 * Convenience: total rotor-induced moment on the body.
 *
 *   M_rotor^b = M_gyro^b + M_acc^b
 */
export function computeRotorMoment(
  angularVelocity: readonly [number, number, number],
  angularMomentum: readonly [number, number, number],
  rotors: readonly RotorState[],
  previousRotors: readonly RotorState[],
  dt: number
): [number, number, number] {
  const gyro = computeGyroscopicMoment(angularVelocity, angularMomentum)
  const acc = computeRotorAccelerationMoment(rotors, previousRotors, dt)
  return [gyro[0] + acc[0], gyro[1] + acc[1], gyro[2] + acc[2]]
}

/**
 * Build a rotor state from the common quadrotor convention where all rotors
 * point downward (-z_b) and `torqueSign` is the angular momentum sign s_i,
 * which equals the aerodynamic reaction torque sign χ_i for this geometry
 * because χ_i e_T^b = -e_Ω^b and e_T^b = -e_z^b implies e_Ω^b = s_i e_z^b.
 */
export function makeRotorState(
  speed: number,
  inertia: number,
  torqueSign: number
): RotorState {
  return { speed, inertia, sign: Math.sign(torqueSign) }
}
