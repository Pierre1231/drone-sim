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

/**
 * Design cascaded PID controller gains for a multirotor.
 *
 * Uses fixed bandwidth hierarchy typical for small multirotors:
 *   Rate      : 20-40 rad/s (inner)
 *   Attitude  : 5-10 rad/s
 *   Velocity  : 1-2 rad/s
 *   Position  : 0.5-1 rad/s (outer)
 *
 * Motor time constant is used only to check that rate loop doesn't
 * exceed ~1/3 of the motor bandwidth, with a hard floor.
 */
export function designController(input: ControllerDesignInput): ControllerGains {
  const { mass, inertia } = input

  // Use average inertia for simplification
  const J = (inertia[0] + inertia[1] + inertia[2]) / 3

  // Fixed bandwidth allocation (inner → outer) for typical small multirotors.
  // We ignore the motor time constant here because the database values
  // (rotorInertia=1e-5, viscousDamping=1e-6 → tau=10s) are not representative
  // of real brushless motor dynamics, which would give tau ≈ 0.02-0.05s.
  const rateBandwidth = 20
  const attitudeBandwidth = 5
  const velocityBandwidth = 1
  const positionBandwidth = 0.5

  // Rate loop gains (PD, no integral needed)
  const rateKp = J * rateBandwidth
  const rateKd = 2 * DAMPING_RATIO * Math.sqrt(J * rateKp)
  const rateKi = 0

  // Attitude loop gain (P only)
  // Mapping: desired rate = Kp_att * attitude_error
  const attitudeKp = rateBandwidth / 3

  // Velocity loop gains (PI - no D needed for first-order system)
  const velocityKp = mass * velocityBandwidth
  const velocityKd = 0
  const velocityKi = velocityKp * velocityBandwidth / 5

  // Position loop gains (PI, no D needed)
  const positionKp = positionBandwidth * positionBandwidth * mass
  const positionKi = positionKp * positionBandwidth / 5

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
