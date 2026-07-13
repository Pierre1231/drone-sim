import type { DroneConfig } from '@/store/configStore'
import { LowSpeedDrag } from './aerodynamics'
import { resolveSelectedParts } from './partsCatalog'
import { ControlAllocator, PropellerModel } from './propulsion'
import type { DerivedPartParams, ResolvedParts } from './partsCatalog'

const G = 9.81
const AIR_DENSITY = 1.225
const SOC_CUTOFF = 0.2
const HIGH_SPEED_VELOCITY = 15 // m/s

export interface SelectionOperatingPoint {
  enduranceMin: number
  currentA: number
  powerW: number
  thrustMargin: number
  throttlePercent: number
  thrustPerMotorN: number
  pitchAngleDeg?: number
}

export interface SelectionWarning {
  type: 'thrust-insufficient' | 'esc-overload' | 'battery-overload' | 'invalid-config'
  message: string
}

export interface SelectionResult {
  hover: SelectionOperatingPoint
  highSpeed: SelectionOperatingPoint
  warnings: SelectionWarning[]
}

interface RotorElectricalResult {
  power: number
  current: number
  omega: number
  torque: number
  motorVoltage: number
}

function solveOmegaForThrust(
  propeller: PropellerModel,
  thrust: number,
  advanceVelocity: number,
  density: number
): number {
  if (thrust <= 0) return 0
  let omega = propeller.getTargetOmega(thrust, density, 0)
  for (let i = 0; i < 30; i++) {
    const result = propeller.compute(advanceVelocity, omega, density)
    const error = result.thrust - thrust
    if (Math.abs(error) < 1e-4) break
    const dTdOmega = 2 * Math.max(result.thrust, 1e-6) / Math.max(omega, 1e-6)
    omega -= error / dTdOmega
    omega = Math.max(omega, 0)
  }
  return omega
}

function computeRotorElectricalPower(
  thrustPerMotor: number,
  advanceVelocity: number,
  density: number,
  propeller: PropellerModel,
  derived: DerivedPartParams,
  parts: ResolvedParts
): RotorElectricalResult {
  const omega = solveOmegaForThrust(propeller, thrustPerMotor, advanceVelocity, density)
  const propResult = propeller.compute(advanceVelocity, omega, density)
  const torque = propResult.torque

  const motorParams = derived.motorParams
  const noLoadCurrent = parts.motor?.noLoadCurrent ?? 0
  const frictionTorque = noLoadCurrent * motorParams.torqueCoeff
  const totalTorque = torque + motorParams.viscousDamping * omega + frictionTorque
  const current = totalTorque / Math.max(motorParams.torqueCoeff, 1e-9)

  const motorVoltage = motorParams.backEmfCoeff * omega + current * motorParams.resistance
  const motorPower = motorVoltage * current

  const escResistance = derived.escParams.resistance ?? 0
  const wireResistance = derived.escParams.wireResistance ?? 0
  const switchingLossCoeff = derived.escParams.switchingLossCoeff ?? 0
  const pwmFrequency = derived.escParams.pwmFrequency ?? 0
  const escLoss = current * current * (escResistance + wireResistance) + switchingLossCoeff * pwmFrequency * current

  return {
    power: motorPower + escLoss,
    current,
    omega,
    torque,
    motorVoltage,
  }
}

