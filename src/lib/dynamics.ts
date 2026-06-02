// NED coordinate system: x=North, y=East, z=Down
// Body frame: same orientation as NED, origin at CG

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
  inertia?: [number, number, number]  // [Jxx, Jyy, Jzz] (kg·m²), default diagonal
}

const G = 9.81  // gravity (m/s²), downward in NED

export function createState(params: { mass: number }): DroneState {
  return {
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    quaternion: [1, 0, 0, 0],  // identity quaternion
    angularVelocity: [0, 0, 0],
  }
}

/** Quaternion to rotation matrix (body → NED) */
function quatToRotationMatrix(q: [number, number, number, number]): number[][] {
  const [w, x, y, z] = q
  return [
    [1 - 2*(y*y + z*z), 2*(x*y - z*w),     2*(x*z + y*w)],
    [2*(x*y + z*w),     1 - 2*(x*x + z*z), 2*(y*z - x*w)],
    [2*(x*z - y*w),     2*(y*z + x*w),     1 - 2*(x*x + y*y)],
  ]
}

/** Rotate a vector from body frame to NED */
function rotateBodyToNed(
  v: [number, number, number],
  q: [number, number, number, number]
): [number, number, number] {
  const R = quatToRotationMatrix(q)
  return [
    R[0][0]*v[0] + R[0][1]*v[1] + R[0][2]*v[2],
    R[1][0]*v[0] + R[1][1]*v[1] + R[1][2]*v[2],
    R[2][0]*v[0] + R[2][1]*v[1] + R[2][2]*v[2],
  ]
}

/** Quaternion multiplication: q1 ⊗ q2 */
function quatMultiply(
  q1: [number, number, number, number],
  q2: [number, number, number, number]
): [number, number, number, number] {
  const [w1, x1, y1, z1] = q1
  const [w2, x2, y2, z2] = q2
  return [
    w1*w2 - x1*x2 - y1*y2 - z1*z2,
    w1*x2 + x1*w2 + y1*z2 - z1*y2,
    w1*y2 - x1*z2 + y1*w2 + z1*x2,
    w1*z2 + x1*y2 - y1*x2 + z1*w2,
  ]
}

/** Normalize quaternion */
function quatNormalize(q: [number, number, number, number]): [number, number, number, number] {
  const norm = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3])
  if (norm < 1e-10) return [1, 0, 0, 0]
  return [q[0]/norm, q[1]/norm, q[2]/norm, q[3]/norm]
}

/** Vector cross product */
function cross(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
  ]
}

/** One-step Euler integration */
export function integrate(
  state: DroneState,
  forces: ForcesAndMoments,
  dt: number,
  params?: DynamicsParams
): DroneState {
  const m = params?.mass ?? 1.5
  const Jxx = params?.inertia?.[0] ?? 0.01
  const Jyy = params?.inertia?.[1] ?? 0.01
  const Jzz = params?.inertia?.[2] ?? 0.02

  // 1. Position update: p_dot = v
  const newPosition: [number, number, number] = [
    state.position[0] + state.velocity[0] * dt,
    state.position[1] + state.velocity[1] * dt,
    state.position[2] + state.velocity[2] * dt,
  ]

  // 2. Velocity update: v_dot = R * F_body / m + g
  const forceNed = rotateBodyToNed(forces.totalForceBody, state.quaternion)
  const newVelocity: [number, number, number] = [
    state.velocity[0] + (forceNed[0] / m) * dt,
    state.velocity[1] + (forceNed[1] / m) * dt,
    state.velocity[2] + (forceNed[2] / m + G) * dt,  // +G because z is down in NED
  ]

  // 3. Angular velocity update: w_dot = J^-1 * (M - w × (J*w))
  const w = state.angularVelocity
  const Jw: [number, number, number] = [Jxx*w[0], Jyy*w[1], Jzz*w[2]]
  const gyroTerm = cross(w, Jw)
  const M = forces.totalMomentBody

  const newAngularVelocity: [number, number, number] = [
    w[0] + ((M[0] - gyroTerm[0]) / Jxx) * dt,
    w[1] + ((M[1] - gyroTerm[1]) / Jyy) * dt,
    w[2] + ((M[2] - gyroTerm[2]) / Jzz) * dt,
  ]

  // 4. Quaternion update: q_dot = 0.5 * q ⊗ [0, w]
  const qw = quatMultiply(
    state.quaternion,
    [0, w[0], w[1], w[2]]
  )
  const newQuaternion: [number, number, number, number] = [
    state.quaternion[0] + 0.5 * qw[0] * dt,
    state.quaternion[1] + 0.5 * qw[1] * dt,
    state.quaternion[2] + 0.5 * qw[2] * dt,
    state.quaternion[3] + 0.5 * qw[3] * dt,
  ]

  return {
    position: newPosition,
    velocity: newVelocity,
    quaternion: quatNormalize(newQuaternion),
    angularVelocity: newAngularVelocity,
  }
}
