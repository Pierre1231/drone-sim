export interface Setpoint {
  position: [number, number, number]
  velocity: [number, number, number]
  /** Feedforward acceleration in NED (m/s^2). */
  acceleration: [number, number, number]
  /** Desired heading reference direction b_x,ref^n (unit vector). */
  heading: [number, number, number]
  /** Optional desired body angular velocity feedforward (rad/s). */
  angularVelocity?: [number, number, number]
  landing: boolean
}

export interface HoverMissionParams {
  targetAltitude: number
  takeoffDuration: number
  batteryCutoffSoc: number
}

export class HoverMission {
  private targetAltitude: number
  private takeoffDuration: number
  private batteryCutoffSoc: number

  constructor(params: HoverMissionParams) {
    this.targetAltitude = params.targetAltitude
    this.takeoffDuration = params.takeoffDuration
    this.batteryCutoffSoc = params.batteryCutoffSoc
  }

  getSetpoint(time: number, batteryState?: { soc: number }): Setpoint {
    if (batteryState && batteryState.soc <= this.batteryCutoffSoc) {
      return { position: [0, 0, 0], velocity: [0, 0, 0], acceleration: [0, 0, 0], heading: [1, 0, 0], landing: true }
    }

    if (time < this.takeoffDuration) {
      const t = time / this.takeoffDuration
      const smooth = t * t * (3 - 2 * t)
      const altitude = this.targetAltitude * smooth
      const velocityZ = this.targetAltitude * 6 * t * (1 - t) / this.takeoffDuration
      const accelerationZ = this.targetAltitude * 6 * (1 - 2 * t) / (this.takeoffDuration * this.takeoffDuration)

      return {
        position: [0, 0, -altitude],
        velocity: [0, 0, -velocityZ],
        acceleration: [0, 0, -accelerationZ],
        heading: [1, 0, 0],
        landing: false,
      }
    }

    return {
      position: [0, 0, -this.targetAltitude],
      velocity: [0, 0, 0],
      acceleration: [0, 0, 0],
      heading: [1, 0, 0],
      landing: false,
    }
  }
}

export interface CircleMissionParams {
  targetAltitude: number
  takeoffDuration: number
  hoverDuration: number
  radius: number
  speed: number
  batteryCutoffSoc: number
  angularRateFeedforward?: boolean
}

function normalize(v: [number, number, number]): [number, number, number] {
  const n = Math.hypot(v[0], v[1], v[2])
  return n > 1e-9 ? [v[0] / n, v[1] / n, v[2] / n] : [1, 0, 0]
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

type Mat3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
]

function desiredRotationFromAcceleration(ax: number, ay: number, heading: [number, number, number]): Mat3 {
  const desiredForce = [ax, ay, -9.81] as [number, number, number]
  const bT = normalize(desiredForce)
  const bz = [-bT[0], -bT[1], -bT[2]] as [number, number, number]
  const by = normalize(cross(bz, heading))
  const bx = normalize(cross(by, bz))
  return [
    [bx[0], by[0], bz[0]],
    [bx[1], by[1], bz[1]],
    [bx[2], by[2], bz[2]],
  ]
}

function mat3TransposeMul(a: Mat3, b: Mat3): Mat3 {
  return [
    [
      a[0][0] * b[0][0] + a[1][0] * b[1][0] + a[2][0] * b[2][0],
      a[0][0] * b[0][1] + a[1][0] * b[1][1] + a[2][0] * b[2][1],
      a[0][0] * b[0][2] + a[1][0] * b[1][2] + a[2][0] * b[2][2],
    ],
    [
      a[0][1] * b[0][0] + a[1][1] * b[1][0] + a[2][1] * b[2][0],
      a[0][1] * b[0][1] + a[1][1] * b[1][1] + a[2][1] * b[2][1],
      a[0][1] * b[0][2] + a[1][1] * b[1][2] + a[2][1] * b[2][2],
    ],
    [
      a[0][2] * b[0][0] + a[1][2] * b[1][0] + a[2][2] * b[2][0],
      a[0][2] * b[0][1] + a[1][2] * b[1][1] + a[2][2] * b[2][1],
      a[0][2] * b[0][2] + a[1][2] * b[1][2] + a[2][2] * b[2][2],
    ],
  ]
}

export class CircleMission {
  private targetAltitude: number
  private takeoffDuration: number
  private hoverDuration: number
  private radius: number
  private speed: number
  private batteryCutoffSoc: number
  private angularRateFeedforward: boolean

  constructor(params: CircleMissionParams) {
    this.targetAltitude = params.targetAltitude
    this.takeoffDuration = params.takeoffDuration
    this.hoverDuration = params.hoverDuration
    this.radius = params.radius
    this.speed = params.speed
    this.batteryCutoffSoc = params.batteryCutoffSoc
    this.angularRateFeedforward = params.angularRateFeedforward ?? false
  }

