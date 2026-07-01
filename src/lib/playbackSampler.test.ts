import { describe, expect, it } from 'vitest'
import type { SimResult } from './simulation'
import { samplePlayback } from './playbackSampler'

function makeResult(overrides: Partial<SimResult> = {}): SimResult {
  const time = [0, 10]
  return {
    time,
    position: [[0, 0, -1], [10, 20, -11]],
    velocity: [[0, 0, 0], [0, 0, 0]],
    quaternion: [[1, 0, 0, 0], [0, 1, 0, 0]],
    angularVelocity: [[0, 0, 0], [0, 0, 0]],
    motorSpeeds: [[100, 200, 300, 400], [200, 300, 400, 500]],
    motorCurrents: [[0, 0, 0, 0], [0, 0, 0, 0]],
    thrusts: [[0, 0, 0, 0], [0, 0, 0, 0]],
    voltage: [24, 20],
    current: [10, 20],
    power: [240, 400],
    soc: [1, 0.5],
    totalThrust: [0, 0],
    refPosition: [[0, 0, -1], [10, 20, -11]],
    ...overrides,
  }
}

describe('playback sampler', () => {
  it('samples an interpolated render-ready pose and telemetry', () => {
    const sample = samplePlayback(makeResult(), 5)

    expect(sample).not.toBeNull()
    expect(sample?.position).toEqual([5, 10, -6])
    expect(sample?.threePosition).toEqual([5, 6, 10])
    expect(sample?.motorSpeeds).toEqual([150, 250, 350, 450])
    expect(sample?.voltage).toBe(22)
    expect(sample?.soc).toBe(0.75)
    expect(sample?.time).toBe(5)
    expect(sample?.quaternion[0]).toBeCloseTo(Math.SQRT1_2)
    expect(sample?.quaternion[1]).toBeCloseTo(Math.SQRT1_2)
  })

  it('clamps outside times to the first or last frame', () => {
    expect(samplePlayback(makeResult(), -1)?.position).toEqual([0, 0, -1])
    expect(samplePlayback(makeResult(), 99)?.position).toEqual([10, 20, -11])
  })

  it('returns null for empty results and samples single-frame results', () => {
    const empty = makeResult({ time: [], position: [], quaternion: [], motorSpeeds: [], voltage: [], soc: [] })
    const single = makeResult({
      time: [3],
      position: [[1, 2, -3]],
      quaternion: [[1, 0, 0, 0]],
      motorSpeeds: [[1, 2, 3, 4]],
      voltage: [21],
      soc: [0.8],
    })

    expect(samplePlayback(empty, 0)).toBeNull()
    expect(samplePlayback(single, 10)?.threePosition).toEqual([1, 3, 2])
  })
})
