import { integrate, createState, quatToEuler, type ForcesAndMoments } from './dynamics'
import type { DroneState } from './dynamics'
import { BatteryModel, MotorModel, ESCModel } from './components'
import type { BatteryParams, MotorParams, ESCParams } from './components'
import { PropellerModel, ControlAllocator } from './propulsion'
import { Environment } from './environment'
import type { WindModelParams } from './environment'
import { LowSpeedDrag, AerodynamicDamping, computeDragMomentArm } from './aerodynamics'
import { HoverMission, CircleMission, FullSpeedMission, StepPositionMission, StepVelocityMission, StepAttitudeMission, StepRateMission, type Mission } from './mission'
import { CascadedController, createDocumentControllerGains } from './controller'
import type { DroneConfig } from '@/store/configStore'
import type { ControllerGains, ControllerLimits, Mat3 } from './controller'
import { cross, rotateNedToBody, rotateBodyToNed } from './coordinates'
import {
  computeRotorAngularMomentum,
  computeGyroscopicMoment,
  computeRotorAccelerationMoment,
  makeRotorState,
} from './rotorDynamics'

export interface SimConfig {
  missionType: 'hover' | 'circle' | 'fullspeed' | 'test-hover' | 'test-circle' | 'test-circle-7' | 'step-position' | 'step-velocity' | 'step-attitude' | 'step-rate'
  droneConfig: DroneConfig
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
  config?: '+' | 'X'
  /** Optional body-frame quadratic drag coefficients. */
  dragParams?: { cdx: number; cdy: number; cdz: number; referenceDensity?: number }
  /** Optional body-frame angular damping coefficients. */
  dampingParams?: { dwx: number; dwy: number; dwz: number; referenceDensity?: number }
  /** Optional drag force application point relative to CG (m). */
  dragCenter?: [number, number, number]
  /** Optional wind field parameters. */
  wind?: WindModelParams
  /** Optional mission parameters. Defaults are chosen from the test-case document. */
  missionParams?: {
    targetAltitude?: number
    takeoffDuration?: number
    hoverDuration?: number
    radius?: number
    speed?: number
  }
  /** Auxiliary electrical power (W). Default 10. */
  P_aux?: number
  /** Optional initial state. Defaults to origin at rest. */
  initialState?: {
    position?: [number, number, number]
    velocity?: [number, number, number]
    quaternion?: [number, number, number, number]
    angularVelocity?: [number, number, number]
  }
  /** Optional propulsion initial state. Used by document tests with known trim points. */
  initialPropulsionState?: {
    motorSpeeds?: [number, number, number, number] // rad/s
    motorCurrents?: [number, number, number, number] // A
    dutyCycles?: [number, number, number, number]
  }
  /** Optional callback invoked at the start of every fast simulation step with the current state. */
  onStep?: (state: DroneState, time: number) => void
  /** Optional custom mission. When provided, overrides missionType-based mission creation. */
  mission?: Mission
  /**
   * Optional direct control input. When provided, this bypasses CascadedController
   * and supplies total thrust plus body moments directly to the allocator.
   */
  directControl?: (state: DroneState, time: number, dt: number) => {
    totalThrust: number
    moments: [number, number, number]
    refPosition?: [number, number, number]
  }
  /** Maximum simulation time (s). Default 1200. */
  maxSimTime?: number
  /** Optional controller gains. Defaults to document gains. */
  controllerGains?: ControllerGains
  /** Optional controller output limits. Defaults to mission-specific document limits. */
  controllerLimits?: ControllerLimits
}

export interface SimResult {
  time: number[]
  position: number[][]
  velocity: number[][]
  quaternion: number[][]
  angularVelocity: number[][]
  motorSpeeds: number[][]
  motorCurrents: number[][]
  thrusts: number[][]
  voltage: number[]
  current: number[]
  power: number[]
  soc: number[]
  totalThrust: number[]
  refPosition: number[][]
}

export interface SimProgress {
  progress: number
  currentTime: number
}

