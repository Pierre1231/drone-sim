import type { DroneConfig } from '@/store/configStore'
import type { SimConfig } from './simulation'
import { getFrameById, getMotorById, getPropellerById, getBatteryCellById, getESCById } from './database'

/**
 * Build a SimConfig from the UI-facing DroneConfig and the parts database.
 *
 * This is the single source of truth for translating user-facing state into the
 * simulation input shape. It respects the chosen frame layout ('+' / 'X') and
 * fills doc-aligned defaults for drag, damping and auxiliary power.
 */
export function buildSimConfig(config: DroneConfig): SimConfig | null {
  const frame = getFrameById(config.frameId)
  const motor = getMotorById(config.motorId)
  const prop = getPropellerById(config.propellerId)
  const cell = getBatteryCellById(config.batteryCellId)
  const esc = getESCById(config.escId)

  if (!motor || !prop) return null

  const cells = config.batteryCells
  const nominalVoltage = cells * 3.7
  const layout = config.config ?? 'X'
  const wheelbaseM = (frame?.wheelbase ?? 450) / 1000
  // armLength is the physical distance from the center of mass to each motor.
  // For a symmetric X frame, the motor coordinates are armLength / sqrt(2).
  const armLength = wheelbaseM / 2

  const frameDrag = frame?.dragCoeffs ?? { cdx: 0.3, cdy: 0.3, cdz: 0.5 }
  const frameDamping = frame?.dampingCoeffs ?? { dwx: 0, dwy: 0, dwz: 0 }
  const dragCenter: [number, number, number] | undefined = config.dragCenter ?? frame?.dragCenter as [number, number, number] | undefined

  return {
    missionType: config.missionType,
    droneConfig: config,
    frameMass: frame?.mass ?? 0.28,
    motorParams: {
      resistance: motor.resistance,
      kv: motor.kv,
      backEmfCoeff: motor.backEmfCoeff,
      torqueCoeff: motor.torqueCoeff,
      rotorInertia: motor.rotorInertia,
      viscousDamping: motor.viscousDamping,
    },
    propParams: {
      diameter: prop.diameter,
      thrustCurve: prop.thrustCurve,
      torqueCurve: prop.torqueCurve,
      torqueThrustRatio: prop.torqueThrustRatio,
    },
    batteryParams: {
      cells,
      capacityAh: config.batteryCapacity / 1000,
      ocvCoeffs: cell?.ocvCoeffs ?? [3.0, 3.5, -2.0, 1.0],
      internalResistance: (cell?.internalResistance ?? 0.002) * cells + (config.batteryInternalResistance ?? 0) / 1000,
      dynamicResistance: cell?.dynamicResistance ? cell.dynamicResistance * cells : undefined,
      polarizationTau: cell?.polarizationTau,
      maxDischargeCurrent: (cell?.maxDischargeRate ?? 25) * (config.batteryCapacity / 1000),
      thermalCapacitance: 1500,
      thermalResistance: 1,
      ambientTemperature: 298.15,
      socMin: 0.2,
      socMax: 1.0,
      kTbat: 0,
      tRef: 298.15,
    },
    escParams: {
      minSpeed: 0,
      maxSpeedAtNominalVoltage:
        esc?.maxSpeedFactor
          ? esc.maxSpeedFactor * nominalVoltage
          : nominalVoltage / motor.backEmfCoeff,
      nominalVoltage,
      responseTimeConstant: esc?.responseTimeConstant ?? 0,
      throttleExponent: esc?.throttleExponent ?? 1,
      resistance: esc?.resistance ?? 0.003,
      wireResistance: esc?.wireResistance ?? 0,
      switchingLossCoeff: esc?.switchingLossCoeff ?? 0,
      pwmFrequency: esc?.pwmFrequency ?? 0,
    },
    inertia: frame?.inertiaMatrix
      ? [frame.inertiaMatrix[0][0], frame.inertiaMatrix[1][1], frame.inertiaMatrix[2][2]]
      : [0.008, 0.008, 0.015],
    armLength,
    config: layout,
    wind: config.wind,
    dragParams: {
      cdx: frameDrag.cdx,
      cdy: frameDrag.cdy,
      cdz: frameDrag.cdz,
      referenceDensity: 1.225,
    },
    dampingParams: {
      dwx: frameDamping.dwx,
      dwy: frameDamping.dwy,
      dwz: frameDamping.dwz,
      referenceDensity: 1.225,
    },
    dragCenter,
    P_aux: 10,
    // Hover missions need enough time to reach the 20% SOC cutoff (~1491 s for the doc default).
    maxSimTime: config.missionType === 'hover' || config.missionType === 'test-hover' ? 2000 : 1200,
  }
}
