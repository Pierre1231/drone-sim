import { integrate, createState, quatToEuler, rotateNedToBody, type ForcesAndMoments } from './dynamics'
import { BatteryModel, MotorModel } from './components'
import { PropellerModel, ControlAllocator, PIDController } from './propulsion'
import { StandardAtmosphere, LowSpeedDrag } from './aerodynamics'
import { HoverMission, CircleMission, Figure8Mission } from './mission'
import { designController } from './controllerDesign'
import type { DroneConfig } from '@/store/configStore'

export interface SimConfig {
  missionType: 'hover' | 'circle' | 'figure8'
  droneConfig: DroneConfig
  frameMass: number
  motorParams: { resistance: number; kv: number; backEmfCoeff: number; torqueCoeff: number; rotorInertia: number; viscousDamping: number }
  propParams: { diameter: number; thrustCurve: [number, number][]; torqueCurve: [number, number][]; torqueThrustRatio: number }
  batteryParams: { cells: number; capacityAh: number; ocvCoeffs: [number, number, number, number]; internalResistance: number }
  escParams: { maxCurrent: number; resistance: number }
  inertia: [number, number, number]
  armLength: number
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

export function runSimulation(
  config: SimConfig,
  onProgress?: (p: SimProgress) => void,
  shouldCancel?: () => boolean
): SimResult {
  // Use 1kHz inner loop, 100Hz output logging for reasonable performance
  const dt = 0.001
  const logInterval = 0.01
  const maxSimTime = 600

  // Models
  const battery = new BatteryModel(config.batteryParams)
  const motors = Array.from({ length: 4 }, () => new MotorModel(config.motorParams))
  const prop = new PropellerModel(config.propParams)
  const allocator = new ControlAllocator({ armLength: config.armLength })
  const atm = new StandardAtmosphere()
  const drag = new LowSpeedDrag({ cdx: 0.3, cdy: 0.3, cdz: 0.5 })

  // Controller gains
  const gains = designController({
    mass: config.droneConfig.totalWeight,
    inertia: config.inertia,
    maxThrustPerMotor: 15,
    motorTimeConstant: config.motorParams.rotorInertia / Math.max(config.motorParams.viscousDamping, 1e-8),
    armLength: config.armLength,
  })

  // Cascaded P-only controllers: position → velocity → attitude → rate
  const posPidX = new PIDController({ kp: gains.positionKp, ki: 0, kd: 0, outputMin: -8, outputMax: 8 })
  const posPidY = new PIDController({ kp: gains.positionKp, ki: 0, kd: 0, outputMin: -8, outputMax: 8 })
  const posPidZ = new PIDController({ kp: gains.positionKp, ki: 0, kd: 0, outputMin: -10, outputMax: 10 })

  const velPidX = new PIDController({ kp: gains.velocityKp, ki: 0, kd: 0, outputMin: -8, outputMax: 8 })
  const velPidY = new PIDController({ kp: gains.velocityKp, ki: 0, kd: 0, outputMin: -8, outputMax: 8 })
  const velPidZ = new PIDController({ kp: gains.velocityKp, ki: 0, kd: 0, outputMin: -15, outputMax: 15 })

  // Attitude (outer) + Rate (inner) cascaded loop
  const attPidRoll = new PIDController({ kp: gains.attitudeKp * 2, ki: 0, kd: 0, outputMin: -6, outputMax: 6 })
  const attPidPitch = new PIDController({ kp: gains.attitudeKp * 2, ki: 0, kd: 0, outputMin: -6, outputMax: 6 })
  const attPidYaw = new PIDController({ kp: 1.0, ki: 0, kd: 0, outputMin: -2, outputMax: 2 })

  const ratePidRoll = new PIDController({ kp: gains.rateKp, ki: 0, kd: 0, outputMin: -5, outputMax: 5 })
  const ratePidPitch = new PIDController({ kp: gains.rateKp, ki: 0, kd: 0, outputMin: -5, outputMax: 5 })
  const ratePidYaw = new PIDController({ kp: gains.rateKp * 0.5, ki: 0, kd: 0, outputMin: -2, outputMax: 2 })

  // Mission
  const mission = config.missionType === 'hover'
    ? new HoverMission({ targetAltitude: 10, takeoffDuration: 5, batteryCutoffSoc: 0.2 })
    : config.missionType === 'circle'
      ? new CircleMission({ targetAltitude: 10, takeoffDuration: 5, hoverDuration: 3, radius: 5, speed: 2, batteryCutoffSoc: 0.2 })
      : new Figure8Mission({ targetAltitude: 10, takeoffDuration: 5, hoverDuration: 3, radius: 5, speed: 5, batteryCutoffSoc: 0.2 })

  let state = createState({ mass: config.frameMass })
  let simTime = 0
  let nextLogTime = 0

  const result: SimResult = {
    time: [], position: [], velocity: [], quaternion: [], angularVelocity: [],
    motorSpeeds: [], motorCurrents: [], thrusts: [],
    voltage: [], current: [], power: [], soc: [], totalThrust: [],
    refPosition: [],
  }

  const totalMass = config.droneConfig.totalWeight
  const G = 9.81

  while (simTime < maxSimTime) {
    if (shouldCancel && shouldCancel()) break

    const setpoint = mission.getSetpoint(simTime, { soc: battery.getSOC() })

    if (setpoint.landing && state.position[2] <= 0.05) {
      break
    }

    // Extract current attitude from quaternion
    const [roll, pitch, yaw] = quatToEuler(state.quaternion)

    // Battery voltage
    const totalMotorCurrent = motors.reduce((sum, m) => sum + Math.abs(m.getCurrent()), 0)
    const busVoltage = battery.getVoltage(totalMotorCurrent)

    // ========== Position control (outer loop) ==========
    const posErrX = setpoint.position[0] - state.position[0]
    const posErrY = setpoint.position[1] - state.position[1]
    const posErrZ = setpoint.position[2] - state.position[2]

    // Add feedforward velocity from mission setpoint for trajectory tracking
    const velCmdX = posPidX.update(posErrX, dt) + setpoint.velocity[0]
    const velCmdY = posPidY.update(posErrY, dt) + setpoint.velocity[1]
    const velCmdZ = posPidZ.update(posErrZ, dt) + setpoint.velocity[2]

    // ========== Velocity control (middle loop) ==========
    const velErrX = velCmdX - state.velocity[0]
    const velErrY = velCmdY - state.velocity[1]
    const velErrZ = velCmdZ - state.velocity[2]

    const accCmdX = velPidX.update(velErrX, dt)
    const accCmdY = velPidY.update(velErrY, dt)
    const accCmdZ = velPidZ.update(velErrZ, dt)

    // Total desired thrust with hover feedforward (critical for takeoff)
    // NED: accCmdZ positive = down. To go up (accCmdZ < 0), need MORE thrust.
    // thrust = m * (G - accCmdZ_ned)  [body thrust is upward = -z]
    const thrustCmd = Math.max(0, totalMass * (G - accCmdZ))

    // Desired tilt angles for x/y tracking (limit to prevent excessive lean)
    // NED body dynamics: nose-down (negative pitch) produces +x force;
    // right-wing-down (positive roll) produces +y force.
    const maxTiltAngle = 0.35 // ~20 degrees max
    const rollCmd = Math.max(-maxTiltAngle, Math.min(maxTiltAngle, accCmdY / Math.max(G, 0.1)))
    const pitchCmd = Math.max(-maxTiltAngle, Math.min(maxTiltAngle, -accCmdX / Math.max(G, 0.1)))
    const yawCmd = 0 // keep heading at 0 for now

    // ========== Attitude control (outer loop) ==========
    const rollErr = rollCmd - roll
    const pitchErr = pitchCmd - pitch
    const yawErr = yawCmd - yaw

    const rateCmdRoll = attPidRoll.update(rollErr, dt)
    const rateCmdPitch = attPidPitch.update(pitchErr, dt)
    const rateCmdYaw = attPidYaw.update(yawErr, dt)

    // ========== Rate control (inner loop) ==========
    const rateErrRoll = rateCmdRoll - state.angularVelocity[0]
    const rateErrPitch = rateCmdPitch - state.angularVelocity[1]
    const rateErrYaw = rateCmdYaw - state.angularVelocity[2]

    const rollMoment = ratePidRoll.update(rateErrRoll, dt)
    const pitchMoment = ratePidPitch.update(rateErrPitch, dt)
    const yawMoment = ratePidYaw.update(rateErrYaw, dt)

    const moments: [number, number, number] = [rollMoment, pitchMoment, yawMoment]

    // ========== Control allocation ==========
    const motorThrusts = allocator.allocate(thrustCmd, moments)

    // ========== Motor + propeller dynamics ==========
    const altitude = -state.position[2]
    const airDensity = atm.getDensity(altitude)
    const Va = -state.velocity[2]

    const motorResults = motors.map((motor, i) => {
      // Desired thrust → desired speed via inverse: T = CT * rho * n^2 * D^4
      const targetThrust = motorThrusts[i]
      const CT0 = 0.11 // approximate hover CT
      const targetN = Math.sqrt(Math.max(0, targetThrust) / (CT0 * airDensity * Math.pow(config.propParams.diameter, 4)))
      const targetOmega = targetN * 2 * Math.PI

      // Estimate required motor voltage to achieve target speed under load
      // V = Ke*w + I*R, where I = Q_load / Kt
      const targetProp = prop.compute(Va, targetOmega)
      const requiredCurrent = targetProp.torque / config.motorParams.torqueCoeff
      const requiredVoltage = config.motorParams.backEmfCoeff * targetOmega + requiredCurrent * config.motorParams.resistance
      const dutyCycle = Math.min(1, requiredVoltage / Math.max(busVoltage, 0.1))
      const motorVoltage = dutyCycle * busVoltage

      // Prop load torque at current speed
      const currentProp = prop.compute(Va, motor.getSpeed())
      motor.update(motorVoltage, currentProp.torque, dt)

      // Recalculate thrust at new speed
      const newProp = prop.compute(Va, motor.getSpeed())

      return {
        thrust: newProp.thrust,
        torque: newProp.torque,
        speed: motor.getSpeed(),
        current: motor.getCurrent(),
      }
    })

    // ========== Total forces and moments ==========
    const totalThrust = motorResults.reduce((s, r) => s + r.thrust, 0)

    // Body force: thrust along -z body axis
    const bodyForce: [number, number, number] = [0, 0, -totalThrust]

    // Drag in body frame (velocity_body = R^T * velocity_ned)
    const velocityBody = rotateNedToBody(state.velocity, state.quaternion)
    const dragForce = drag.compute(velocityBody)

    const totalForceBody: [number, number, number] = [
      bodyForce[0] + dragForce[0],
      bodyForce[1] + dragForce[1],
      bodyForce[2] + dragForce[2],
    ]

    // Moments from thrust differential + prop torque (reaction torque)
    // X-config: motors at [+L,+L], [-L,+L], [-L,-L], [+L,-L] (front-left, front-right, rear-right, rear-left)
    // Using right-hand rule for moments
    const totalMoment: [number, number, number] = [
      config.armLength * (motorResults[0].thrust - motorResults[1].thrust - motorResults[2].thrust + motorResults[3].thrust),
      config.armLength * (motorResults[0].thrust + motorResults[1].thrust - motorResults[2].thrust - motorResults[3].thrust),
      motorResults[0].torque - motorResults[1].torque + motorResults[2].torque - motorResults[3].torque,
    ]

    const forces: ForcesAndMoments = {
      totalForceBody: totalForceBody,
      totalMomentBody: totalMoment,
    }

    // ========== Integrate dynamics ==========
    state = integrate(state, forces, dt, {
      mass: totalMass,
      inertia: [config.inertia[0], config.inertia[1], config.inertia[2]]
    })

    // ========== Update battery ==========
    const motorCurrentSum = motorResults.reduce((s, r) => s + Math.abs(r.current), 0)
    battery.update(motorCurrentSum, dt)

    // ========== Log data ==========
    if (simTime >= nextLogTime) {
      result.time.push(simTime)
      result.position.push([...state.position])
      result.velocity.push([...state.velocity])
      result.quaternion.push([...state.quaternion])
      result.angularVelocity.push([...state.angularVelocity])
      result.motorSpeeds.push(motorResults.map(r => r.speed * 60 / (2 * Math.PI)))
      result.motorCurrents.push(motorResults.map(r => r.current))
      result.thrusts.push(motorResults.map(r => r.thrust))
      result.voltage.push(busVoltage)
      result.current.push(motorCurrentSum)
      result.power.push(busVoltage * motorCurrentSum)
      result.soc.push(battery.getSOC())
      result.totalThrust.push(totalThrust)
      result.refPosition.push([...setpoint.position])
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
