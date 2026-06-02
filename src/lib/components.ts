export interface BatteryParams {
  cells: number
  capacityAh: number
  ocvCoeffs: [number, number, number, number] // [a0, a1, a2, a3]
  internalResistance: number // ohms
}

export class BatteryModel {
  private cells: number
  private capacityAh: number
  private ocvCoeffs: [number, number, number, number]
  private internalResistance: number
  private soc: number // 0~1

  constructor(params: BatteryParams) {
    this.cells = params.cells
    this.capacityAh = params.capacityAh
    this.ocvCoeffs = params.ocvCoeffs
    this.internalResistance = params.internalResistance
    this.soc = 1.0 // start fully charged
  }

  /** Update SOC given discharge current (A) and time step (s) */
  update(current: number, dt: number): void {
    // SOC decreases: dSOC = -I * dt / (3600 * Qnom)
    const dSoc = -(current * dt) / (3600 * this.capacityAh)
    this.soc = Math.max(0, Math.min(1, this.soc + dSoc))
  }

  /** Get open-circuit voltage (V) */
  getOCV(): number {
    const [a0, a1, a2, a3] = this.ocvCoeffs
    const uCell = a0 + a1 * this.soc + a2 * this.soc ** 2 + a3 * this.soc ** 3
    return this.cells * uCell
  }

  /** Get terminal voltage under load (V) */
  getVoltage(current: number): number {
    return this.getOCV() - current * this.internalResistance
  }

  getSOC(): number {
    return this.soc
  }
}

export interface MotorParams {
  resistance: number // ohms
  kv: number // RPM/V
  backEmfCoeff: number // V/(rad/s)
  torqueCoeff: number // N·m/A
  rotorInertia: number // kg·m²
  viscousDamping: number // N·m/(rad/s)
}

export class MotorModel {
  private resistance: number
  private backEmfCoeff: number
  private torqueCoeff: number
  private rotorInertia: number
  private viscousDamping: number
  private current: number
  private speed: number // rad/s

  constructor(params: MotorParams) {
    this.resistance = params.resistance
    this.backEmfCoeff = params.backEmfCoeff
    this.torqueCoeff = params.torqueCoeff
    this.rotorInertia = params.rotorInertia
    this.viscousDamping = params.viscousDamping
    this.current = 0
    this.speed = 0
  }

  /** Update motor state given terminal voltage (V), load torque (N·m), and dt (s) */
  update(voltage: number, loadTorque: number, dt: number): void {
    // Electrical: L*dI/dt = V - R*I - Ke*w (neglect L, quasi-steady)
    // Simplified: I = (V - Ke*w) / R
    this.current = (voltage - this.backEmfCoeff * this.speed) / this.resistance

    // Mechanical: J*dw/dt = Kt*I - Q - bm*w
    const torque = this.torqueCoeff * this.current
    const dw = (torque - loadTorque - this.viscousDamping * this.speed) / this.rotorInertia
    this.speed += dw * dt

    // Prevent negative speed (motor can't spin backward in this simplified model)
    if (this.speed < 0) this.speed = 0
  }

  getSpeed(): number {
    return this.speed
  }

  getCurrent(): number {
    return this.current
  }

  reset(): void {
    this.current = 0
    this.speed = 0
  }
}

export interface ESCParams {
  minSpeed: number // rad/s
  maxSpeedAtNominalVoltage: number // rad/s (at nominal bus voltage)
}

export class ESCModel {
  private minSpeed: number
  private maxSpeedAtNominalVoltage: number
  private dutyCycle: number
  private busVoltage: number

  constructor(params: ESCParams) {
    this.minSpeed = params.minSpeed
    this.maxSpeedAtNominalVoltage = params.maxSpeedAtNominalVoltage
    this.dutyCycle = 0
    this.busVoltage = 0
  }

  /** Update ESC given speed command (rad/s) and bus voltage (V) */
  updateCommand(speedCmd: number, busVoltage: number): void {
    this.busVoltage = busVoltage

    // Scale max speed with bus voltage (proportional)
    const maxSpeed = this.maxSpeedAtNominalVoltage * (busVoltage / 14.8) // 14.8V as nominal

    if (speedCmd <= this.minSpeed) {
      this.dutyCycle = 0
      return
    }

    // Linear mapping from speed to duty
    const normalized = (speedCmd - this.minSpeed) / (maxSpeed - this.minSpeed)
    this.dutyCycle = Math.max(0, Math.min(1, normalized))
  }

  getDutyCycle(): number {
    return this.dutyCycle
  }

  /** Output voltage to motor (V) */
  getOutputVoltage(): number {
    return this.dutyCycle * this.busVoltage
  }
}
