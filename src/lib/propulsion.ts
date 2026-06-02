const AIR_DENSITY = 1.225 // kg/m³

function lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
}

function lookup(table: [number, number][], x: number): number {
  if (x <= table[0][0]) return table[0][1]
  if (x >= table[table.length - 1][0]) return table[table.length - 1][1]

  for (let i = 0; i < table.length - 1; i++) {
    if (x >= table[i][0] && x <= table[i + 1][0]) {
      return lerp(x, table[i][0], table[i + 1][0], table[i][1], table[i + 1][1])
    }
  }
  return table[table.length - 1][1]
}

export interface PropellerResult {
  thrust: number // N
  torque: number // N·m
  power: number  // W
}

export interface PropellerParams {
  diameter: number // m
  thrustCurve: [number, number][] // [J, CT]
  torqueCurve: [number, number][] // [J, CQ]
  torqueThrustRatio: number
}

export class PropellerModel {
  private diameter: number
  private thrustCurve: [number, number][]
  private torqueCurve: [number, number][]
  private torqueThrustRatio: number

  constructor(params: PropellerParams) {
    this.diameter = params.diameter
    this.thrustCurve = params.thrustCurve
    this.torqueCurve = params.torqueCurve
    this.torqueThrustRatio = params.torqueThrustRatio
  }

  /** Compute thrust, torque, and power given advance velocity (m/s) and angular speed (rad/s) */
  compute(advanceVelocity: number, angularSpeed: number): PropellerResult {
    const n = angularSpeed / (2 * Math.PI) // rev/s
    const D = this.diameter

    if (n <= 0) {
      return { thrust: 0, torque: 0, power: 0 }
    }

    const J = advanceVelocity / (n * D)

    const CT = lookup(this.thrustCurve, J)
    const CQ = lookup(this.torqueCurve, J)

    const thrust = CT * AIR_DENSITY * n * n * Math.pow(D, 4)
    const torque = CQ * AIR_DENSITY * n * n * Math.pow(D, 5)
    const power = 2 * Math.PI * n * torque

    return { thrust, torque, power }
  }
}

export interface ControlAllocatorParams {
  armLength: number // m (distance from CG to motor, for X config = wheelbase / sqrt(2))
}

export class ControlAllocator {
  private armLength: number
  private allocationMatrix: number[][]
  private inverseMatrix: number[][]

  constructor(params: ControlAllocatorParams) {
    this.armLength = params.armLength
    const L = params.armLength
    const kappa = 0.025 // torque-thrust ratio (default)

    // X-configuration allocation matrix
    // [T]   [ 1   1   1   1 ] [T1]
    // [Mx]  [ L  -L  -L   L ] [T2]
    // [My]  [ L   L  -L  -L ] [T3]
    // [Mz]  [ κ  -κ   κ  -κ ] [T4]
    this.allocationMatrix = [
      [1, 1, 1, 1],
      [L, -L, -L, L],
      [L, L, -L, -L],
      [kappa, -kappa, kappa, -kappa],
    ]

    // Compute inverse using simple method for this specific matrix
    this.inverseMatrix = this.computeInverse()
  }

  private computeInverse(): number[][] {
    const L = this.armLength
    const kappa = 0.025

    // Analytical inverse for X-config 4x4 matrix
    // From equations: 4*T1 = a+b+c+d, etc.
    const inv4L = 1 / (4 * L)
    const inv4k = 1 / (4 * kappa)
    const inv4 = 1 / 4

    return [
      [inv4,  inv4L,  inv4L,  inv4k],
      [inv4, -inv4L,  inv4L, -inv4k],
      [inv4, -inv4L, -inv4L,  inv4k],
      [inv4,  inv4L, -inv4L, -inv4k],
    ]
  }

  /** Allocate total thrust and moments to 4 motor thrusts */
  allocate(totalThrust: number, moments: [number, number, number]): number[] {
    const y = [totalThrust, moments[0], moments[1], moments[2]]
    const T: number[] = [0, 0, 0, 0]

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        T[i] += this.inverseMatrix[i][j] * y[j]
      }
    }

    // Clamp to non-negative
    return T.map(t => Math.max(0, t))
  }
}

export interface PIDParams {
  kp: number
  ki: number
  kd: number
  outputMin?: number
  outputMax?: number
}

export class PIDController {
  private kp: number
  private ki: number
  private kd: number
  private outputMin: number
  private outputMax: number
  private integral: number
  private prevError: number | null

  constructor(params: PIDParams) {
    this.kp = params.kp
    this.ki = params.ki
    this.kd = params.kd
    this.outputMin = params.outputMin ?? -Infinity
    this.outputMax = params.outputMax ?? Infinity
    this.integral = 0
    this.prevError = null
  }

  update(error: number, dt: number): number {
    // Proportional
    const P = this.kp * error

    // Integral
    this.integral += error * dt
    const I = this.ki * this.integral

    // Derivative
    let D = 0
    if (this.prevError !== null && dt > 0) {
      D = this.kd * (error - this.prevError) / dt
    }
    this.prevError = error

    // Output with saturation
    let output = P + I + D
    output = Math.max(this.outputMin, Math.min(this.outputMax, output))

    return output
  }

  reset(): void {
    this.integral = 0
    this.prevError = null
  }
}