function computeOperatingPoint(
  config: DroneConfig,
  derived: DerivedPartParams,
  parts: ResolvedParts,
  velocity: number
): SelectionOperatingPoint {
  const weight = config.totalWeight * G
  const propeller = new PropellerModel(derived.propParams)
  const density = AIR_DENSITY

  let thrustTotal = weight
  let pitchAngleRad = 0
  let advanceVelocityPerRotor = 0

  if (velocity > 0) {
    const dragModel = new LowSpeedDrag(derived.dragParams)
    const dragBody = dragModel.compute([velocity, 0, 0], density)
    const dragX = Math.abs(dragBody[0])
    thrustTotal = Math.sqrt(weight * weight + dragX * dragX)
    pitchAngleRad = Math.atan2(dragX, weight)
    advanceVelocityPerRotor = velocity * Math.sin(pitchAngleRad)
  }

  const thrustPerMotor = thrustTotal / 4
  const rotorResult = computeRotorElectricalPower(
    thrustPerMotor,
    advanceVelocityPerRotor,
    density,
    propeller,
    derived,
    parts
  )

  const totalPower = rotorResult.power * 4
  const nominalVoltage = config.batteryCells * 3.7
  const totalCurrent = totalPower / Math.max(nominalVoltage, 1e-6)

  const capacityAh = config.batteryCapacity / 1000
  const enduranceMin = totalCurrent > 0 ? ((capacityAh * (1 - SOC_CUTOFF)) / totalCurrent) * 60 : 0

  const maxThrusts = ControlAllocator.estimateMaxThrusts({
    busVoltage: nominalVoltage,
    motorBackEmfCoeff: derived.motorParams.backEmfCoeff,
    propeller,
    airDensity: density,
    numRotors: 4,
  })
  const maxThrustPerMotor = maxThrusts[0]
  const thrustMargin = thrustPerMotor > 0 ? (maxThrustPerMotor - thrustPerMotor) / thrustPerMotor : 0

  const throttlePercent = nominalVoltage > 0 ? (rotorResult.motorVoltage / nominalVoltage) * 100 : 0

  return {
    enduranceMin,
    currentA: totalCurrent,
    powerW: totalPower,
    thrustMargin,
    throttlePercent,
    thrustPerMotorN: thrustPerMotor,
    pitchAngleDeg: velocity > 0 ? pitchAngleRad * (180 / Math.PI) : undefined,
  }
}

function zeroOperatingPoint(): SelectionOperatingPoint {
  return {
    enduranceMin: 0,
    currentA: 0,
    powerW: 0,
    thrustMargin: 0,
    throttlePercent: 0,
    thrustPerMotorN: 0,
  }
}

export function estimateEndurance(config: DroneConfig): SelectionResult {
  const resolved = resolveSelectedParts(config)
  if (!resolved.ok) {
    return {
      hover: zeroOperatingPoint(),
      highSpeed: zeroOperatingPoint(),
      warnings: resolved.errors.map(e => ({ type: 'invalid-config', message: e })),
    }
  }

  const { derived, parts } = resolved
  const hover = computeOperatingPoint(config, derived, parts, 0)
  const highSpeed = computeOperatingPoint(config, derived, parts, HIGH_SPEED_VELOCITY)

  const warnings: SelectionWarning[] = []

  if (hover.thrustMargin < 0) {
    warnings.push({
      type: 'thrust-insufficient',
      message: '悬停所需推力超过电机最大推力，请减轻重量或更换动力部件。',
    })
  }
  if (highSpeed.thrustMargin < 0) {
    warnings.push({
      type: 'thrust-insufficient',
      message: '高速前飞所需推力超过电机最大推力，请减轻重量或更换动力部件。',
    })
  }

  const escMaxCurrent = parts.esc?.maxCurrent ?? Infinity
  if ((hover.currentA / 4) > escMaxCurrent || (highSpeed.currentA / 4) > escMaxCurrent) {
    warnings.push({
      type: 'esc-overload',
      message: `电机电流超过电调额定电流 ${escMaxCurrent}A，请更换更大电流电调。`,
    })
  }

  const batteryMaxCurrent = derived.batteryParams.maxDischargeCurrent ?? Infinity
  if (hover.currentA > batteryMaxCurrent || highSpeed.currentA > batteryMaxCurrent) {
    warnings.push({
      type: 'battery-overload',
      message: `总电流超过电池最大放电电流 ${batteryMaxCurrent.toFixed(1)}A，请降低重量或更换电池。`,
    })
  }

  return { hover, highSpeed, warnings }
}
