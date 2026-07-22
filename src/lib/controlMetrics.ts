export interface StepResponseMetrics {
  finalValue: number
  steadyStateError: number
  riseTime: number | null
  settlingTime: number | null
  overshootPercent: number
  iae: number
  diverged: boolean
}

/** Compute standard step-response metrics from a sampled scalar response. */
export function computeStepResponseMetrics(
  time: readonly number[],
  values: readonly number[],
  target: number,
  stepTime = 0.5,
  settlingTolerance = 0.02,
): StepResponseMetrics | null {
  if (time.length === 0 || time.length !== values.length) return null

  const stepStart = time.findIndex(t => t >= stepTime)
  if (stepStart < 0) return null

  const initialValue = values[0]
  const amplitude = target - initialValue
  const scale = Math.max(Math.abs(amplitude), 1e-9)
  const tailLength = Math.max(1, Math.floor(values.length * 0.05))
  const tail = values.slice(-tailLength)
  const finalValue = tail.reduce((sum, value) => sum + value, 0) / tail.length

  const normalized = values.map(value => (value - initialValue) / amplitude)
  const findCrossing = (threshold: number): number | null => {
    for (let i = stepStart; i < normalized.length; i++) {
      if (Number.isFinite(normalized[i]) && normalized[i] >= threshold) return time[i]
    }
    return null
  }
  const t10 = findCrossing(0.1)
  const t90 = findCrossing(0.9)
  const riseTime = t10 !== null && t90 !== null && t90 >= t10 ? t90 - t10 : null

  let peakProgress = -Infinity
  let iae = 0
  let diverged = false
  for (let i = stepStart; i < values.length; i++) {
    const value = values[i]
    if (!Number.isFinite(value)) {
      diverged = true
      continue
    }
    peakProgress = Math.max(peakProgress, normalized[i])
    if (Math.abs(value - target) > 10 * scale) diverged = true
    if (i > stepStart) {
      const dt = time[i] - time[i - 1]
      iae += 0.5 * (Math.abs(values[i - 1] - target) + Math.abs(value - target)) * Math.max(0, dt)
    }
  }

  const band = settlingTolerance * scale
  let lastOutside = stepStart - 1
  for (let i = stepStart; i < values.length; i++) {
    if (!Number.isFinite(values[i]) || Math.abs(values[i] - target) > band) lastOutside = i
  }
  const settlingIndex = lastOutside + 1
  const settlingTime = settlingIndex < time.length ? time[settlingIndex] - stepTime : null

  return {
    finalValue,
    steadyStateError: target - finalValue,
    riseTime,
    settlingTime,
    overshootPercent: Math.max(0, (peakProgress - 1) * 100),
    iae,
    diverged,
  }
}
