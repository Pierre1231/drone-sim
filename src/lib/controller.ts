/**
 * Document-aligned nonlinear cascaded controller.
 *
 * Implements the position-velocity-attitude-rate cascade from the project
 * math model document:
 *   - Position loop PI
 *   - Velocity loop PID with feedforward acceleration
 *   - Attitude loop using rotation-matrix error
 *   - Angular velocity loop PID
 *
 * The controller outputs a scalar desired total thrust and a body-frame
 * moment vector that can be passed directly to a control allocator.
 */

import { quatToRotationMatrix } from './coordinates'
import { PIDController } from './propulsion'
import type { Mat3, Quaternion } from './coordinates'

/** 3D vector expressed as a plain mutable tuple. */
type V3 = [number, number, number]

/** Gain matrices from the test-case document (diagonal entries per axis). */
export interface ControllerGains {
  positionKp: V3
  positionKi: V3
  velocityKp: V3
  velocityKi: V3
  velocityKd: V3
  attitudeKp: V3
  rateKp: V3
  rateKi: V3
  rateKd: V3
}

/** Output saturation limits per axis. */
export interface ControllerLimits {
  /** Maximum commanded velocity from the position loop (m/s). */
  maxVelocity?: V3
  /** Maximum commanded acceleration from the velocity loop (m/s²). */
  maxAcceleration?: V3
  /** Maximum commanded angular velocity from the attitude loop (rad/s). */
  maxAngularVelocity?: V3
  /** Maximum commanded moment from the rate loop (N·m). */
  maxMoment?: V3
}

export interface CascadedControllerParams {
  mass: number // kg
  gains: ControllerGains
  limits?: ControllerLimits
  eps?: {
    /** Minimum desired force magnitude used to construct thrust direction. */
    F?: number
    /** Parallel threshold used when the heading reference is aligned with b_zd. */
    R?: number
  }
}

export interface ControllerSetpoint {
  position: V3 // NED (m)
  velocity?: V3 // NED (m/s)
  acceleration?: V3 // NED feedforward acceleration (m/s²)
  /** Desired heading reference direction b_x,ref^n (unit vector, default north). */
  heading?: V3
  angularVelocity?: V3 // body frame (rad/s)
}

export interface ControllerStateEstimate {
  position: V3 // NED (m)
  velocity: V3 // NED (m/s)
  quaternion: Quaternion | [number, number, number, number]
  angularVelocity: V3 // body frame (rad/s)
}

export interface ControllerOutput {
  /** Desired total thrust along the body thrust axis b_T^b = -e_z^b (N). */
  totalThrust: number
  /** Desired body-frame control moment (N·m). */
  moments: V3
  /** Desired net force expressed in NED (N). */
  desiredForceNed: V3
  /** Desired attitude rotation matrix R_d (columns are body axes in NED). */
  desiredRotationMatrix: Mat3
  /** Rotation-matrix attitude error e_R. */
  attitudeError: V3
}

const G = 9.81

function v3Sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function v3Scale(a: V3, s: number): V3 {
  return [a[0] * s, a[1] * s, a[2] * s]
}

function v3Dot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function v3Norm(a: V3): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
}

function mat3Transpose(M: Mat3): Mat3 {
  return [
    [M[0][0], M[1][0], M[2][0]],
    [M[0][1], M[1][1], M[2][1]],
    [M[0][2], M[1][2], M[2][2]],
  ] as unknown as Mat3
}

function mat3Mul(A: Mat3, B: Mat3): Mat3 {
  return [
    [
      A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0],
      A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1],
      A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2],
    ],
    [
      A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0],
      A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1],
      A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2],
    ],
    [
      A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0],
      A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1],
      A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2],
    ],
  ] as unknown as Mat3
}

function mat3Sub(A: Mat3, B: Mat3): Mat3 {
  return [
    [A[0][0] - B[0][0], A[0][1] - B[0][1], A[0][2] - B[0][2]],
    [A[1][0] - B[1][0], A[1][1] - B[1][1], A[1][2] - B[1][2]],
    [A[2][0] - B[2][0], A[2][1] - B[2][1], A[2][2] - B[2][2]],
  ] as unknown as Mat3
}

function mat3VecMul(M: Mat3, v: V3): V3 {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ]
}

/**
 * Extract the vector corresponding to a skew-symmetric matrix.
 * For S = [[0,-z,y],[z,0,-x],[-y,x,0]] the vee map returns [x,y,z].
 */
function vee(S: Mat3): V3 {
  return [S[2][1], S[0][2], S[1][0]]
}

/** Default per-axis output limits typical for a small quadrotor. */
const DEFAULT_LIMITS: Required<ControllerLimits> = {
  maxVelocity: [10, 10, 10],
  maxAcceleration: [15, 15, 15],
  maxAngularVelocity: [6, 6, 3],
  maxMoment: [5, 5, 2],
}

