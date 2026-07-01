import { runSimulation, type SimConfig, type SimProgress, type SimResult } from './simulation'

export interface SimulationScenarioInput {
  config: SimConfig
}

export interface SimulationRunHandle {
  cancel: () => void
}

export interface SimulationScenarioCallbacks {
  onStart?: (handle: SimulationRunHandle) => void
  onProgress?: (progress: SimProgress) => void
}

export function runScenario(
  input: SimulationScenarioInput,
  callbacks: SimulationScenarioCallbacks = {}
): SimResult {
  let cancelled = false
  const handle: SimulationRunHandle = {
    cancel: () => {
      cancelled = true
    },
  }

  callbacks.onStart?.(handle)

  return runSimulation(
    input.config,
    progress => callbacks.onProgress?.(progress),
    () => cancelled
  )
}

export function createSimulationRunner() {
  let activeHandle: SimulationRunHandle | null = null

  return {
    run(input: SimulationScenarioInput, callbacks: SimulationScenarioCallbacks = {}): SimResult {
      return runScenario(input, {
        ...callbacks,
        onStart: handle => {
          activeHandle = handle
          callbacks.onStart?.(handle)
        },
      })
    },
    cancel(): void {
      activeHandle?.cancel()
    },
  }
}
