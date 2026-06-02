export interface ControllerDesignInput {
  mass: number // kg
  inertia: [number, number, number] // [Jxx, Jyy, Jzz] kg·m²
  maxThrustPerMotor: number // N
  motorTimeConstant: number // s
  armLength: number // m
}

export interface ControllerGains {
  // Angular velocity loop
  rateKp: number
  rateKi: number
  rateKd: number
  rateBandwidth: number // rad/s

  // Attitude loop
  attitudeKp: number
  attitudeBandwidth: number // rad/s

  // Velocity loop
  velocityKp: number
  velocityKi: number
  velocityKd: number
  velocityBandwidth: number // rad/s

  // Position loop
  positionKp: number
  positionKi: number
  positionBandwidth: number // rad/s
}

const DAMPING_RATIO = 0.7 // ζ

export function designController(input: ControllerDesignInput): ControllerGains {
  const { mass, inertia, maxThrustPerMotor, motorTimeConstant, armLength } = input

  // Use average inertia for simplification
  const J = (inertia[0] + inertia[1] + inertia[2]) / 3

  // Bandwidth allocation (inner to outer)
  // Rate loop: ~1/3 of motor bandwidth
  const rateBandwidth = 1 / (3 * motorTimeConstant)

  // Attitude loop: rate / 8
  const attitudeBandwidth = rateBandwidth / 8

  // Velocity loop: attitude / 8
  const velocityBandwidth = attitudeBandwidth / 8

  // Position loop: velocity / 8
  const positionBandwidth = velocityBandwidth / 8

  // Rate loop gains
  const rateKp = J * rateBandwidth
  const rateKd = 2 * DAMPING_RATIO * Math.sqrt(J * rateKp)
  const rateKi = 0 // typically not needed for rate loop

  // Attitude loop gain
  // Approximate: Kp_att = J * ω_att² / (T_max * L)
  const attitudeKp = (J * attitudeBandwidth * attitudeBandwidth) / (maxThrustPerMotor * armLength)

  // Velocity loop gains
  const velocityKp = mass * velocityBandwidth
  const velocityKd = 2 * DAMPING_RATIO * Math.sqrt(mass * velocityKp)
  const velocityKi = velocityKp * velocityBandwidth / 10

  // Position loop gains
  // Position loop needs to account for mass: Kp_pos = ω_pos² * m (second-order system)
  const positionKp = positionBandwidth * positionBandwidth * mass
  const positionKi = positionKp * positionBandwidth / 10

  return {
    rateKp,
    rateKi,
    rateKd,
    rateBandwidth,
    attitudeKp,
    attitudeBandwidth,
    velocityKp,
    velocityKi,
    velocityKd,
    velocityBandwidth,
    positionKp,
    positionKi,
    positionBandwidth,
  }
}
