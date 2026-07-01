import * as THREE from 'three'
import type { SimResult } from './simulation'

export interface PlaybackSample {
  position: [number, number, number]
  threePosition: [number, number, number]
  quaternion: [number, number, number, number]
  motorSpeeds: number[]
  voltage: number
  soc: number
  time: number
}

function findFrameRange(times: number[], time: number): { from: number; to: number; alpha: number } {
  if (times.length === 0) return { from: 0, to: 0, alpha: 0 }
  if (time <= times[0]) return { from: 0, to: 0, alpha: 0 }

  const last = times.length - 1
  if (time >= times[last]) return { from: last, to: last, alpha: 0 }

  let lo = 0
  let hi = last
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (times[mid] < time) lo = mid + 1
    else hi = mid - 1
  }

  const from = Math.max(0, lo - 1)
  const to = lo
  const span = times[to] - times[from]
  return { from, to, alpha: span > 0 ? (time - times[from]) / span : 0 }
}

function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha
}

function lerpTuple(values: number[][], from: number, to: number, alpha: number): [number, number, number] {
  const a = values[from]
  const b = values[to]
  return [
    lerp(a[0], b[0], alpha),
    lerp(a[1], b[1], alpha),
    lerp(a[2], b[2], alpha),
  ]
}

function lerpArray(values: number[][], from: number, to: number, alpha: number): number[] {
  const a = values[from]
  const b = values[to]
  return a.map((value, i) => lerp(value, b[i], alpha))
}

function slerpQuaternion(values: number[][], from: number, to: number, alpha: number): [number, number, number, number] {
  const a = values[from]
  const b = values[to]
  const qa = new THREE.Quaternion(a[1], a[3], a[2], a[0])
  const qb = new THREE.Quaternion(b[1], b[3], b[2], b[0])
  qa.slerp(qb, alpha)
  return [qa.w, qa.x, qa.z, qa.y]
}

function toThreePosition(position: [number, number, number]): [number, number, number] {
  return [position[0], -position[2], position[1]]
}

export function samplePlayback(result: SimResult, time: number): PlaybackSample | null {
  if (result.time.length === 0) return null

  const { from, to, alpha } = findFrameRange(result.time, time)
  const position = lerpTuple(result.position, from, to, alpha)
  return {
    position,
    threePosition: toThreePosition(position),
    quaternion: slerpQuaternion(result.quaternion, from, to, alpha),
    motorSpeeds: lerpArray(result.motorSpeeds, from, to, alpha),
    voltage: lerp(result.voltage[from], result.voltage[to], alpha),
    soc: lerp(result.soc[from], result.soc[to], alpha),
    time: Math.min(Math.max(time, result.time[0]), result.time[result.time.length - 1]),
  }
}
