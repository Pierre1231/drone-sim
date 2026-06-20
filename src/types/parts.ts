import type { Mat3, Vec3 } from '@/lib/coordinates'

export interface Frame {
  id: string
  name: string
  mass: number // kg
  wheelbase: number // mm
  inertiaMatrix: Mat3
  propPositions: Vec3[] // 4 motors, relative to CG (m)
  propDirections: Vec3[] // thrust direction unit vectors
  torqueSigns: number[] // +1 or -1 for each motor
  aeroRefArea: number // m²
  aeroRefSpan: number // m
  aeroRefChord: number // m
  dragCoeffs: { cdx: number; cdy: number; cdz: number }
  /** Drag force application point relative to CG (m). Default [0,0,0]. */
  dragCenter?: Vec3
  /** Body-frame angular damping coefficients (N·m·s²/rad²). Default zeros. */
  dampingCoeffs?: { dwx: number; dwy: number; dwz: number }
}

export interface Motor {
  id: string
  name: string
  mass: number // kg
  kv: number // RPM/V
  resistance: number // ohms
  backEmfCoeff: number // V/(rad/s)
  torqueCoeff: number // N·m/A
  rotorInertia: number // kg·m²
  viscousDamping: number // N·m/(rad/s)
  noLoadCurrent: number // A
}

export interface Propeller {
  id: string
  name: string
  mass: number // kg
  diameter: number // m
  thrustCurve: [number, number][] // [advanceRatio, CT]
  torqueCurve: [number, number][] // [advanceRatio, CQ]
  torqueThrustRatio: number
}

export interface BatteryCell {
  id: string
  name: string
  type: 'LiPo' | 'LiIon' | 'LiFe'
  ocvCoeffs: [number, number, number, number] // [a0, a1, a2, a3]
  internalResistance: number // ohms per cell
  maxDischargeRate: number // C
  /** Dynamic polarization resistance (Ω per cell), default 0 */
  dynamicResistance?: number
  /** Polarization time constant (s), default 1 */
  polarizationTau?: number
}

export interface ESC {
  id: string
  name: string
  mass: number // kg
  maxCurrent: number // A
  resistance: number // ohms
  /** First-order duty response time constant τ_esc (s). Default 0. */
  responseTimeConstant?: number
  /** Throttle-to-speed nonlinearity γ. Default 1. */
  throttleExponent?: number
  /** Wire harness resistance R_wire (Ω). Default 0. */
  wireResistance?: number
  /** Switching loss coefficient k_sw f_pwm (V/A). Default 0. */
  switchingLossCoeff?: number
  /** PWM / switching frequency f_pwm (Hz). Default 0. */
  pwmFrequency?: number
  /** No-load motor speed factor ω_max(U_b) = factor · U_b (rad/s/V). Default U_b / K_e. */
  maxSpeedFactor?: number
}

export interface PartsDatabase {
  frames: Frame[]
  motors: Motor[]
  propellers: Propeller[]
  batteryCells: BatteryCell[]
  escs: ESC[]
}
