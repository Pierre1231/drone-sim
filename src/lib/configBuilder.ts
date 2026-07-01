import type { DroneConfig } from '@/store/configStore'
import type { SimConfig } from './simulation'
import { resolveSelectedParts } from './partsCatalog'

/**
 * Build a SimConfig from the UI-facing DroneConfig and the parts database.
 *
 * This is the single source of truth for translating user-facing state into the
 * simulation input shape. It respects the chosen frame layout ('+' / 'X') and
 * fills doc-aligned defaults for drag, damping and auxiliary power.
 */
export function buildSimConfig(config: DroneConfig): SimConfig | null {
  const resolved = resolveSelectedParts(config)
  if (!resolved.ok) return null

  const derived = resolved.derived
  const layout = config.config ?? 'X'

  return {
    missionType: config.missionType,
    droneConfig: config,
    frameMass: derived.frameMass,
    motorParams: derived.motorParams,
    propParams: derived.propParams,
    batteryParams: derived.batteryParams,
    escParams: derived.escParams,
    inertia: derived.inertia,
    armLength: derived.armLength,
    config: layout,
    wind: config.wind,
    dragParams: derived.dragParams,
    dampingParams: derived.dampingParams,
    dragCenter: derived.dragCenter,
    P_aux: 10,
    // Hover missions need enough time to reach the 20% SOC cutoff (~1491 s for the doc default).
    maxSimTime: config.missionType === 'hover' || config.missionType === 'test-hover' ? 2000 : 1200,
  }
}
