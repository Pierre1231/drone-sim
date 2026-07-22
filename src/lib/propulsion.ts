/**
 * Propulsion models: propeller, control allocator and PID controller.
 *
 * Conventions follow the project math model document:
 * - Propeller thrust/torque use advance ratio J, air density ρ and curves C_T(J), C_Q(J).
 * - Static thrust coefficient k_T(ρ) and torque coefficient k_Q(ρ) are used for
 *   control allocation and inverse speed calculations.
 * - Control allocation solves a constrained weighted least-squares problem and
 *   returns per-rotor target thrusts plus allocation residual.
 */

/** Clamp a value between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
}

function lookup(table: readonly (readonly [number, number])[], x: number): number {
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
  /** [J, CT] lookup table. */
  thrustCurve: readonly (readonly [number, number])[]
  /** [J, CQ] lookup table. */
  torqueCurve: readonly (readonly [number, number])[]
  /** Static torque-to-thrust ratio κ_Q (m), used for control allocation. */
  torqueThrustRatio: number
  /** Reference air density for which the curves/torqueThrustRatio are identified. Default 1.225. */
  referenceDensity?: number
}

/**
 * Propeller aerodynamic model.
 *
 * Document formula:
 *   n = ω / (2π)
 *   J = V_a / (n D)
 *   T = C_T(J) ρ n² D⁴
 *   Q = C_Q(J) ρ n² D⁵
 *   P = 2π n Q
 */
export class PropellerModel {
  private diameter: number
  private thrustCurve: readonly (readonly [number, number])[]
  private torqueCurve: readonly (readonly [number, number])[]
  private torqueThrustRatio: number
  private referenceDensity: number
  private minJ: number
  private maxJ: number

  constructor(params: PropellerParams) {
    this.diameter = params.diameter
    this.thrustCurve = params.thrustCurve
    this.torqueCurve = params.torqueCurve
    this.torqueThrustRatio = params.torqueThrustRatio
    this.referenceDensity = params.referenceDensity ?? 1.225
    this.minJ = this.thrustCurve[0][0]
    this.maxJ = this.thrustCurve[this.thrustCurve.length - 1][0]
  }

  getReferenceDensity(): number {
    return this.referenceDensity
  }

  getTorqueThrustRatio(): number {
    return this.torqueThrustRatio
  }

  /** Static thrust coefficient k_T(ρ) = C_T(0) ρ D⁴ / (2π)². */
  getStaticThrustCoefficient(rho: number): number {
    const CT0 = this.thrustCurve[0][1]
    return (CT0 * rho * Math.pow(this.diameter, 4)) / (4 * Math.PI * Math.PI)
  }

  /** Static torque coefficient k_Q(ρ) = κ_Q · k_T(ρ). */
  getStaticTorqueCoefficient(rho: number): number {
    return this.torqueThrustRatio * this.getStaticThrustCoefficient(rho)
  }

  /**
   * Target angular speed (rad/s) for a desired thrust at a given density and
   * axial advance velocity. Inverts the static thrust model.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTargetOmega(thrust: number, rho: number, _advanceVelocity = 0): number {
    if (thrust <= 0) return 0
    const kT = this.getStaticThrustCoefficient(rho)
    const n = Math.sqrt(thrust / (kT * 4 * Math.PI * Math.PI))
    return n * 2 * Math.PI
  }

  /**
   * Compute thrust, torque and power given axial advance velocity, angular
   * speed and local air density.
   */
  compute(advanceVelocity: number, angularSpeed: number, density: number = this.referenceDensity): PropellerResult {
    const D = this.diameter

    if (angularSpeed <= 0) {
      return { thrust: 0, torque: 0, power: 0 }
    }

    const n = angularSpeed / (2 * Math.PI)
    const J = clamp(advanceVelocity / (n * D), this.minJ, this.maxJ)

    const CT = lookup(this.thrustCurve, J)
    const CQ = lookup(this.torqueCurve, J)

    const thrust = CT * density * n * n * Math.pow(D, 4)
    const torque = CQ * density * n * n * Math.pow(D, 5)
    const power = 2 * Math.PI * n * torque

    return { thrust, torque, power }
  }
}

// ============================================================================
// Small matrix helpers for the 4x4 allocation problem
// ============================================================================

function matTranspose(M: number[][]): number[][] {
  const rows = M.length
  const cols = M[0].length
  const T: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0))
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      T[j][i] = M[i][j]
    }
  }
  return T
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length
  const n = B[0].length
  const p = B.length
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0))
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0
      for (let k = 0; k < p; k++) sum += A[i][k] * B[k][j]
      C[i][j] = sum
    }
  }
  return C
}

