export interface HoverEstimationInput {
  totalWeightKg: number
  propDiameterIn: number
  batteryCapacityMah: number
  batteryCells: number
  motorEfficiency: number
}

export interface HoverEstimationResult {
  hoverTimeMin: number
  currentA: number
}

const G = 9.81 // m/s²
const AIR_DENSITY = 1.225 // kg/m³
const CELL_VOLTAGE_NOMINAL = 3.7 // V
const INCH_TO_METER = 0.0254

export function estimateHoverPerformance(
  input: HoverEstimationInput
): HoverEstimationResult {
  // 参数校验
  if (input.totalWeightKg <= 0) {
    throw new Error('Total weight must be positive')
  }
  if (input.propDiameterIn <= 0) {
    throw new Error('Propeller diameter must be positive')
  }
  if (input.batteryCapacityMah <= 0) {
    throw new Error('Battery capacity must be positive')
  }
  if (input.batteryCells <= 0) {
    throw new Error('Battery cells must be positive')
  }

  // 单电机悬停推力 (N)
  const thrustPerMotor = (input.totalWeightKg * G) / 4

  // 桨盘直径 (m)
  const propDiameterM = input.propDiameterIn * INCH_TO_METER

  // 桨盘面积 (m²)
  const diskArea = Math.PI * (propDiameterM / 2) ** 2

  // 诱导速度 (m/s) —— 理想动量理论
  const inducedVelocity = Math.sqrt(thrustPerMotor / (2 * AIR_DENSITY * diskArea))

  // 单电机功率 (W) —— 包含效率损失
  const powerPerMotor = (thrustPerMotor * inducedVelocity) / input.motorEfficiency

  // 总功率 (W)
  const totalPower = 4 * powerPerMotor

  // 电池标称电压 (V)
  const batteryVoltage = input.batteryCells * CELL_VOLTAGE_NOMINAL

  // 总电流 (A)
  const totalCurrent = totalPower / batteryVoltage

  // 悬停时间 (分钟)
  // 综合损耗系数：考虑电调损耗、线损、电池内阻、非理想效率等
  const SYSTEM_LOSS_FACTOR = 0.7
  const batteryCapacityAh = input.batteryCapacityMah / 1000
  const hoverTimeMin = (batteryCapacityAh / totalCurrent) * 60 * SYSTEM_LOSS_FACTOR

  return {
    hoverTimeMin: Math.round(hoverTimeMin * 10) / 10,
    currentA: Math.round(totalCurrent * 10) / 10,
  }
}
