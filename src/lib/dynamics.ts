/**
 * Rigid-body dynamics and integration.
 *
 * Conventions follow the project math model document:
 * - NED local tangent frame, x=North, y=East, z=Down.
 * - Body frame origin at CG, x=forward, y=right, z=down.
 * - Quaternion uses Hamilton convention [w, x, y, z] and represents R_b^n.
 *
 * This module provides a 4th-order Runge-Kutta integrator for the 6-DOF
 * equations and a multi-rate driver for fast (1 ms) rigid-body/control/propulsion
 * steps and slow (100 ms) battery/thermal steps.
 */

import {
  rotateBodyToNed,
  quatMultiply,
  quatNormalize,
  cross,
  mat3MulVec3,
  type Mat3,
} from './coordinates'

export { rotateBodyToNed, rotateNedToBody } from './coordinates'

export interface DroneState {
  position: [number, number, number]      // NED: [px, py, pz] (m)
  velocity: [number, number, number]      // NED: [vx, vy, vz] (m/s)
  quaternion: [number, number, number, number] // [w, x, y, z]
  angularVelocity: [number, number, number]    // Body: [wx, wy, wz] (rad/s)
}

export interface ForcesAndMoments {
  totalForceBody: [number, number, number]     // Body frame (N)
  totalMomentBody: [number, number, number]    // Body frame (N·m)
}

export interface DynamicsParams {
  mass: number           // kg
  /** Full 3x3 inertia tensor, or legacy diagonal [Jxx, Jyy, Jzz]. */
  inertia?: Mat3 | [number, number, number]
}

const G = 9.81  // gravity (m/s²), downward in NED

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createState(_params: { mass: number }): DroneState {
  return {
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    quaternion: [1, 0, 0, 0],
    angularVelocity: [0, 0, 0],
  }
}

function isDiagonalInertia(inertia: Mat3 | [number, number, number]): inertia is [number, number, number] {
  return Array.isArray(inertia) && inertia.length === 3 && typeof inertia[0] === 'number'
}

/** Quaternion to Euler angles (roll, pitch, yaw) in radians, NED convention. */
export function quatToEuler(q: [number, number, number, number]): [number, number, number] {
  const [w, x, y, z] = q
  const sinr_cosp = 2 * (w * x + y * z)
  const cosr_cosp = 1 - 2 * (x * x + y * y)
  const roll = Math.atan2(sinr_cosp, cosr_cosp)

  const sinp = 2 * (w * y - z * x)
  const pitch = Math.abs(sinp) >= 1
    ? (sinp > 0 ? Math.PI / 2 : -Math.PI / 2)
    : Math.asin(sinp)

  const siny_cosp = 2 * (w * z + x * y)
  const cosy_cosp = 1 - 2 * (y * y + z * z)
  const yaw = Math.atan2(siny_cosp, cosy_cosp)

  return [roll, pitch, yaw]
}

/** Dot product of two quaternions. */
function quatDot(a: [number, number, number, number], b: [number, number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
}

/** Enforce the same quaternion hemisphere as the reference quaternion. */
function alignQuaternion(
  q: [number, number, number, number],
  ref: [number, number, number, number]
): [number, number, number, number] {
  return quatDot(q, ref) < 0
    ? [-q[0], -q[1], -q[2], -q[3]]
    : q
}

/** Quaternion derivative: q_dot = 0.5 * q ⊗ [0, ω]. */
function quatDerivative(
  q: [number, number, number, number],
  omega: [number, number, number]
): [number, number, number, number] {
  const dq = quatMultiply(
    q as unknown as Parameters<typeof quatMultiply>[0],
    [0, omega[0], omega[1], omega[2]] as unknown as Parameters<typeof quatMultiply>[1]
  )
  return [0.5 * dq[0], 0.5 * dq[1], 0.5 * dq[2], 0.5 * dq[3]]
}

/** Solve A x = b for a 3x3 matrix A using Gaussian elimination with partial pivoting. */
function solveLinear3x3(A: Mat3, b: readonly [number, number, number]): [number, number, number] {
  // Make a mutable copy
  const M = [
    [A[0][0], A[0][1], A[0][2], b[0]],
    [A[1][0], A[1][1], A[1][2], b[1]],
    [A[2][0], A[2][1], A[2][2], b[2]],
  ]

  for (let col = 0; col < 3; col++) {
    let pivot = col
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row
    }
    if (Math.abs(M[pivot][col]) < 1e-12) continue
    ;[M[col], M[pivot]] = [M[pivot], M[col]]

    for (let row = col + 1; row < 3; row++) {
      const factor = M[row][col] / M[col][col]
      for (let k = col; k < 4; k++) {
        M[row][k] -= factor * M[col][k]
      }
    }
  }

  const x = [0, 0, 0]
  for (let i = 2; i >= 0; i--) {
    let sum = M[i][3]
    for (let j = i + 1; j < 3; j++) {
      sum -= M[i][j] * x[j]
    }
    x[i] = Math.abs(M[i][i]) > 1e-12 ? sum / M[i][i] : 0
  }
  return x as [number, number, number]
}

