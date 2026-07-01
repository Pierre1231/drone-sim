import type { SimConfig } from '@/lib/simulation'
import { createSimulationRunner } from '@/lib/simulationEngine'

const runner = createSimulationRunner()

self.onmessage = (e: MessageEvent) => {
  const { type, config } = e.data

  if (type === 'start') {
    const simConfig = config as SimConfig

    try {
      const result = runner.run(
        { config: simConfig },
        {
          onProgress: progress => {
            self.postMessage({ type: 'progress', progress })
          },
        }
      )

      self.postMessage({ type: 'complete', result })
    } catch (error) {
      self.postMessage({ type: 'error', error: String(error) })
    }
  }

  if (type === 'cancel') {
    runner.cancel()
  }
}
