import type { DroneConfig } from '@/store/configStore'
import type { BatteryCell, ESC, Frame, Motor, PartsDatabase, Propeller } from '@/types/parts'
import { getDatabase } from './database'
import type { BatteryParams, ESCParams, MotorParams } from './components'

export interface ResolvedParts {
  frame?: Frame
  motor: Motor
  propeller: Propeller
  batteryCell?: BatteryCell
  esc?: ESC
}

export interface DerivedPartParams {
  frameMass: number
  motorParams: MotorParams
  propParams: {
    diameter: number
    thrustCurve: [number, number][]
    torqueCurve: [number, number][]
    torqueThrustRatio: number
  }
  batteryParams: BatteryParams
  escParams: ESCParams
  inertia: [number, number, number]
  armLength: number
  dragParams: { cdx: number; cdy: number; cdz: number; referenceDensity: number }
  dampingParams: { dwx: number; dwy: number; dwz: number; referenceDensity: number }
  dragCenter?: [number, number, number]
}

export type ResolveSelectedPartsResult =
  | { ok: true; parts: ResolvedParts; derived: DerivedPartParams }
  | { ok: false; errors: string[] }

export interface PartsCatalog {
  resolveSelectedParts(config: DroneConfig): ResolveSelectedPartsResult
}

export function createPartsCatalog(database: PartsDatabase): PartsCatalog {
  return {
    resolveSelectedParts(config: DroneConfig): ResolveSelectedPartsResult {
      const frame = database.frames.find(item => item.id === config.frameId)
      const motor = database.motors.find(item => item.id === config.motorId)
      const propeller = database.propellers.find(item => item.id === config.propellerId)
      const batteryCell = database.batteryCells.find(item => item.id === config.batteryCellId)
      const esc = database.escs.find(item => item.id === config.escId)
      const errors: string[] = []

      if (!motor) errors.push(`Motor not found: ${config.motorId}`)
      if (!propeller) errors.push(`Propeller not found: ${config.propellerId}`)
      if (errors.length > 0) return { ok: false, errors }
      if (!motor || !propeller) return { ok: false, errors: ['Required motor or propeller is missing'] }

      const cells = config.batteryCells
      const nominalVoltage = cells * 3.7
      const wheelbaseM = (frame?.wheelbase ?? 450) / 1000
      const frameDrag = frame?.dragCoeffs ?? { cdx: 0.3, cdy: 0.3, cdz: 0.5 }
      const frameDamping = frame?.dampingCoeffs ?? { dwx: 0, dwy: 0, dwz: 0 }
      const dragCenter = config.dragCenter ?? frame?.dragCenter as [number, number, number] | undefined

      return {
        ok: true,
        parts: { frame, motor, propeller, batteryCell, esc },
        derived: {
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
            diameter: propeller.diameter,
            thrustCurve: propeller.thrustCurve,
            torqueCurve: propeller.torqueCurve,
            torqueThrustRatio: propeller.torqueThrustRatio,
          },
          batteryParams: {
            cells,
            capacityAh: config.batteryCapacity / 1000,
            ocvCoeffs: batteryCell?.ocvCoeffs ?? [3.0, 3.5, -2.0, 1.0],
            internalResistance: (batteryCell?.internalResistance ?? 0.002) * cells + (config.batteryInternalResistance ?? 0) / 1000,
            dynamicResistance: batteryCell?.dynamicResistance ? batteryCell.dynamicResistance * cells : undefined,
            polarizationTau: batteryCell?.polarizationTau,
            maxDischargeCurrent: (batteryCell?.maxDischargeRate ?? 25) * (config.batteryCapacity / 1000),
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
          armLength: wheelbaseM / 2,
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
        },
      }
    },
  }
}

export const partsCatalog = createPartsCatalog(getDatabase())

export function resolveSelectedParts(config: DroneConfig): ResolveSelectedPartsResult {
  return partsCatalog.resolveSelectedParts(config)
}
