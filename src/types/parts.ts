export interface Frame {
  id: string
  name: string
  mass: number // kg
  wheelbase: number // mm
  inertiaMatrix: [[number, number, number], [number, number, number], [number, number, number]]
  propPositions: [number, number, number][] // 4 motors, relative to CG (m)
  propDirections: [number, number, number][] // thrust direction unit vectors
  torqueSigns: number[] // +1 or -1 for each motor
  aeroRefArea: number // m²
  aeroRefSpan: number // m
  aeroRefChord: number // m
  dragCoeffs: { cdx: number; cdy: number; cdz: number }
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
}

export interface ESC {
  id: string
  name: string
  mass: number // kg
  maxCurrent: number // A
  resistance: number // ohms
}

export interface PartsDatabase {
  frames: Frame[]
  motors: Motor[]
  propellers: Propeller[]
  batteryCells: BatteryCell[]
  escs: ESC[]
}