/** Compute angular acceleration J α = M - ω × (Jω). */
function angularAcceleration(
  omega: [number, number, number],
  moment: [number, number, number],
  inertia: Mat3 | [number, number, number]
): [number, number, number] {
  if (isDiagonalInertia(inertia)) {
    const Jw: [number, number, number] = [inertia[0] * omega[0], inertia[1] * omega[1], inertia[2] * omega[2]]
    const gyroTerm = cross(omega, Jw)
    return [
      (moment[0] - gyroTerm[0]) / inertia[0],
      (moment[1] - gyroTerm[1]) / inertia[1],
      (moment[2] - gyroTerm[2]) / inertia[2],
    ]
  }

  const Jw = mat3MulVec3(inertia, omega)
  const gyroTerm = cross(omega, Jw)
  const rhs: [number, number, number] = [
    moment[0] - gyroTerm[0],
    moment[1] - gyroTerm[1],
    moment[2] - gyroTerm[2],
  ]
  return solveLinear3x3(inertia, rhs)
}

interface StateDerivative {
  position: [number, number, number]
  velocity: [number, number, number]
  quaternion: [number, number, number, number]
  angularVelocity: [number, number, number]
}

function computeDerivative(
  state: DroneState,
  forces: ForcesAndMoments,
  params: Required<Pick<DynamicsParams, 'mass' | 'inertia'>>
): StateDerivative {
  const m = params.mass
  const inertia = params.inertia

  // Normalize quaternion before using it for rotation to avoid drift during RK4 stages.
  const q = quatNormalize(state.quaternion as unknown as Parameters<typeof quatNormalize>[0]) as unknown as [number, number, number, number]
  const forceNed = rotateBodyToNed(forces.totalForceBody, q)

  return {
    position: [state.velocity[0], state.velocity[1], state.velocity[2]],
    velocity: [
      forceNed[0] / m,
      forceNed[1] / m,
      forceNed[2] / m + G,
    ],
    quaternion: quatDerivative(q, state.angularVelocity),
    angularVelocity: angularAcceleration(state.angularVelocity, forces.totalMomentBody, inertia),
  }
}

function addStateAndDerivative(
  state: DroneState,
  deriv: StateDerivative,
  scale: number
): DroneState {
  return {
    position: [
      state.position[0] + deriv.position[0] * scale,
      state.position[1] + deriv.position[1] * scale,
      state.position[2] + deriv.position[2] * scale,
    ],
    velocity: [
      state.velocity[0] + deriv.velocity[0] * scale,
      state.velocity[1] + deriv.velocity[1] * scale,
      state.velocity[2] + deriv.velocity[2] * scale,
    ],
    quaternion: [
      state.quaternion[0] + deriv.quaternion[0] * scale,
      state.quaternion[1] + deriv.quaternion[1] * scale,
      state.quaternion[2] + deriv.quaternion[2] * scale,
      state.quaternion[3] + deriv.quaternion[3] * scale,
    ],
    angularVelocity: [
      state.angularVelocity[0] + deriv.angularVelocity[0] * scale,
      state.angularVelocity[1] + deriv.angularVelocity[1] * scale,
      state.angularVelocity[2] + deriv.angularVelocity[2] * scale,
    ],
  }
}

function combineDerivatives(
  k1: StateDerivative,
  k2: StateDerivative,
  k3: StateDerivative,
  k4: StateDerivative
): StateDerivative {
  return {
    position: [
      (k1.position[0] + 2 * k2.position[0] + 2 * k3.position[0] + k4.position[0]) / 6,
      (k1.position[1] + 2 * k2.position[1] + 2 * k3.position[1] + k4.position[1]) / 6,
      (k1.position[2] + 2 * k2.position[2] + 2 * k3.position[2] + k4.position[2]) / 6,
    ],
    velocity: [
      (k1.velocity[0] + 2 * k2.velocity[0] + 2 * k3.velocity[0] + k4.velocity[0]) / 6,
      (k1.velocity[1] + 2 * k2.velocity[1] + 2 * k3.velocity[1] + k4.velocity[1]) / 6,
      (k1.velocity[2] + 2 * k2.velocity[2] + 2 * k3.velocity[2] + k4.velocity[2]) / 6,
    ],
    quaternion: [
      (k1.quaternion[0] + 2 * k2.quaternion[0] + 2 * k3.quaternion[0] + k4.quaternion[0]) / 6,
      (k1.quaternion[1] + 2 * k2.quaternion[1] + 2 * k3.quaternion[1] + k4.quaternion[1]) / 6,
      (k1.quaternion[2] + 2 * k2.quaternion[2] + 2 * k3.quaternion[2] + k4.quaternion[2]) / 6,
      (k1.quaternion[3] + 2 * k2.quaternion[3] + 2 * k3.quaternion[3] + k4.quaternion[3]) / 6,
    ],
    angularVelocity: [
      (k1.angularVelocity[0] + 2 * k2.angularVelocity[0] + 2 * k3.angularVelocity[0] + k4.angularVelocity[0]) / 6,
      (k1.angularVelocity[1] + 2 * k2.angularVelocity[1] + 2 * k3.angularVelocity[1] + k4.angularVelocity[1]) / 6,
      (k1.angularVelocity[2] + 2 * k2.angularVelocity[2] + 2 * k3.angularVelocity[2] + k4.angularVelocity[2]) / 6,
    ],
  }
}

