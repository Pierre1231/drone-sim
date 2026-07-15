import type { Setpoint } from './mission'

export interface PythonControlState {
  position: [number, number, number]
  velocity: [number, number, number]
  quaternion: [number, number, number, number]
  angularVelocity: [number, number, number]
}

export interface PythonUpdateResult {
  position?: [number, number, number]
  velocity?: [number, number, number]
  acceleration?: [number, number, number]
  heading?: [number, number, number]
  thrust?: number
  moments?: [number, number, number]
}

export interface PythonControlContext {
  /** Read the current drone state. Updated by the simulation loop via onStep. */
  getCurrentState: () => PythonControlState | null
  /** Read the current simulation time. */
  getCurrentTime: () => number
  /** Call the user-defined Python controller to get a full setpoint + command. */
  pyodideUpdate: (time: number, state: PythonControlState) => PythonUpdateResult
}

export interface PythonControlMissionParams {
  context: PythonControlContext
  missionType: 'hover' | 'circle'
  /** Control update interval in seconds. Lower = smoother but slower. Default 0.02 (50 Hz). */
  controlInterval?: number
}

/**
 * Kinematically extrapolate a setpoint from a reference sample at t0 to time t.
 * This is far more accurate than holding the sample constant for trajectories that
 * provide velocity and acceleration feedforward.
 */
function extrapolateSetpoint(sample: Setpoint, dt: number): Setpoint {
  if (dt <= 0) return sample
  const p = sample.position
  const v = sample.velocity
  const a = sample.acceleration
  return {
    position: [
      p[0] + v[0] * dt + 0.5 * a[0] * dt * dt,
      p[1] + v[1] * dt + 0.5 * a[1] * dt * dt,
      p[2] + v[2] * dt + 0.5 * a[2] * dt * dt,
    ] as [number, number, number],
    velocity: [v[0] + a[0] * dt, v[1] + a[1] * dt, v[2] + a[2] * dt] as [number, number, number],
    acceleration: [...a] as [number, number, number],
    heading: [...sample.heading] as [number, number, number],
    landing: false,
  }
}

/**
 * Mission that delegates both trajectory generation and velocity control to a
 * user-defined Python controller.
 *
 * The Python controller implements `Controller.update(self, t, state)` and returns
 * a dict with optional keys: position, velocity, acceleration, heading. The
 * underlying cascaded controller tracks the returned setpoint.
 *
 * Between Python updates the setpoint is kinematically extrapolated using the
 * returned velocity and acceleration. This keeps the reference smooth even when
 * the Python controller is run at a lower rate than the 1 ms simulation step.
 */
export class PythonControlMission {
  private context: PythonControlContext
  private missionType: 'hover' | 'circle'
  private controlInterval: number
  private nextUpdateTime: number
  private lastUpdateTime: number
  private lastSetpoint: Setpoint

  constructor(params: PythonControlMissionParams) {
    this.context = params.context
    this.missionType = params.missionType
    this.controlInterval = params.controlInterval ?? 0.02
    this.nextUpdateTime = 0
    this.lastUpdateTime = 0
    this.lastSetpoint = this.defaultSetpoint(0)
  }

  getSetpoint(time: number, batteryState?: { soc: number }): Setpoint {
    void batteryState
    const state = this.context.getCurrentState()
    if (!state) {
      return this.defaultSetpoint(time)
    }

    // Robust trigger with a tiny epsilon to avoid floating-point misses.
    if (time + 1e-9 >= this.nextUpdateTime) {
      const pythonResult = this.context.pyodideUpdate(time, state)
      this.lastSetpoint = this.resultToSetpoint(pythonResult, state, time)
      this.lastUpdateTime = time
      this.nextUpdateTime = time + this.controlInterval
    }

    // Extrapolate from the most recent Python output to the current time so the
    // cascaded controller sees a smooth, dynamically consistent setpoint.
    return extrapolateSetpoint(this.lastSetpoint, time - this.lastUpdateTime)
  }

  private resultToSetpoint(result: PythonUpdateResult, state: PythonControlState, time: number): Setpoint {
    void time
    const position = result.position ?? state.position
    const velocity = result.velocity ?? [0, 0, 0]
    const acceleration = result.acceleration ?? [0, 0, 0]
    const heading = result.heading ?? [1, 0, 0]

    return {
      position,
      velocity: velocity as [number, number, number],
      acceleration: acceleration as [number, number, number],
      heading: heading as [number, number, number],
      landing: false,
    }
  }

  private defaultSetpoint(time: number): Setpoint {
    if (this.missionType === 'circle') {
      const radius = 5
      const speed = 2
      const omega = speed / radius
      const theta = omega * time
      return {
        position: [radius * Math.cos(theta), radius * Math.sin(theta), -5] as [number, number, number],
        velocity: [-radius * omega * Math.sin(theta), radius * omega * Math.cos(theta), 0] as [number, number, number],
        acceleration: [-omega * omega * radius * Math.cos(theta), -omega * omega * radius * Math.sin(theta), 0] as [number, number, number],
        heading: [1, 0, 0] as [number, number, number],
        landing: false,
      }
    }

    return {
      position: [0, 0, -5] as [number, number, number],
      velocity: [0, 0, 0] as [number, number, number],
      acceleration: [0, 0, 0] as [number, number, number],
      heading: [1, 0, 0] as [number, number, number],
      landing: false,
    }
  }
}