function resolveLimit(provided: V3 | undefined, fallback: V3): V3 {
  return provided ? [provided[0], provided[1], provided[2]] : fallback
}

/**
 * Document test-case gain matrices.
 */
export function createDocumentControllerGains(): ControllerGains {
  return {
    positionKp: [1.0, 1.0, 1.2],
    positionKi: [0.02, 0.02, 0.03],
    velocityKp: [2.0, 2.0, 2.5],
    velocityKi: [0.10, 0.10, 0.15],
    velocityKd: [0.20, 0.20, 0.25],
    attitudeKp: [4.0, 4.0, 2.0],
    rateKp: [0.20, 0.20, 0.12],
    rateKi: [0.03, 0.03, 0.02],
    rateKd: [0.01, 0.01, 0.008],
  }
}

export class CascadedController {
  private mass: number
  private epsF: number
  private epsR: number
  private lastDesiredRotationMatrix: Mat3

  private posPids: PIDController[]
  private velPids: PIDController[]
  private attPids: PIDController[]
  private ratePids: PIDController[]

  constructor(params: CascadedControllerParams) {
    this.mass = params.mass
    this.epsF = params.eps?.F ?? 1e-6
    this.epsR = params.eps?.R ?? 1e-6
    this.lastDesiredRotationMatrix = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as unknown as Mat3

    const gains = params.gains
    const limits = params.limits ?? {}
    const maxVel = resolveLimit(limits.maxVelocity, DEFAULT_LIMITS.maxVelocity)
    const maxAcc = resolveLimit(limits.maxAcceleration, DEFAULT_LIMITS.maxAcceleration)
    const maxOmega = resolveLimit(limits.maxAngularVelocity, DEFAULT_LIMITS.maxAngularVelocity)
    const maxMoment = resolveLimit(limits.maxMoment, DEFAULT_LIMITS.maxMoment)

    this.posPids = gains.positionKp.map((kp, i) =>
      new PIDController({ kp, ki: gains.positionKi[i], kd: 0, outputMin: -maxVel[i], outputMax: maxVel[i] })
    ) as PIDController[]

    this.velPids = gains.velocityKp.map((kp, i) =>
      new PIDController({ kp, ki: gains.velocityKi[i], kd: gains.velocityKd[i], outputMin: -maxAcc[i], outputMax: maxAcc[i] })
    ) as PIDController[]

    this.attPids = gains.attitudeKp.map((kp, i) =>
      new PIDController({ kp, ki: 0, kd: 0, outputMin: -maxOmega[i], outputMax: maxOmega[i] })
    ) as PIDController[]

    this.ratePids = gains.rateKp.map((kp, i) =>
      new PIDController({ kp, ki: gains.rateKi[i], kd: gains.rateKd[i], outputMin: -maxMoment[i], outputMax: maxMoment[i] })
    ) as PIDController[]
  }