/**
 * Integrate the 6-DOF rigid-body equations with a single 4th-order Runge-Kutta
 * step. Forces and moments are held constant over the step.
 */
export function integrate(
  state: DroneState,
  forces: ForcesAndMoments,
  dt: number,
  params?: DynamicsParams
): DroneState {
  const mass = params?.mass ?? 1.5
  const inertia = params?.inertia ?? [0.01, 0.01, 0.02]
  const resolvedParams = { mass, inertia }

  const k1 = computeDerivative(state, forces, resolvedParams)
  const s2 = addStateAndDerivative(state, k1, dt / 2)
  const k2 = computeDerivative(s2, forces, resolvedParams)
  const s3 = addStateAndDerivative(state, k2, dt / 2)
  const k3 = computeDerivative(s3, forces, resolvedParams)
  const s4 = addStateAndDerivative(state, k3, dt)
  const k4 = computeDerivative(s4, forces, resolvedParams)

  const k = combineDerivatives(k1, k2, k3, k4)
  const newState = addStateAndDerivative(state, k, dt)

  const normalizedQ = quatNormalize(newState.quaternion as unknown as Parameters<typeof quatNormalize>[0]) as unknown as [number, number, number, number]
  const alignedQ = alignQuaternion(normalizedQ, state.quaternion)

  return {
    position: newState.position,
    velocity: newState.velocity,
    quaternion: alignedQ,
    angularVelocity: newState.angularVelocity,
  }
}

/** Integrate state forward by `dt` using `n` equal RK4 sub-steps. */
export function integrateWithSubsteps(
  state: DroneState,
  forces: ForcesAndMoments,
  dt: number,
  n: number,
  params?: DynamicsParams
): DroneState {
  let current = state
  const subDt = dt / n
  for (let i = 0; i < n; i++) {
    current = integrate(current, forces, subDt, params)
  }
  return current
}

/** Multi-rate driver configuration. */
export interface MultiRateSimulationConfig {
  /** Fast (rigid-body / control / propulsion) step size (s). */
  fastDt: number
  /** Slow (battery / thermal) step size (s). Must be a multiple of fastDt. */
  slowDt: number
  /** Total simulated time (s). */
  endTime: number
  initialState: DroneState
  params?: DynamicsParams
  /** Force/moment generator evaluated at the current state and time. */
  forces: (state: DroneState, time: number) => ForcesAndMoments
  /** Optional callback invoked after every fast step. */
  onFast?: (state: DroneState, time: number) => void
  /** Optional callback invoked after every slow step. */
  onSlow?: (state: DroneState, time: number) => void
}

/**
 * Run a multi-rate simulation.
 *
 * The state is advanced with RK4 at `fastDt`. Every `slowDt / fastDt` fast
 * steps the optional `onSlow` callback is invoked, matching the document
 * requirement of 1 ms fast dynamics and 100 ms slow battery/thermal updates.
 */
export function simulateMultiRate(config: MultiRateSimulationConfig): DroneState {
  const { fastDt, slowDt, endTime, initialState, params, forces, onFast, onSlow } = config
  if (slowDt <= 0 || fastDt <= 0) throw new Error('Step sizes must be positive')
  const ratio = slowDt / fastDt
  if (Math.abs(ratio - Math.round(ratio)) > 1e-9) {
    throw new Error('slowDt must be an integer multiple of fastDt')
  }

  const stepsPerSlow = Math.round(slowDt / fastDt)
  const totalSteps = Math.round(endTime / fastDt)

  let state = initialState
  let time = 0

  for (let i = 0; i < totalSteps; i++) {
    const f = forces(state, time)
    state = integrate(state, f, fastDt, params)
    time += fastDt

    if (onFast) onFast(state, time)
    if ((i + 1) % stepsPerSlow === 0 && onSlow) {
      onSlow(state, time)
    }
  }

  return state
}