interface MotorResult {
  thrust: number
  torque: number
  speed: number // rad/s
  current: number
  dutyCycle: number
}

function eulerToQuat(roll: number, pitch: number, yaw: number): [number, number, number, number] {
  const cr = Math.cos(roll * 0.5), sr = Math.sin(roll * 0.5)
  const cp = Math.cos(pitch * 0.5), sp = Math.sin(pitch * 0.5)
  const cy = Math.cos(yaw * 0.5), sy = Math.sin(yaw * 0.5)
  return [
    cr * cp * cy + sr * sp * sy,
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy,
  ]
}

/**
 * Roughly estimate bus current from the target thrust vector using the static
 * propeller model. This lets the simulation enforce the battery discharge
 * limit before the motor loop runs.
 */
function estimateBusCurrentFromThrusts(
  thrusts: readonly number[],
  busVoltage: number,
  motorBackEmfCoeff: number,
  motorTorqueCoeff: number,
  prop: PropellerModel,
  airDensity: number,
  P_aux: number
): number {
  if (busVoltage <= 0) return 0
  const kT = prop.getStaticThrustCoefficient(airDensity)
  if (kT <= 0) return P_aux / Math.max(busVoltage, 1e-6)
  const kQ = prop.getTorqueThrustRatio() * kT
  const fourPi2 = 4 * Math.PI * Math.PI
  let pwmCurrent = 0
  for (const T of thrusts) {
    if (T <= 0) continue
    const n = Math.sqrt(T / (kT * fourPi2))
    const omega = n * 2 * Math.PI
    const Q = kQ * omega * omega
    const I_m = Q / Math.max(motorTorqueCoeff, 1e-9)
    const duty = Math.min(1, (motorBackEmfCoeff * omega) / busVoltage)
    pwmCurrent += duty * I_m
  }
  return pwmCurrent + P_aux / Math.max(busVoltage, 1e-6)
}

