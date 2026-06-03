import { runSimulation, type SimConfig, type SimProgress } from '@/lib/simulation'

let cancelled = false

self.onmessage = (e: MessageEvent) => {
  const { type, config } = e.data

  if (type === 'start') {
    cancelled = false
    const simConfig = config as SimConfig

    try {
      const result = runSimulation(
        simConfig,
        (progress: SimProgress) => {
          self.postMessage({ type: 'progress', progress })
        },
        () => cancelled
      )

      self.postMessage({ type: 'complete', result })
    } catch (error) {
      self.postMessage({ type: 'error', error: String(error) })
    }
  }

  if (type === 'cancel') {
    cancelled = true
  }
}