function matVecMul(M: number[][], v: number[]): number[] {
  return M.map(row => row.reduce((s, a, i) => s + a * v[i], 0))
}

function diag(v: number[]): number[][] {
  const n = v.length
  const D: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) D[i][i] = v[i]
  return D
}

/** Solve A x = b for a square matrix A using Gaussian elimination with partial pivoting. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length
  const M: number[][] = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let pivot = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row
    }
    if (Math.abs(M[pivot][col]) < 1e-12) continue
    ;[M[col], M[pivot]] = [M[pivot], M[col]]

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col]
      for (let k = col; k <= n; k++) {
        M[row][k] -= factor * M[col][k]
      }
    }
  }

  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n]
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j]
    }
    x[i] = Math.abs(M[i][i]) > 1e-12 ? sum / M[i][i] : 0
  }
  return x
}

export interface ControlAllocatorParams {
  /** Rotor hub positions relative to CG (m). */
  positions: readonly (readonly [number, number, number])[]
  /** Rotor thrust directions in body frame (unit vectors). */
  directions: readonly (readonly [number, number, number])[]
  /** Aerodynamic reaction torque signs χ_i ∈ {+1, -1}. */
  torqueSigns: readonly number[]
  /** Static torque-to-thrust ratio κ_Q (m). */
  torqueThrustRatio: number
  /** Output weighting: thrust and three moment axes. Default [1,1,1,1]. */
  outputWeights?: readonly [number, number, number, number]
  /** Per-rotor usage weight for the change penalty. Default uniform. */
  thrustWeights?: readonly number[]
  /** Change-penalty coefficient λ. Default 0. */
  lambda?: number
}

export interface AllocationOptions {
  /** Lower bounds per rotor or global. Default 0. */
  T_min?: number | readonly number[]
  /** Upper bounds per rotor or global. Default Infinity. */
  T_max?: number | readonly number[]
  /** Previous target thrust vector for the change penalty. */
  previousThrust?: readonly number[]
}

export interface AllocationResult {
  /** Target thrust for each rotor (N). */
  thrusts: number[]
  /** Achieved generalized force y_alloc = B_T T. */
  y_alloc: number[]
  /** Allocation residual e_alloc = y_c - y_alloc. */
  residual: number[]
}

/**
 * Quadrotor control allocator.
 *
 * Document formulation:
 *   y_c = B_T T
 *   B_{T,i} = [ (b_T^b)^T e_{T,i}^b ; r_i^b × e_{T,i}^b + χ_i κ_Q e_{T,i}^b ]
 *
 * For a standard quadrotor the allocation matrix is square (4×4) and the
 * unconstrained solution is obtained from the weighted normal equations.  The
 * result is then clamped to [T_min, T_max] and the resulting allocation
 * residual is returned for anti-windup / saturation handling.
 */
export class ControlAllocator {
  private B: number[][] // 4 x N
  private outputWeights: number[]
  private thrustWeights: number[]
  private lambda: number
  private lastResult: AllocationResult | null = null

  constructor(params: ControlAllocatorParams) {
    const n = params.positions.length
    this.B = Array.from({ length: 4 }, () => new Array(n).fill(0))

    for (let i = 0; i < n; i++) {
      const r = params.positions[i]
      const d = params.directions[i]
      const chi = Math.sign(params.torqueSigns[i])
      const kappa = params.torqueThrustRatio

      // Thrust row
      this.B[0][i] = d[0] * 0 + d[1] * 0 + d[2] * -1 + 0 // b_T^b = [0,0,-1]
      // Actually (b_T^b)^T e_T = (-e_z)·d = -d_z
      this.B[0][i] = -d[2]

      // Moment: r × d
      const rx = r[1] * d[2] - r[2] * d[1]
      const ry = r[2] * d[0] - r[0] * d[2]
      const rz = r[0] * d[1] - r[1] * d[0]

      // Reaction torque term: χ κ d
      this.B[1][i] = rx + chi * kappa * d[0]
      this.B[2][i] = ry + chi * kappa * d[1]
      this.B[3][i] = rz + chi * kappa * d[2]
    }

    this.outputWeights = params.outputWeights ? [...params.outputWeights] : [1, 1, 1, 1]
    this.thrustWeights = params.thrustWeights ? [...params.thrustWeights] : Array(n).fill(1)
    this.lambda = params.lambda ?? 0
  }