  getSetpoint(time: number, batteryState?: { soc: number }): Setpoint {
    if (batteryState && batteryState.soc <= this.batteryCutoffSoc) {
      return { position: [0, 0, 0], velocity: [0, 0, 0], acceleration: [0, 0, 0], heading: [1, 0, 0], landing: true }
    }

    if (time < this.takeoffDuration) {
      const t = time / this.takeoffDuration
      const smooth = t * t * (3 - 2 * t)
      const altitude = this.targetAltitude * smooth
      const velocityZ = this.targetAltitude * 6 * t * (1 - t) / this.takeoffDuration
      const accelerationZ = this.targetAltitude * 6 * (1 - 2 * t) / (this.takeoffDuration * this.takeoffDuration)
      return { position: [0, 0, -altitude], velocity: [0, 0, -velocityZ], acceleration: [0, 0, -accelerationZ], heading: [1, 0, 0], landing: false }
    }

    if (time < this.takeoffDuration + this.hoverDuration) {
      return { position: [0, 0, -this.targetAltitude], velocity: [0, 0, 0], acceleration: [0, 0, 0], heading: [1, 0, 0], landing: false }
    }

    const circleTime = time - this.takeoffDuration - this.hoverDuration
    const omega = this.speed / this.radius
    const theta = omega * circleTime
    const x = this.radius * Math.cos(theta)
    const y = this.radius * Math.sin(theta)
    const vx = -this.radius * omega * Math.sin(theta)
    const vy = this.radius * omega * Math.cos(theta)
    const ax = -omega * omega * x
    const ay = -omega * omega * y
    const heading: [number, number, number] = [1, 0, 0]

    const R = desiredRotationFromAcceleration(ax, ay, heading)
    const eps = 1e-3
    const thetaNext = theta + omega * eps
    const xNext = this.radius * Math.cos(thetaNext)
    const yNext = this.radius * Math.sin(thetaNext)
    const axNext = -omega * omega * xNext
    const ayNext = -omega * omega * yNext
    const RNext = desiredRotationFromAcceleration(axNext, ayNext, heading)
    const omegaSkew = mat3TransposeMul(R, RNext)
    const angularVelocity = [
      (omegaSkew[2][1] - omegaSkew[1][2]) / (2 * eps),
      (omegaSkew[0][2] - omegaSkew[2][0]) / (2 * eps),
      0,
    ] as [number, number, number]

    return {
      position: [x, y, -this.targetAltitude],
      velocity: [vx, vy, 0],
      acceleration: [ax, ay, 0],
      heading,
      angularVelocity: this.angularRateFeedforward ? angularVelocity : undefined,
      landing: false,
    }
  }
}

export interface FullSpeedMissionParams {
  targetAltitude: number
  takeoffDuration: number
  hoverDuration: number
  speed: number
  batteryCutoffSoc: number
}

export class FullSpeedMission {
  private targetAltitude: number
  private takeoffDuration: number
  private hoverDuration: number
  private speed: number
  private batteryCutoffSoc: number

  constructor(params: FullSpeedMissionParams) {
    this.targetAltitude = params.targetAltitude
    this.takeoffDuration = params.takeoffDuration
    this.hoverDuration = params.hoverDuration
    this.speed = params.speed
    this.batteryCutoffSoc = params.batteryCutoffSoc
  }

  getSetpoint(time: number, batteryState?: { soc: number }): Setpoint {
    if (batteryState && batteryState.soc <= this.batteryCutoffSoc) {
      return { position: [0, 0, 0], velocity: [0, 0, 0], acceleration: [0, 0, 0], heading: [1, 0, 0], landing: true }
    }

    if (time < this.takeoffDuration) {
      const t = time / this.takeoffDuration
      const smooth = t * t * (3 - 2 * t)
      const altitude = this.targetAltitude * smooth
      const velocityZ = this.targetAltitude * 6 * t * (1 - t) / this.takeoffDuration
      const accelerationZ = this.targetAltitude * 6 * (1 - 2 * t) / (this.takeoffDuration * this.takeoffDuration)
      return { position: [0, 0, -altitude], velocity: [0, 0, -velocityZ], acceleration: [0, 0, -accelerationZ], heading: [1, 0, 0], landing: false }
    }

    if (time < this.takeoffDuration + this.hoverDuration) {
      return { position: [0, 0, -this.targetAltitude], velocity: [0, 0, 0], acceleration: [0, 0, 0], heading: [1, 0, 0], landing: false }
    }

    const cruiseTime = time - this.takeoffDuration - this.hoverDuration
    return {
      position: [this.speed * cruiseTime, 0, -this.targetAltitude],
      velocity: [this.speed, 0, 0],
      acceleration: [0, 0, 0],
      heading: [1, 0, 0],
      landing: false,
    }
  }
}
