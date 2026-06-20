import { describe, it, expect } from 'vitest'
import { quat, quatToRotationMatrix, vec3, rotateBodyToNed, rotateNedToBody, quatMultiply, quatNormalize, skewSymmetric, cross, composeInertia, mat3 } from './coordinates'

describe('coordinates', () => {
  it('maps identity quaternion to identity rotation matrix', () => {
    const q = quat(1, 0, 0, 0)
    const R = quatToRotationMatrix(q)
    expectCloseMat3(R, [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ])
  })

  it('maps a 90-degree yaw quaternion to the documented Z-rotation matrix', () => {
    const s = Math.sqrt(2) / 2
    const q = quat(s, 0, 0, s) // 90° yaw
    const R = quatToRotationMatrix(q)
    expectCloseMat3(R, [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ])
  })

  it('maps a 90-degree pitch quaternion to the documented Y-rotation matrix', () => {
    const s = Math.sqrt(2) / 2
    const q = quat(s, 0, s, 0) // 90° pitch
    const R = quatToRotationMatrix(q)
    expectCloseMat3(R, [
      [0, 0, 1],
      [0, 1, 0],
      [-1, 0, 0],
    ])
  })

  it('maps a 90-degree roll quaternion to the documented X-rotation matrix', () => {
    const s = Math.sqrt(2) / 2
    const q = quat(s, s, 0, 0) // 90° roll
    const R = quatToRotationMatrix(q)
    expectCloseMat3(R, [
      [1, 0, 0],
      [0, 0, -1],
      [0, 1, 0],
    ])
  })

  it('composes rotations via Hamilton quaternion multiplication', () => {
    const s = Math.sqrt(2) / 2
    const q90 = quat(s, 0, 0, s)
    const q180 = quatMultiply(q90, q90)
    expectCloseQuat(q180, [0, 0, 0, 1])
  })

  it('normalizes quaternions to unit length', () => {
    const q = quat(2, 0, 0, 0)
    const n = quatNormalize(q)
    expectCloseQuat(n, [1, 0, 0, 0])
  })

  it('constructs the documented skew-symmetric matrix', () => {
    const v = vec3(1, 2, 3)
    const S = skewSymmetric(v)
    expectCloseMat3(S, [
      [0, -3, 2],
      [3, 0, -1],
      [-2, 1, 0],
    ])
  })

  it('satisfies [a]_x b = a x b', () => {
    const a = vec3(1, 2, 3)
    const b = vec3(4, 5, 6)
    const axb = cross(a, b)
    const S = skewSymmetric(a)
    const Sb = vec3(
      S[0][0] * b[0] + S[0][1] * b[1] + S[0][2] * b[2],
      S[1][0] * b[0] + S[1][1] * b[1] + S[1][2] * b[2],
      S[2][0] * b[0] + S[2][1] * b[1] + S[2][2] * b[2]
    )
    expectCloseVec3(axb, [Sb[0], Sb[1], Sb[2]])
  })

  it('rotates component inertia into body frame', () => {
    const s = Math.sqrt(2) / 2
    // 90° yaw rotation swaps x and y principal moments
    const R = quatToRotationMatrix(quat(s, 0, 0, s))
    const J = composeInertia([
      {
        mass: 0,
        position: vec3(0, 0, 0),
        rotation: R,
        inertia: mat3(1, 0, 0, 0, 4, 0, 0, 0, 9),
      }
    ])
    expectCloseMat3(J, [
      [4, 0, 0],
      [0, 1, 0],
      [0, 0, 9],
    ])
  })

  it('composes inertia from a point mass via parallel axis theorem', () => {
    const r = 0.5
    const m = 2.0
    const J = composeInertia([
      { mass: m, position: vec3(r, 0, 0) }
    ])
    expectCloseMat3(J, [
      [0, 0, 0],
      [0, m * r * r, 0],
      [0, 0, m * r * r],
    ])
  })

  it('rotates body-frame vectors to NED and back', () => {
    const s = Math.sqrt(2) / 2
    const q = quat(s, 0, 0, s) // 90° yaw: body x aligns with NED y
    const vBody = vec3(1, 0, 0)
    const vNed = rotateBodyToNed(vBody, q)
    expectCloseVec3(vNed, [0, 1, 0])
    const vBodyBack = rotateNedToBody(vNed, q)
    expectCloseVec3(vBodyBack, [1, 0, 0])
  })
})

function expectCloseMat3(actual: ReturnType<typeof quatToRotationMatrix>, expected: number[][], eps = 1e-12) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      expect(actual[i][j]).toBeCloseTo(expected[i][j], Math.abs(Math.log10(eps)))
    }
  }
}

function expectCloseVec3(actual: ReturnType<typeof vec3>, expected: number[], eps = 1e-12) {
  for (let i = 0; i < 3; i++) {
    expect(actual[i]).toBeCloseTo(expected[i], Math.abs(Math.log10(eps)))
  }
}

function expectCloseQuat(actual: ReturnType<typeof quat>, expected: number[], eps = 1e-12) {
  for (let i = 0; i < 4; i++) {
    expect(actual[i]).toBeCloseTo(expected[i], Math.abs(Math.log10(eps)))
  }
}