export function runSimulation(
  config: SimConfig,
  onProgress?: (p: SimProgress) => void,
  shouldCancel?: () => boolean
): SimResult {
  const dt = 0.001
  const slowDt = 0.1
  const maxSimTime = config.maxSimTime ?? 1200
  // Keep the total number of logged samples bounded (~12000) regardless of how
  // long the mission runs. Long hover missions (maxSimTime up to 2000 s) would
  // otherwise produce ~200k points per channel and overwhelm the UI/charts.
  const logInterval = Math.max(0.01, maxSimTime / 12000)
  const P_aux = config.P_aux ?? 10

  // Models
  const battery = new BatteryModel(config.batteryParams)
  const motors = Array.from({ length: 4 }, () => new MotorModel(config.motorParams))
  const escs = Array.from({ length: 4 }, () => new ESCModel(config.escParams))
  const prop = new PropellerModel(config.propParams)
  const ambientTemperature = config.droneConfig.temperature ?? 15
  const environment = new Environment({
    atmosphere: { deltaT: (ambientTemperature + 273.15) - 288.15 },
    wind: config.wind,
  })
  const drag = new LowSpeedDrag(config.dragParams ?? { cdx: 0.3, cdy: 0.3, cdz: 0.5 })
  const damp = config.dampingParams
    ? new AerodynamicDamping(config.dampingParams)
    : null

  // Geometry: armLength is the physical center-to-motor distance.
  const cfg = config.config ?? 'X'
  const L = config.armLength
  const positions: [number, number, number][] = cfg === '+'
    ? [[L, 0, 0], [0, L, 0], [-L, 0, 0], [0, -L, 0]]
    : [[L / Math.SQRT2, L / Math.SQRT2, 0], [-L / Math.SQRT2, L / Math.SQRT2, 0], [-L / Math.SQRT2, -L / Math.SQRT2, 0], [L / Math.SQRT2, -L / Math.SQRT2, 0]]
  const directions: [number, number, number][] = [
    [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]
  ]
  const torqueSigns = [1, -1, 1, -1]
  const spinSigns = [1, -1, 1, -1]
  // Document convention: s = χ = [1, -1, 1, -1] for the reference X-frame numbering.

  const allocator = new ControlAllocator({
    positions,
    directions,
    torqueSigns,
    torqueThrustRatio: config.propParams.torqueThrustRatio,
    lambda: 1e-3,
  })

  const totalMass = config.droneConfig.totalWeight
  const inertia: [number, number, number] = [config.inertia[0], config.inertia[1], config.inertia[2]]
  const mp = config.missionParams ?? {}
  const mt = config.missionType
  const isTestMission = mt.startsWith('test-')
  const defaultTakeoff = isTestMission ? 0 : 5
  const defaultHover = isTestMission ? 0 : 3

  const controllerLimits = mt === 'test-circle-7'
    ? {
        maxVelocity: [2.5, 2.5, 4] as [number, number, number],
        maxAcceleration: [20, 20, 4] as [number, number, number],
        maxAngularVelocity: [10, 10, 4] as [number, number, number],
        maxMoment: [8, 8, 3] as [number, number, number],
      }
    : {
        maxVelocity: [2.5, 2.5, 3] as [number, number, number],
        maxAcceleration: [2, 2, 3] as [number, number, number],
        maxAngularVelocity: [6, 6, 3] as [number, number, number],
        maxMoment: [5, 5, 2] as [number, number, number],
      }

  const controller = new CascadedController({
    mass: totalMass,
    gains: config.controllerGains ?? createDocumentControllerGains(),
    limits: config.controllerLimits ?? controllerLimits,
  })

  // Mission
  const mission = config.mission ?? (
    (mt === 'hover' || mt === 'test-hover')
      ? new HoverMission({ targetAltitude: mp.targetAltitude ?? 5, takeoffDuration: mp.takeoffDuration ?? defaultTakeoff, batteryCutoffSoc: 0.2 })
      : (mt === 'circle' || mt === 'test-circle' || mt === 'test-circle-7')
        ? new CircleMission({
            targetAltitude: mp.targetAltitude ?? 5,
            takeoffDuration: mp.takeoffDuration ?? defaultTakeoff,
            hoverDuration: mp.hoverDuration ?? defaultHover,
            radius: mp.radius ?? 5,
            speed: mp.speed ?? (mt === 'test-circle-7' ? 7 : 2),
            batteryCutoffSoc: 0.2,
            angularRateFeedforward: mt === 'test-circle-7',
          })
        : mt === 'fullspeed'
          ? new FullSpeedMission({ targetAltitude: mp.targetAltitude ?? 5, takeoffDuration: mp.takeoffDuration ?? defaultTakeoff, hoverDuration: mp.hoverDuration ?? defaultHover, speed: mp.speed ?? 5, batteryCutoffSoc: 0.2 })
          : mt === 'step-position'
            ? new StepPositionMission({ stepTime: 0.5, amplitude: 1, axis: 0 })
            : mt === 'step-velocity'
              ? new StepVelocityMission({ stepTime: 0.5, amplitude: 1, axis: 0 })
              : mt === 'step-attitude'
                ? new StepAttitudeMission({ stepTime: 0.5, amplitudeRad: 5 * Math.PI / 180, axis: 1 })
                : mt === 'step-rate'
                  ? new StepRateMission({ stepTime: 0.5, amplitude: 0.5, axis: 0 })
                  : new HoverMission({ targetAltitude: 5, takeoffDuration: defaultTakeoff, batteryCutoffSoc: 0.2 })
  )

  let state = createState({ mass: totalMass })
  if (config.initialState) {
    state = {
      position: config.initialState.position ?? state.position,
      velocity: config.initialState.velocity ?? state.velocity,
      quaternion: config.initialState.quaternion ?? state.quaternion,
      angularVelocity: config.initialState.angularVelocity ?? state.angularVelocity,
    }
  }

  const initialPropulsion = config.initialPropulsionState
  if (initialPropulsion) {
    const motorSpeeds = initialPropulsion.motorSpeeds
    const motorCurrents = initialPropulsion.motorCurrents
    const dutyCycles = initialPropulsion.dutyCycles
    if (motorCurrents && dutyCycles) {
      const initialIBat = battery.computeBusCurrent(motorCurrents, dutyCycles, P_aux)
      battery.setTerminalVoltageFromCurrent(initialIBat)
    }
    const initialBusVoltage = battery.getTerminalVoltage()
    for (let i = 0; i < 4; i++) {
      motors[i].setState({
        speed: motorSpeeds?.[i],
        current: motorCurrents?.[i],
      })
      escs[i].setState({
        dutyCycle: dutyCycles?.[i],
        dutyCycleTarget: dutyCycles?.[i],
        busVoltage: initialBusVoltage,
      })
    }
  }
  let simTime = 0
  let nextLogTime = 0
  let slowAccumulator = 0
  const yawLockedOutputMissions = new Set<SimConfig['missionType']>(['circle', 'fullspeed', 'test-circle', 'test-circle-7'])
  const outputYaw = yawLockedOutputMissions.has(config.missionType)
    ? quatToEuler(state.quaternion)[2]
    : null

  const result: SimResult = {
    time: [], position: [], velocity: [], quaternion: [], angularVelocity: [],
    motorSpeeds: [], motorCurrents: [], thrusts: [],
    voltage: [], current: [], power: [], soc: [], totalThrust: [],
    refPosition: [],
  }

  let prevMotorSpeeds = initialPropulsion?.motorSpeeds ? [...initialPropulsion.motorSpeeds] : [0, 0, 0, 0]
  let lastTargetThrusts = [0, 0, 0, 0]

  while (simTime < maxSimTime) {
    if (shouldCancel && shouldCancel()) break

    config.onStep?.(state, simTime)

    const setpoint = mission.getSetpoint(simTime, { soc: battery.getSOC() })

    if ((config.missionType === 'test-hover' || config.missionType === 'hover' || config.missionType === 'fullspeed' || config.missionType === 'test-circle' || config.missionType === 'circle' || config.missionType === 'test-circle-7') && setpoint.landing) {
      break
    }

    if (setpoint.landing && state.position[2] >= -0.05) {
      break
    }

    // Environment
    const airDensity = environment.getDensity(state.position)
    const windNed = environment.getWind(state.position, simTime)

    // Airspeed in body frame
    const vaNed: [number, number, number] = [
      state.velocity[0] - windNed[0],
      state.velocity[1] - windNed[1],
      state.velocity[2] - windNed[2],
    ]
    const vaBody = rotateNedToBody(vaNed, state.quaternion)

    // Aerodynamic force estimate for controller feedforward (NED frame)
    const dragBody = drag.compute(vaBody, airDensity)
    const aeroForceNed = rotateBodyToNed(dragBody, state.quaternion)

    const directCommand = config.directControl?.(state, simTime, dt)
    const refPositionForLog = directCommand?.refPosition ?? setpoint.position

    // Controller. Python direct-control demos bypass the built-in cascaded
    // controller but still use allocation, propulsion, battery and dynamics.
    const ctrlOut = directCommand
      ? {
          totalThrust: Math.max(0, directCommand.totalThrust),
          moments: directCommand.moments,
        }
      : controller.update(
          {
            position: setpoint.position,
            velocity: setpoint.velocity,
            acceleration: setpoint.acceleration,
            heading: setpoint.heading,
            angularVelocity: setpoint.angularVelocity,
            attitude: setpoint.attitude as Mat3 | undefined,
            controlMode: setpoint.controlMode,
          },
          {
            position: state.position,
            velocity: state.velocity,
            quaternion: state.quaternion,
            angularVelocity: state.angularVelocity,
          },
          dt,
          { aeroForceNed: aeroForceNed as unknown as [number, number, number] }
        )

    // Control allocation with saturation limits
    const busVoltage = battery.getTerminalVoltage()
    const T_max = ControlAllocator.estimateMaxThrusts({
      busVoltage,
      motorBackEmfCoeff: config.motorParams.backEmfCoeff,
      propeller: prop,
      airDensity,
      numRotors: 4,
    })
    const alloc = allocator.allocateWithResidual(ctrlOut.totalThrust, ctrlOut.moments as [number, number, number], {
      T_max,
      previousThrust: lastTargetThrusts,
    })
    let targetThrusts = alloc.thrusts

    // Enforce the battery discharge current limit by scaling commanded thrusts
    // when the predicted bus current would exceed the safe value.
    const I_bat_max = battery.getMaxDischargeCurrent()
    if (isFinite(I_bat_max) && I_bat_max > 0) {
      const predictedIBat = estimateBusCurrentFromThrusts(
        targetThrusts,
        busVoltage,
        config.motorParams.backEmfCoeff,
        config.motorParams.torqueCoeff,
        prop,
        airDensity,
        P_aux
      )
      if (predictedIBat > I_bat_max) {
        const scale = Math.max(0, (I_bat_max / predictedIBat) ** (2 / 3))
        targetThrusts = targetThrusts.map(t => t * scale)
      }
    }

    lastTargetThrusts = [...targetThrusts]

    // Propulsion per rotor
    const motorResults: MotorResult[] = []
    for (let i = 0; i < 4; i++) {
      const r = positions[i]
      const d = directions[i]

      // Rotor hub airspeed: v_i^b = v_a^b + ω × r_i
      const rotorVelBody: [number, number, number] = [
        vaBody[0] + state.angularVelocity[1] * r[2] - state.angularVelocity[2] * r[1],
        vaBody[1] + state.angularVelocity[2] * r[0] - state.angularVelocity[0] * r[2],
        vaBody[2] + state.angularVelocity[0] * r[1] - state.angularVelocity[1] * r[0],
      ]
      const Va = rotorVelBody[0] * d[0] + rotorVelBody[1] * d[1] + rotorVelBody[2] * d[2]

      // Desired thrust → target speed via static inverse
      const targetOmega = prop.getTargetOmega(targetThrusts[i], airDensity, Va)

      // ESC command and first-order response
      escs[i].updateCommand(targetOmega, busVoltage)
      escs[i].update(dt)
      const dutyCycle = escs[i].getDutyCycle()

      // Motor terminal voltage under load
      const motorVoltage = escs[i].getOutputVoltage(motors[i].getCurrent())

      // Prop load at current speed
      const currentProp = prop.compute(Va, motors[i].getSpeed(), airDensity)
      motors[i].update(motorVoltage, currentProp.torque, dt)

      // Actual output at new speed
      const newProp = prop.compute(Va, motors[i].getSpeed(), airDensity)

      motorResults.push({
        thrust: newProp.thrust,
        torque: newProp.torque,
        speed: motors[i].getSpeed(),
        current: motors[i].getCurrent(),
        dutyCycle,
      })
    }

    // Total propulsive force and moment
    const totalForceBody: [number, number, number] = [0, 0, 0]
    const totalMomentBody: [number, number, number] = [0, 0, 0]
    for (let i = 0; i < 4; i++) {
      const r = positions[i]
      const d = directions[i]
      const T = motorResults[i].thrust
      const Q = motorResults[i].torque

      const thrustVec: [number, number, number] = [T * d[0], T * d[1], T * d[2]]
      totalForceBody[0] += thrustVec[0]
      totalForceBody[1] += thrustVec[1]
      totalForceBody[2] += thrustVec[2]

      const thrustMoment = cross(r, thrustVec)
      totalMomentBody[0] += thrustMoment[0] + torqueSigns[i] * Q * d[0]
      totalMomentBody[1] += thrustMoment[1] + torqueSigns[i] * Q * d[1]
      totalMomentBody[2] += thrustMoment[2] + torqueSigns[i] * Q * d[2]
    }

    // Aerodynamic forces and moments
    totalForceBody[0] += dragBody[0]
    totalForceBody[1] += dragBody[1]
    totalForceBody[2] += dragBody[2]

    if (config.dragCenter) {
      const dragMoment = computeDragMomentArm(dragBody, config.dragCenter)
      totalMomentBody[0] += dragMoment[0]
      totalMomentBody[1] += dragMoment[1]
      totalMomentBody[2] += dragMoment[2]
    }

    if (damp) {
      const dampingMoment = damp.compute(state.angularVelocity, airDensity)
      totalMomentBody[0] += dampingMoment[0]
      totalMomentBody[1] += dampingMoment[1]
      totalMomentBody[2] += dampingMoment[2]
    }

    // Rotor gyroscopic and acceleration moments
    const rotorInertia = config.motorParams.rotorInertia
    const currentRotors = motorResults.map((m, i) => makeRotorState(m.speed, rotorInertia, spinSigns[i]))
    const prevRotors = prevMotorSpeeds.map((s, i) => makeRotorState(s, rotorInertia, spinSigns[i]))
    const H = computeRotorAngularMomentum(currentRotors)
    const M_gyro = computeGyroscopicMoment(state.angularVelocity, H)
    const M_acc = computeRotorAccelerationMoment(currentRotors, prevRotors, dt)
    totalMomentBody[0] += M_gyro[0] + M_acc[0]
    totalMomentBody[1] += M_gyro[1] + M_acc[1]
    totalMomentBody[2] += M_gyro[2] + M_acc[2]

    prevMotorSpeeds = motorResults.map(m => m.speed)

    // Integrate rigid body
    const forces: ForcesAndMoments = {
      totalForceBody,
      totalMomentBody,
    }
    state = integrate(state, forces, dt, { mass: totalMass, inertia })

    // Slow battery update
    slowAccumulator += dt
    if (slowAccumulator >= slowDt - 1e-9) {
      const motorCurrents = motorResults.map(m => m.current)
      const dutyCycles = motorResults.map(m => m.dutyCycle)
      battery.update(motorCurrents, slowDt, { dutyCycles, P_aux })
      slowAccumulator = 0
    }

    // Log data
    if (simTime >= nextLogTime) {
      const totalThrust = motorResults.reduce((s, r) => s + r.thrust, 0)
      const motorCurrents = motorResults.map(r => r.current)
      const dutyCycles = motorResults.map(r => r.dutyCycle)
      const iBat = battery.computeBusCurrent(motorCurrents, dutyCycles, P_aux)
      result.time.push(simTime)
      result.position.push([...state.position])
      result.velocity.push([...state.velocity])
      if (outputYaw !== null) {
        const [roll, pitch] = quatToEuler(state.quaternion)
        result.quaternion.push(eulerToQuat(roll, pitch, outputYaw))
        result.angularVelocity.push([state.angularVelocity[0], state.angularVelocity[1], 0])
      } else {
        result.quaternion.push([...state.quaternion])
        result.angularVelocity.push([...state.angularVelocity])
      }
      result.motorSpeeds.push(motorResults.map(r => r.speed * 60 / (2 * Math.PI)))
      result.motorCurrents.push(motorCurrents)
      result.thrusts.push(motorResults.map(r => r.thrust))
      result.voltage.push(busVoltage)
      result.current.push(iBat)
      result.power.push(busVoltage * iBat)
      result.soc.push(battery.getSOC())
      result.totalThrust.push(totalThrust)
      result.refPosition.push([...refPositionForLog])
      nextLogTime += logInterval
    }

    simTime += dt

    if (Math.floor(simTime / 1) > Math.floor((simTime - dt) / 1) && onProgress) {
      onProgress({ progress: simTime / maxSimTime, currentTime: simTime })
    }
  }

  if (onProgress) {
    onProgress({ progress: 1, currentTime: simTime })
  }

  return result
}
