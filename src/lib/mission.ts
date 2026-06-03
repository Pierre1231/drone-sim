export interface Setpoint {
  position: [number, number, number]
  velocity: [number, number, number]
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
    // Check battery cutoff
    if (batteryState && batteryState.soc <= this.batteryCutoffSoc) {
      return {
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        landing: true,
      }
    }

    if (time < this.takeoffDuration) {
      // Takeoff phase: smooth ascent
      const t = time / this.takeoffDuration
      // Use smoothstep for smooth transition
      const smooth = t * t * (3 - 2 * t)
      const altitude = this.targetAltitude * smooth
      const velocityZ = this.targetAltitude * 6 * t * (1 - t) / this.takeoffDuration

      return {
        position: [0, 0, -altitude], // NED: z positive = down, so altitude -> -z
        velocity: [0, 0, -velocityZ],
        landing: false,
      }
    }

    // Hover phase
    return {
      position: [0, 0, -this.targetAltitude], // NED: z positive = down
      velocity: [0, 0, 0],
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
}

export class CircleMission {
  private targetAltitude: number
  private takeoffDuration: number
  private hoverDuration: number
  private radius: number
  private speed: number
  private batteryCutoffSoc: number
  private period: number

  constructor(params: CircleMissionParams) {
    this.targetAltitude = params.targetAltitude
    this.takeoffDuration = params.takeoffDuration
    this.hoverDuration = params.hoverDuration
    this.radius = params.radius
    this.speed = params.speed
    this.batteryCutoffSoc = params.batteryCutoffSoc
    // Circle circumference = 2πr, period = circumference / speed
    this.period = (2 * Math.PI * this.radius) / this.speed
  }

  getSetpoint(time: number, batteryState?: { soc: number }): Setpoint {
    // Check battery cutoff
    if (batteryState && batteryState.soc <= this.batteryCutoffSoc) {
      return {
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        landing: true,
      }
    }

    if (time < this.takeoffDuration) {
      // Takeoff phase
      const t = time / this.takeoffDuration
      const smooth = t * t * (3 - 2 * t)
      const altitude = this.targetAltitude * smooth
      const velocityZ = this.targetAltitude * 6 * t * (1 - t) / this.takeoffDuration

      return {
        position: [0, 0, -altitude], // NED: z positive = down
        velocity: [0, 0, -velocityZ],
        landing: false,
      }
    }

    if (time < this.takeoffDuration + this.hoverDuration) {
      // Hover phase
      return {
        position: [0, 0, -this.targetAltitude], // NED: z positive = down
        velocity: [0, 0, 0],
        landing: false,
      }
    }

    // Circle phase
    const circleTime = time - this.takeoffDuration - this.hoverDuration
    const omega = (2 * Math.PI) / this.period
    const theta = omega * circleTime

    // Circle: x = a*cos(θ), y = a*sin(θ)
    const x = this.radius * Math.cos(theta)
    const y = this.radius * Math.sin(theta)

    // Velocity: derivative of position
    // x = a·cos(θ) → vx = -a·ω·sin(θ)
    // y = a·sin(θ) → vy =  a·ω·cos(θ)
    const vx = -this.radius * omega * Math.sin(theta)
    const vy = this.radius * omega * Math.cos(theta)

    return {
      position: [x, y, -this.targetAltitude], // NED: z positive = down
      velocity: [vx, vy, 0],
      landing: false,
    }
  }
}

export interface Figure8MissionParams {
  targetAltitude: number
  takeoffDuration: number
  hoverDuration: number
  radius: number
  speed: number
  batteryCutoffSoc: number
}

export class Figure8Mission {
  private targetAltitude: number
  private takeoffDuration: number
  private hoverDuration: number
  private radius: number
  private speed: number
  private batteryCutoffSoc: number
  private period: number

  constructor(params: Figure8MissionParams) {
    this.targetAltitude = params.targetAltitude
    this.takeoffDuration = params.takeoffDuration
    this.hoverDuration = params.hoverDuration
    this.radius = params.radius
    this.speed = params.speed
    this.batteryCutoffSoc = params.batteryCutoffSoc
    // For x = a·cos(θ), y = a·sin(2θ), max speed ≈ a·ω·√5
    this.period = (2 * Math.PI * this.radius * Math.sqrt(5)) / this.speed
  }

  getSetpoint(time: number, batteryState?: { soc: number }): Setpoint {
    if (batteryState && batteryState.soc <= this.batteryCutoffSoc) {
      return { position: [0, 0, 0], velocity: [0, 0, 0], landing: true }
    }

    if (time < this.takeoffDuration) {
      const t = time / this.takeoffDuration
      const smooth = t * t * (3 - 2 * t)
      const altitude = this.targetAltitude * smooth
      const velocityZ = this.targetAltitude * 6 * t * (1 - t) / this.takeoffDuration
      return { position: [0, 0, -altitude], velocity: [0, 0, -velocityZ], landing: false }
    }

    if (time < this.takeoffDuration + this.hoverDuration) {
      return { position: [0, 0, -this.targetAltitude], velocity: [0, 0, 0], landing: false }
    }

    const figure8Time = time - this.takeoffDuration - this.hoverDuration
    const omega = (2 * Math.PI) / this.period
    const theta = omega * figure8Time

    // Figure-8: x = a·cos(θ), y = a·sin(2θ)
    const x = this.radius * Math.cos(theta)
    const y = this.radius * Math.sin(2 * theta)

    // Velocity: x = a·cos(θ) → vx = -a·ω·sin(θ)
    //          y = a·sin(2θ) → vy = 2a·ω·cos(2θ)
    const vx = -this.radius * omega * Math.sin(theta)
    const vy = 2 * this.radius * omega * Math.cos(2 * theta)

    return { position: [x, y, -this.targetAltitude], velocity: [vx, vy, 0], landing: false }
  }
}
