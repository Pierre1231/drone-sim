import { integrate, createState, type DroneState, type ForcesAndMoments } from './dynamics'
import { BatteryModel, MotorModel, ESCModel } from './components'
import { PropellerModel, ControlAllocator, PIDController } from './propulsion'
import { StandardAtmosphere, LowSpeedDrag } from './aerodynamics'
import { HoverMission, Figure8Mission } from './mission'
import { designController } from './controllerDesign'
import type { DroneConfig } from '@/store/configStore'

export interface SimConfig {
  missionType: 'hover' | 'figure8'
  droneConfig: DroneConfig
  // Physics params from parts database lookups
  frameMass: number
  motorParams: { resistance: number; backEmfCoeff: number; torqueCoeff: number; rotorInertia: number; viscousDamping: number }
  propParams: { diameter: number; thrustCurve: [number, number][]; torqueCurve: [number, number][]; torqueThrustRatio: number }
  batteryParams: { cells: number; capacityAh: number; ocvCoeffs: [number, number, number, number]; internalResistance: number }
  escParams: { maxCurrent: number; resistance: number }
  inertia: [number, number, number]
  armLength: number
}

export interface SimResult {
  time: number[]
  position: number[][] // [t][xyz]
  velocity: number[][]
  quaternion: number[][]
  angularVelocity: number[][]
  motorSpeeds: number[][] // [t][4 motors] RPM
  motorCurrents: number[][]
  thrusts: number[][]
  voltage: number[]
  current: number[]
  power: number[]
  soc: number[]
  totalThrust: number[]
}

export interface SimProgress {
  progress: number // 0~1
  currentTime: number
}

