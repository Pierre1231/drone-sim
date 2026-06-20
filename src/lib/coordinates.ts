/**
 * Coordinate systems and rotation math for the quadrotor simulation.
 *
 * Conventions follow the project math model document:
 * - NED local tangent frame: x=North, y=East, z=Down.
 * - Body frame: origin at CG, x=forward, y=right, z=down.
 * - Rotation matrix R_b^n rotates a vector from body frame to NED frame.
 * - Quaternions use Hamilton convention with scalar part first: [w, x, y, z].
 */

// Brand types to prevent mixing vectors, quaternions and matrices at compile time.
export type Vec3 = readonly [number, number, number] & { readonly __tag: 'Vec3' }
export type Quaternion = readonly [number, number, number, number] & { readonly __tag: 'Quaternion' }
export type Mat3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number]
] & { readonly __tag: 'Mat3' }

/** Construct a 3D vector. */
export function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z] as unknown as Vec3
}

/** Construct a Hamilton quaternion [w, x, y, z]. */
export function quat(w: number, x: number, y: number, z: number): Quaternion {
  return [w, x, y, z] as unknown as Quaternion
}

/** Construct a 3x3 rotation matrix. */
export function mat3(
  m11: number, m12: number, m13: number,
  m21: number, m22: number, m23: number,
  m31: number, m32: number, m33: number
): Mat3 {
  return [
    [m11, m12, m13],
    [m21, m22, m23],
    [m31, m32, m33]
  ] as unknown as Mat3
}

/**
 * Convert a Hamilton quaternion q_nb to the rotation matrix R_b^n that maps
 * body-frame vectors to NED-frame vectors.
 *
 * Document formula:
 *   R(q) = (w^2 - v^T v) I + 2 v v^T + 2 w [v]_x
 */
export function quatToRotationMatrix(q: Quaternion): Mat3 {
  const [w, x, y, z] = q
  const r11 = w * w + x * x - y * y - z * z
  const r12 = 2 * (x * y - w * z)
  const r13 = 2 * (x * z + w * y)
  const r21 = 2 * (x * y + w * z)
  const r22 = w * w - x * x + y * y - z * z
  const r23 = 2 * (y * z - w * x)
  const r31 = 2 * (x * z - w * y)
  const r32 = 2 * (y * z + w * x)
  const r33 = w * w - x * x - y * y + z * z
  return mat3(r11, r12, r13, r21, r22, r23, r31, r32, r33)
}

/** Return the cross product a × b. */
export function cross(
  a: readonly [number, number, number],
  b: readonly [number, number, number]
): Vec3 {
  return vec3(
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  )
}

/**
 * Return the skew-symmetric matrix [v]_× such that [v]_× w = v × w.
 * Document definition:
 *   [v]_× = [[0, -v3, v2], [v3, 0, -v1], [-v2, v1, 0]]
 */
export function skewSymmetric(v: readonly [number, number, number]): Mat3 {
  return mat3(
    0, -v[2], v[1],
    v[2], 0, -v[0],
    -v[1], v[0], 0
  )
}

/** Hamilton quaternion multiplication q1 ⊗ q2. */
export function quatMultiply(q1: Quaternion, q2: Quaternion): Quaternion {
  const [w1, x1, y1, z1] = q1
  const [w2, x2, y2, z2] = q2
  return quat(
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2
  )
}

/** Normalize a quaternion to unit length. */
export function quatNormalize(q: Quaternion): Quaternion {
  const norm = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3])
  if (norm < 1e-10) return quat(1, 0, 0, 0)
  return quat(q[0] / norm, q[1] / norm, q[2] / norm, q[3] / norm)
}

/** Multiply a 3x3 matrix with a 3D vector. */
export function mat3MulVec3(
  M: Mat3,
  v: readonly [number, number, number]
): Vec3 {
  return vec3(
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]
  )
}

/** Transpose a 3x3 matrix. */
function mat3Transpose(M: Mat3): Mat3 {
  return mat3(
    M[0][0], M[1][0], M[2][0],
    M[0][1], M[1][1], M[2][1],
    M[0][2], M[1][2], M[2][2]
  )
}

/** Rotate a vector from body frame to NED frame using quaternion q_nb. */
export function rotateBodyToNed(
  v: readonly [number, number, number],
  q: readonly [number, number, number, number]
): Vec3 {
  const R = quatToRotationMatrix(q as Quaternion)
  return mat3MulVec3(R, v)
}

/** Rotate a vector from NED frame to body frame using quaternion q_nb. */
export function rotateNedToBody(
  v: readonly [number, number, number],
  q: readonly [number, number, number, number]
): Vec3 {
  const R = quatToRotationMatrix(q as Quaternion)
  return mat3MulVec3(mat3Transpose(R), v)
}

/** Return the 3x3 identity matrix. */
export function identityMat3(): Mat3 {
  return mat3(
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  )
}

/** Multiply two 3x3 matrices. */
function mat3Mul(A: Mat3, B: Mat3): Mat3 {
  return mat3(
    A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0],
    A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1],
    A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2],
    A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0],
    A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1],
    A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2],
    A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0],
    A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1],
    A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2]
  )
}

/** Add two 3x3 matrices. */
function mat3Add(A: Mat3, B: Mat3): Mat3 {
  return mat3(
    A[0][0] + B[0][0], A[0][1] + B[0][1], A[0][2] + B[0][2],
    A[1][0] + B[1][0], A[1][1] + B[1][1], A[1][2] + B[1][2],
    A[2][0] + B[2][0], A[2][1] + B[2][1], A[2][2] + B[2][2]
  )
}

/** Scale a 3x3 matrix by a scalar. */
function mat3Scale(A: Mat3, s: number): Mat3 {
  return mat3(
    A[0][0] * s, A[0][1] * s, A[0][2] * s,
    A[1][0] * s, A[1][1] * s, A[1][2] * s,
    A[2][0] * s, A[2][1] * s, A[2][2] * s
  )
}

/** Outer product of two vectors: v v^T. */
function vec3Outer(v: readonly [number, number, number]): Mat3 {
  return mat3(
    v[0] * v[0], v[0] * v[1], v[0] * v[2],
    v[1] * v[0], v[1] * v[1], v[1] * v[2],
    v[2] * v[0], v[2] * v[1], v[2] * v[2]
  )
}

export interface InertiaComponent {
  mass: number
  position: readonly [number, number, number]
  rotation?: Mat3
  inertia?: Mat3
}

/**
 * Compose the full 3x3 inertia tensor of a rigid body from its components.
 *
 * Document formula:
 *   J = Σ_j [ R_j^b J_j^j (R_j^b)^T + m_j (||r_j^b||^2 I - r_j^b (r_j^b)^T) ]
 */
export function composeInertia(components: InertiaComponent[]): Mat3 {
  let total = mat3(0, 0, 0, 0, 0, 0, 0, 0, 0)
  for (const c of components) {
    const R = c.rotation ?? identityMat3()
    const Jj = c.inertia ?? mat3(0, 0, 0, 0, 0, 0, 0, 0, 0)
    const rotated = mat3Mul(mat3Mul(R, Jj), mat3Transpose(R))
    const r2 = c.position[0] ** 2 + c.position[1] ** 2 + c.position[2] ** 2
    const parallel = mat3Add(mat3Scale(identityMat3(), r2), mat3Scale(vec3Outer(c.position), -1))
    total = mat3Add(total, mat3Add(rotated, mat3Scale(parallel, c.mass)))
  }
  return total
}