  private getBound(value: number | readonly number[] | undefined, index: number, fallback: number): number {
    if (value === undefined) return fallback
    return typeof value === 'number' ? value : value[index] ?? fallback
  }

  /** Compute the constrained QP target using a primal active-set solver. */
  private solveConstrainedQP(
    y: number[],
    T_prev: number[],
    T_min: number[],
    T_max: number[]
  ): number[] {
    const n = this.B[0].length
    const W = diag(this.outputWeights.map(w => w * w))
    const Wt = diag(this.thrustWeights.map(w => w * w))

    const BT = matTranspose(this.B)
    const lhs = matAdd(matMul(matMul(BT, W), this.B), matScale(Wt, this.lambda))
    const rhs = vecAdd(
      matVecMul(matMul(BT, W), y),
      matVecMul(matScale(Wt, this.lambda), T_prev)
    )

    // Initial feasible point: unconstrained optimum clamped to bounds.
    const T = clampVector(solveLinear(lhs, rhs), T_min, T_max)

    const active = new Map<number, 'lower' | 'upper'>()
    const EPS = 1e-9
    for (let i = 0; i < n; i++) {
      if (T_max[i] - T_min[i] < EPS) {
        active.set(i, 'lower')
        T[i] = T_min[i]
      } else if (T[i] <= T_min[i] + EPS) {
        active.set(i, 'lower')
        T[i] = T_min[i]
      } else if (T[i] >= T_max[i] - EPS) {
        active.set(i, 'upper')
        T[i] = T_max[i]
      }
    }

    for (let iter = 0; iter < 200; iter++) {
      const free: number[] = []
      for (let i = 0; i < n; i++) {
        if (!active.has(i)) free.push(i)
      }

      if (free.length > 0) {
        // Reduced system for free variables.
        const lhsF = subMatrix(lhs, free, free)
        const rhsF = free.map((i) => {
          let val = rhs[i]
          active.forEach((_, j) => {
            val -= lhs[i][j] * T[j]
          })
          return val
        })

        const TF = solveLinear(lhsF, rhsF)

        // Check feasibility of the free subproblem solution.
        let infeasibleIdx = -1
        let infeasibleBound: 'lower' | 'upper' | null = null
        for (let f = 0; f < free.length; f++) {
          const i = free[f]
          if (TF[f] < T_min[i] - EPS) {
            infeasibleIdx = i
            infeasibleBound = 'lower'
            break
          }
          if (TF[f] > T_max[i] + EPS) {
            infeasibleIdx = i
            infeasibleBound = 'upper'
            break
          }
        }

        if (infeasibleIdx >= 0) {
          // A free variable wants to cross a bound: clamp it and add to active set.
          const bound = infeasibleBound!
          active.set(infeasibleIdx, bound)
          T[infeasibleIdx] = bound === 'lower' ? T_min[infeasibleIdx] : T_max[infeasibleIdx]
          continue
        }

        // Accept free solution.
        free.forEach((i, f) => {
          T[i] = clamp(TF[f], T_min[i], T_max[i])
        })
      }

      // Gradient of the objective: g = lhs * T - rhs.
      const g = matVecMul(lhs, T).map((v, i) => v - rhs[i])

      // Check KKT conditions for active constraints.
      let worstIdx = -1
      let worstViolation = 0
      active.forEach((bound, i) => {
        if (bound === 'lower' && g[i] < -worstViolation) {
          worstViolation = -g[i]
          worstIdx = i
        } else if (bound === 'upper' && g[i] > worstViolation) {
          worstViolation = g[i]
          worstIdx = i
        }
      })

      if (worstIdx < 0) {
        // All KKT conditions satisfied.
        break
      }

      // Remove the worst constraint and re-solve.
      active.delete(worstIdx)
    }

    return T
  }

  /**
   * Allocate total thrust and moments to per-rotor target thrusts.
   * Returns an object including the achieved generalized force and residual.
   */
  allocateWithResidual(
    totalThrust: number,
    moments: readonly [number, number, number],
    options: AllocationOptions = {}
  ): AllocationResult {
    const n = this.B[0].length
    const y = [totalThrust, moments[0], moments[1], moments[2]]
    const T_prev = options.previousThrust ? [...options.previousThrust] : new Array(n).fill(0)
    const T_min = Array.from({ length: n }, (_, i) => this.getBound(options.T_min, i, 0))
    const T_max = Array.from({ length: n }, (_, i) => this.getBound(options.T_max, i, Infinity))

    const thrusts = this.solveConstrainedQP(y, T_prev, T_min, T_max)
    const y_alloc = matVecMul(this.B, thrusts)
    const residual = y.map((yi, i) => yi - y_alloc[i])

    this.lastResult = { thrusts, y_alloc, residual }
    return this.lastResult
  }

