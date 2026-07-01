import { describe, expect, it } from 'vitest'
import { buildDocAlignedSimConfig } from './presets'
import { runScenario } from './simulationEngine'

describe('simulation engine', () => {
  it('runs a scenario and reports progress through the engine interface', () => {
    const progress: number[] = []
    const result = runScenario(
      { config: { ...buildDocAlignedSimConfig('test-hover'), maxSimTime: 2 } },
      { onProgress: event => progress.push(event.progress) }
    )

    expect(result.time.length).toBeGreaterThan(0)
    expect(progress.at(-1)).toBe(1)
  })

  it('can cancel a running scenario through the engine handle', () => {
    let cancel: (() => void) | undefined
    const result = runScenario(
      { config: { ...buildDocAlignedSimConfig('test-hover'), maxSimTime: 20 } },
      {
        onStart: handle => { cancel = handle.cancel },
        onProgress: event => {
          if (event.currentTime >= 1) cancel?.()
        },
      }
    )

    expect(result.time.at(-1)).toBeLessThan(20)
  })

  it('selects scenario mission types without changing the result shape', () => {
    for (const missionType of ['test-hover', 'fullspeed', 'test-circle', 'test-circle-7'] as const) {
      const result = runScenario({ config: { ...buildDocAlignedSimConfig(missionType), maxSimTime: 1 } })
      expect(result.time.length, missionType).toBeGreaterThan(0)
      expect(result.position.length).toBe(result.time.length)
    }
  })
})