  /**
   * Reset all internal PID integrators and the stored desired attitude.
   */
  reset(): void {
    for (const pid of this.posPids) pid.reset()
    for (const pid of this.velPids) pid.reset()
    for (const pid of this.attPids) pid.reset()
    for (const pid of this.ratePids) pid.reset()
    this.lastDesiredRotationMatrix = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ] as unknown as Mat3
  }

  /**
   * Run one control cycle.
   *
   * @param setpoint Desired trajectory and heading reference.
   * @param state Estimated/current rigid-body state.
   * @param dt Control period (s).
   * @param feedforwards Optional estimated aerodynamic/disturbance forces.
   */
  update(
    setpoint: ControllerSetpoint,
    state: ControllerStateEstimate,
    dt: number,
    feedforwards?: {
      aeroForceNed?: V3
      disturbanceForceNed?: V3
      disturbanceMomentBody?: V3
    }
  ): ControllerOutput {
    const v_d: V3 = setpoint.velocity ?? [0, 0, 0]
    const a_ff: V3 = setpoint.acceleration ?? [0, 0, 0]
    const omega_d: V3 = setpoint.angularVelocity ?? [0, 0, 0]

    // ========== Position loop (PI) ==========
    const e_p = v3Sub(setpoint.position, state.position)
    const v_c: V3 = [
      v_d[0] + this.posPids[0].update(e_p[0], dt),
      v_d[1] + this.posPids[1].update(e_p[1], dt),
      v_d[2] + this.posPids[2].update(e_p[2], dt),
    ]

    // ========== Velocity loop (PID + feedforward) ==========
    const e_v = v3Sub(v_c, state.velocity)
    const a_c: V3 = [
      a_ff[0] + this.velPids[0].update(e_v[0], dt),
      a_ff[1] + this.velPids[1].update(e_v[1], dt),
      a_ff[2] + this.velPids[2].update(e_v[2], dt),
    ]

    // Desired net force in NED
    const F_c_ned: V3 = [
      this.mass * (a_c[0] - 0),
      this.mass * (a_c[1] - 0),
      this.mass * (a_c[2] - G),
    ]

    const aeroForceNed = feedforwards?.aeroForceNed
    if (aeroForceNed) {
      F_c_ned[0] -= aeroForceNed[0]
      F_c_ned[1] -= aeroForceNed[1]
      F_c_ned[2] -= aeroForceNed[2]
    }

    const disturbanceForceNed = feedforwards?.disturbanceForceNed
    if (disturbanceForceNed) {
      F_c_ned[0] -= disturbanceForceNed[0]
      F_c_ned[1] -= disturbanceForceNed[1]
      F_c_ned[2] -= disturbanceForceNed[2]
    }

    const F_norm = v3Norm(F_c_ned)

    // Total thrust scalar: project the desired NED force onto the body thrust
    // axis b_T^b = -e_z^b (document Eq. 880-882). T_c = (b_T^b)^T F_c^b.
    const R = quatToRotationMatrix(state.quaternion as Quaternion)
    const F_c_body = mat3VecMul(mat3Transpose(R), F_c_ned)
    let totalThrust = -F_c_body[2]

    // Desired thrust direction and attitude
    let R_d: Mat3
    if (F_norm < this.epsF) {
      // Keep previous desired attitude when the desired force is negligible.
      totalThrust = 0
      R_d = this.lastDesiredRotationMatrix
    } else {
      if (totalThrust < 0) {
        totalThrust = 0
      }
      const b_T_ned = v3Scale(F_c_ned, 1 / F_norm)
      const b_zd: V3 = [-b_T_ned[0], -b_T_ned[1], -b_T_ned[2]]

      let b_x_ref = setpoint.heading ?? ([1, 0, 0] as V3)
      // Avoid a heading reference that is (anti-)parallel to b_zd.
      if (Math.abs(Math.abs(v3Dot(b_zd, b_x_ref)) - 1) < this.epsR) {
        b_x_ref = Math.abs(b_zd[0]) < 0.9 ? ([1, 0, 0] as V3) : ([0, 1, 0] as V3)
      }

      const c_y: V3 = [
        b_zd[1] * b_x_ref[2] - b_zd[2] * b_x_ref[1],
        b_zd[2] * b_x_ref[0] - b_zd[0] * b_x_ref[2],
        b_zd[0] * b_x_ref[1] - b_zd[1] * b_x_ref[0],
      ]
      const c_y_norm = v3Norm(c_y)
      const b_yd = c_y_norm > this.epsR ? v3Scale(c_y, 1 / c_y_norm) : ([0, 1, 0] as V3)
      const b_xd: V3 = [
        b_yd[1] * b_zd[2] - b_yd[2] * b_zd[1],
        b_yd[2] * b_zd[0] - b_yd[0] * b_zd[2],
        b_yd[0] * b_zd[1] - b_yd[1] * b_zd[0],
      ]

      R_d = [
        [b_xd[0], b_yd[0], b_zd[0]],
        [b_xd[1], b_yd[1], b_zd[1]],
        [b_xd[2], b_yd[2], b_zd[2]],
      ] as unknown as Mat3
    }

    this.lastDesiredRotationMatrix = R_d

    // ========== Attitude loop (rotation-matrix error) ==========
    const R_T = mat3Transpose(R)
    const R_d_T = mat3Transpose(R_d)
    const e_R = v3Scale(vee(mat3Sub(mat3Mul(R_T, R_d), mat3Mul(R_d_T, R))), 0.5)

    const omega_c: V3 = [
      omega_d[0] + this.attPids[0].update(e_R[0], dt),
      omega_d[1] + this.attPids[1].update(e_R[1], dt),
      omega_d[2] + this.attPids[2].update(e_R[2], dt),
    ]

    // ========== Angular velocity loop (PID) ==========
    const e_omega = v3Sub(omega_c, state.angularVelocity)
    const moments: V3 = [
      this.ratePids[0].update(e_omega[0], dt),
      this.ratePids[1].update(e_omega[1], dt),
      this.ratePids[2].update(e_omega[2], dt),
    ]

    const disturbanceMomentBody = feedforwards?.disturbanceMomentBody
    if (disturbanceMomentBody) {
      moments[0] -= disturbanceMomentBody[0]
      moments[1] -= disturbanceMomentBody[1]
      moments[2] -= disturbanceMomentBody[2]
    }

    return {
      totalThrust,
      moments,
      desiredForceNed: F_c_ned,
      desiredRotationMatrix: R_d,
      attitudeError: e_R,
    }
  }
}