  /**
   * Legacy allocation interface returning only the thrust vector.
   * Use allocateWithResidual to obtain the allocation residual and T_max info.
   */
  allocate(totalThrust: number, moments: readonly [number, number, number], options?: AllocationOptions): number[] {
    return this.allocateWithResidual(totalThrust, moments, options).thrusts
  }

  getLastResidual(): number[] | null {
    return this.lastResult?.residual ?? null
  }

  /** Estimate per-rotor maximum thrust from bus voltage and motor/propeller limits. */
  static estimateMaxThrusts(params: {
    busVoltage: number
    motorBackEmfCoeff: number
    propeller: PropellerModel
    airDensity: number
    numRotors: number
    motorResistance?: number
    escResistance?: number
  }): number[] {
    const {
      busVoltage,
      motorBackEmfCoeff,
      propeller,
      airDensity,
      numRotors,
    } = params
    const kT = propeller.getStaticThrustCoefficient(airDensity)
    // No-load speed at bus voltage minus resistive drops (approximate with a
    // typical hover current placeholder).
    const omegaMax = Math.max(0, busVoltage / Math.max(motorBackEmfCoeff, 1e-6))
    const T_max = kT * omegaMax * omegaMax
    return Array(numRotors).fill(T_max)
  }
}

function matAdd(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((a, j) => a + B[i][j]))
}

function matScale(A: number[][], s: number): number[][] {
  return A.map(row => row.map(a => a * s))
}

function vecAdd(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i])
}

function clampVector(v: number[], min: number[], max: number[]): number[] {
  return v.map((x, i) => Math.max(min[i], Math.min(max[i], x)))
}

function subMatrix(M: number[][], rows: number[], cols: number[]): number[][] {
  return rows.map(i => cols.map(j => M[i][j]))
}

export interface PIDParams {
  kp: number
  ki: number
  kd: number
  outputMin?: number
  outputMax?: number
  /** First-order low-pass time constant for the derivative term (s). */
  derivativeFilterTimeConstant?: number
}

export class PIDController {
  private kp: number
  private ki: number
  private kd: number
  private outputMin: number
  private outputMax: number
  private integral: number
  private prevError: number | null
  private prevMeasurement: number | null
  private filteredDerivative: number
  private derivativeFilterTimeConstant: number

  constructor(params: PIDParams) {
    this.kp = params.kp
    this.ki = params.ki
    this.kd = params.kd
    this.outputMin = params.outputMin ?? -Infinity
    this.outputMax = params.outputMax ?? Infinity
    this.integral = 0
    this.prevError = null
    this.prevMeasurement = null
    this.filteredDerivative = 0
    this.derivativeFilterTimeConstant = Math.max(0, params.derivativeFilterTimeConstant ?? 0)
  }

  update(error: number, dt: number, measurement?: number): number {
    // Proportional
    const P = this.kp * error

    // Integral with anti-windup (conditional integration)
    this.integral += error * dt
    const I = this.ki * this.integral

    // Derivative
    let D = 0
    if (dt > 0) {
      let rawDerivative = 0
      let hasDerivative = false
      if (measurement !== undefined && this.prevMeasurement !== null) {
        // Derivative on measurement avoids a spike when the setpoint steps.
        rawDerivative = -(measurement - this.prevMeasurement) / dt
        hasDerivative = true
      } else if (measurement === undefined && this.prevError !== null) {
        rawDerivative = (error - this.prevError) / dt
        hasDerivative = true
      }
      if (hasDerivative) {
        const alpha = this.derivativeFilterTimeConstant > 0
          ? dt / (this.derivativeFilterTimeConstant + dt)
          : 1
        this.filteredDerivative += alpha * (rawDerivative - this.filteredDerivative)
        D = this.kd * this.filteredDerivative
      }
    }
    this.prevError = error
    if (measurement !== undefined) this.prevMeasurement = measurement

    // Output with saturation
    const output = P + I + D
    const clampedOutput = Math.max(this.outputMin, Math.min(this.outputMax, output))

    // Anti-windup: only integrate if not saturated
    if (output !== clampedOutput && this.ki > 0) {
      // Back-calculate the integral that would give the saturated output
      this.integral = (clampedOutput - P - D) / this.ki
    }

    return clampedOutput
  }

  reset(): void {
    this.integral = 0
    this.prevError = null
    this.prevMeasurement = null
    this.filteredDerivative = 0
  }
}