export function runSimulation(
  config: SimConfig,
  onProgress?: (p: SimProgress) => void,
  shouldCancel?: () => boolean
): SimResult {
  const dt = 0.0001 // 10kHz
  const logInterval = 0.01 // log every 10ms (100Hz output)
  const maxSimTime = 600 // max 10 minutes physical time

  // Initialize models
  const battery = new BatteryModel(config.batteryParams)
  const motors = Array.from({ length: 4 }, () => new MotorModel(config.motorParams))
  const escs = Array.from({ length: 4 }, () => new ESCModel({ minSpeed: 100, maxSpeedAtNominalVoltage: config.motorParams.backEmfCoeff > 0 ? 1 / config.motorParams.backEmfCoeff : 10000 }))
  const prop = new PropellerModel(config.propParams)
  const allocator = new ControlAllocator({ armLength: config.armLength })
  const atm = new StandardAtmosphere()
  const drag = new LowSpeedDrag({ cdx: 0.3, cdy: 0.3, cdz: 0.5 })

  // Design controller
  const gains = designController({
    mass: config.frameMass + config.droneConfig.totalWeight,
    inertia: config.inertia,
    maxThrustPerMotor: 15, // placeholder
    motorTimeConstant: config.motorParams.rotorInertia / config.motorParams.viscousDamping,
    armLength: config.armLength,
  })

  const ratePid = new PIDController({ kp: gains.rateKp, ki: gains.rateKi, kd: gains.rateKd })
  const attitudePid = new PIDController({ kp: gains.attitudeKp, ki: 0, kd: 0 })
  const velPid = new PIDController({ kp: gains.velocityKp, ki: gains.velocityKi, kd: gains.velocityKd })
  const posPid = new PIDController({ kp: gains.positionKp, ki: gains.positionKi, kd: 0 })

  // Mission
  const mission = config.missionType === 'hover'
    ? new HoverMission({ targetAltitude: 10, takeoffDuration: 5, batteryCutoffSoc: 0.2 })
    : new Figure8Mission({ targetAltitude: 10, takeoffDuration: 5, hoverDuration: 3, radius: 5, speed: 2, batteryCutoffSoc: 0.2 })

  let state = createState({ mass: config.frameMass })
  let simTime = 0
  let nextLogTime = 0

  const result: SimResult = {
    time: [], position: [], velocity: [], quaternion: [], angularVelocity: [],
    motorSpeeds: [], motorCurrents: [], thrusts: [],
    voltage: [], current: [], power: [], soc: [], totalThrust: [],
  }

  let stepCount = 0
  const totalSteps = maxSimTime / dt

  while (simTime < maxSimTime) {
    if (shouldCancel && shouldCancel()) break

    // Mission setpoint
    const setpoint = mission.getSetpoint(simTime, { soc: battery.getSOC() })

    if (setpoint.landing && state.position[2] <= 0.1) {
      break // landed
    }

    // Get battery voltage
    const totalCurrent = motors.reduce((sum, m) => sum + Math.abs(m.getCurrent()), 0)
    const busVoltage = battery.getVoltage(totalCurrent)

    // Simple position control (outer loop)
    const posError = [setpoint.position[0] - state.position[0], setpoint.position[1] - state.position[1], setpoint.position[2] - state.position[2]]
    const velCmd = [posPid.update(posError[0], dt), posPid.update(posError[1], dt), posPid.update(posError[2], dt)]

    // Velocity control
    const velError = [velCmd[0] - state.velocity[0], velCmd[1] - state.velocity[1], velCmd[2] - state.velocity[2]]
    const accCmd = [velPid.update(velError[0], dt), velPid.update(velError[1], dt), velPid.update(velError[2], dt)]

    // Desired thrust from acceleration
    const totalMass = config.frameMass + config.droneConfig.totalWeight
    const gravityNED: [number, number, number] = [0, 0, 9.81]
    const thrustCmd = totalMass * (accCmd[2] + gravityNED[2])

    // Simplified attitude: assume level flight for MVP (no attitude control complexity)
    const moments: [number, number, number] = [0, 0, 0]

    // Control allocation
    const motorThrusts = allocator.allocate(Math.max(0, thrustCmd), moments)

    // Propeller + motor dynamics
    const airDensity = atm.getDensity(-state.position[2])
    const Va = -state.velocity[2] // approximate axial velocity
    const motorResults = motors.map((motor, i) => {
      const propResult = prop.compute(Va, motor.getSpeed())
      const thrustError = motorThrusts[i] - propResult.thrust
      const speedCmd = motor.getSpeed() + thrustError * 0.1 // simplified speed adjustment

      escs[i].updateCommand(speedCmd, busVoltage)
      const motorVoltage = escs[i].getOutputVoltage()
      motor.update(motorVoltage, propResult.torque, dt)

      return {
        thrust: propResult.thrust,
        torque: propResult.torque,
        speed: motor.getSpeed(),
        current: motor.getCurrent(),
      }
    })

    // Compute total forces and moments
    const totalThrust = motorResults.reduce((s, r) => s + r.thrust, 0)
    const totalMoment: [number, number, number] = [
      config.armLength * (motorResults[0].thrust - motorResults[1].thrust - motorResults[2].thrust + motorResults[3].thrust),
      config.armLength * (motorResults[0].thrust + motorResults[1].thrust - motorResults[2].thrust - motorResults[3].thrust),
      motorResults[0].torque - motorResults[1].torque + motorResults[2].torque - motorResults[3].torque,
    ]

    const bodyForce: [number, number, number] = [0, 0, -totalThrust]

    // Drag
    const dragForce = drag.compute([-state.velocity[0], -state.velocity[1], -state.velocity[2]])
    const totalForceBody: [number, number, number] = [
      bodyForce[0] + dragForce[0],
      bodyForce[1] + dragForce[1],
      bodyForce[2] + dragForce[2],
    ]

    const forces: ForcesAndMoments = {
      totalForceBody: totalForceBody,
      totalMomentBody: totalMoment,
    }

    // Integrate
    state = integrate(state, forces, dt, { mass: totalMass, inertia: [config.inertia[0], config.inertia[1], config.inertia[2]] })

    // Update battery
    const motorTotalCurrent = motorResults.reduce((s, r) => s + Math.abs(r.current), 0)
    battery.update(motorTotalCurrent, dt)

    // Log data
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
      result.current.push(motorTotalCurrent)
      result.power.push(busVoltage * motorTotalCurrent)
      result.soc.push(battery.getSOC())
      result.totalThrust.push(totalThrust)
      nextLogTime += logInterval
    }

    simTime += dt
    stepCount++

    if (stepCount % 100000 === 0 && onProgress) {
      onProgress({ progress: simTime / maxSimTime, currentTime: simTime })
    }
  }

  if (onProgress) {
    onProgress({ progress: 1, currentTime: simTime })
  }

  return result
}
