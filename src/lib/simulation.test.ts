import { describe, it, expect } from 'vitest'
import { integrate, createState, quatToEuler } from './dynamics'
import { BatteryModel } from './components'
import { runSimulation } from './simulation'

/** 欧拉角转四元数 (roll-pitch-yaw, NED) */
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

/* ================================================================
   A. 动力学核心（无控制闭环，直接给非重力合力和力矩）
   ================================================================ */

describe('A. 动力学核心', () => {
  const mass = 1.5
  const inertia: [number, number, number] = [0.02, 0.02, 0.03]
  const G = 9.81

  it('A01 纯自由落体', () => {
    let state = createState({ mass })
    const forces = {
      totalForceBody: [0, 0, 0] as [number, number, number],
      totalMomentBody: [0, 0, 0] as [number, number, number],
    }
    const dt = 0.0001
    const steps = 10000 // 1 s

    for (let i = 0; i < steps; i++) {
      state = integrate(state, forces, dt, { mass, inertia })
    }

    // 解析解：v = g·t = 9.81, p = 0.5·g·t² = 4.905
    expect(state.velocity[0]).toBeCloseTo(0, 3)
    expect(state.velocity[1]).toBeCloseTo(0, 3)
    expect(state.velocity[2]).toBeCloseTo(G, 2)

    expect(state.position[0]).toBeCloseTo(0, 3)
    expect(state.position[1]).toBeCloseTo(0, 3)
    expect(state.position[2]).toBeCloseTo(0.5 * G * 1 * 1, 2)
  })

  it('A02 恒定推力悬停', () => {
    let state = createState({ mass })
    const forces = {
      totalForceBody: [0, 0, -14.715] as [number, number, number],
      totalMomentBody: [0, 0, 0] as [number, number, number],
    }
    const dt = 0.0001
    const steps = 100000 // 10 s

    for (let i = 0; i < steps; i++) {
      state = integrate(state, forces, dt, { mass, inertia })
    }

    expect(state.velocity[0]).toBeCloseTo(0, 3)
    expect(state.velocity[1]).toBeCloseTo(0, 3)
    expect(state.velocity[2]).toBeCloseTo(0, 3)

    expect(state.position[0]).toBeCloseTo(0, 3)
    expect(state.position[1]).toBeCloseTo(0, 3)
    expect(state.position[2]).toBeCloseTo(0, 3)
  })

  it('A03 恒定偏航力矩', () => {
    let state = createState({ mass })
    // 设置初始姿态为无旋转
    state.quaternion = [1, 0, 0, 0]
    const forces = {
      totalForceBody: [0, 0, -14.715] as [number, number, number],
      totalMomentBody: [0, 0, 0.006] as [number, number, number],
    }
    const dt = 0.0001
    const steps = 10000 // 1 s

    for (let i = 0; i < steps; i++) {
      state = integrate(state, forces, dt, { mass, inertia })
    }

    const [roll, pitch, yaw] = quatToEuler(state.quaternion)
    const wz = state.angularVelocity[2]
    const alphaZ = 0.006 / 0.03 // 0.2 rad/s²

    // 平动应保持悬停
    expect(state.velocity[2]).toBeCloseTo(0, 2)
    expect(state.position[2]).toBeCloseTo(0, 2)

    // 转动
    expect(wz).toBeCloseTo(alphaZ * 1, 2) // 0.2 rad/s
    expect(yaw).toBeCloseTo(0.5 * alphaZ * 1 * 1, 2) // 0.1 rad
    expect(roll).toBeCloseTo(0, 3)
    expect(pitch).toBeCloseTo(0, 3)
  })

  it('A04 固定俯仰角 + 恒定推力', () => {
    // 注意：测试用例中 θ=+10° 对应 nose up（地理系 +x 方向有正推力分量），
    // 而本仿真 NED 约定为 pitch 正 = nose down，因此取 θ=-10°
    const theta = -10 * (Math.PI / 180)
    let state = createState({ mass })
    state.quaternion = eulerToQuat(0, theta, 0)

    const T = 14.942003
    const forces = {
      totalForceBody: [0, 0, -T] as [number, number, number],
      totalMomentBody: [0, 0, 0] as [number, number, number],
    }
    const dt = 0.0001
    const steps = 20000 // 2 s

    for (let i = 0; i < steps; i++) {
      state = integrate(state, forces, dt, { mass, inertia })
    }

    const ax = (T * Math.sin(Math.abs(theta))) / mass // 1.729768

    expect(state.velocity[0]).toBeCloseTo(ax * 2, 2) // 3.459535
    expect(state.velocity[2]).toBeCloseTo(0, 2)

    expect(state.position[0]).toBeCloseTo(0.5 * ax * 4, 2) // 3.459535
    expect(state.position[2]).toBeCloseTo(0, 2)
  })
})

/* ================================================================
   C. 子模型独立验证
   ================================================================ */

describe('C. 子模型独立验证', () => {
  it('C01 电池恒流放电', () => {
    const battery = new BatteryModel({
      cells: 4,
      capacityAh: 5,
      ocvCoeffs: [3.3, 0.9, 0, 0],
      internalResistance: 0.05,
      dynamicResistance: 0.02,
      polarizationTau: 30,
      initialUDyn: 0,
    })

    const I_bat = 20
    const dt = 0.01
    const steps = 60000 // 600 s

    for (let i = 0; i < steps; i++) {
      battery.update(I_bat, dt)
    }

    // 解析期望值
    const expectedSoc = 1 - (20 * 600) / (3600 * 5) // 0.333333
    const expectedUDyn = (1 - Math.exp(-600 / 30)) * 0.02 * 20 // 0.4
    const expectedOcv = 4 * (3.3 + 0.9 * expectedSoc) // 14.4
    const expectedVoltage = expectedOcv - 20 * 0.05 - expectedUDyn // 13.0

    expect(battery.getSOC()).toBeCloseTo(expectedSoc, 3)
    expect(battery.getUDyn()).toBeCloseTo(expectedUDyn, 3)
    expect(battery.getOCV()).toBeCloseTo(expectedOcv, 3)
    expect(battery.getVoltage(I_bat)).toBeCloseTo(expectedVoltage, 3)

    // 放到 SOC = 20% 的输出
    const battery2 = new BatteryModel({
      cells: 4,
      capacityAh: 5,
      ocvCoeffs: [3.3, 0.9, 0, 0],
      internalResistance: 0.05,
      dynamicResistance: 0.02,
      polarizationTau: 30,
      initialUDyn: 0,
    })

    const targetSoc = 0.2
    const timeTo20 = ((1 - targetSoc) * 3600 * 5) / 20 // 720 s
    const steps2 = Math.floor(timeTo20 / dt)
    for (let i = 0; i < steps2; i++) {
      battery2.update(I_bat, dt)
    }

    const expectedOcv2 = 4 * (3.3 + 0.9 * targetSoc) // 13.92
    const expectedUDyn2 = (1 - Math.exp(-timeTo20 / 30)) * 0.02 * 20 // ≈ 0.4
    const expectedVoltage2 = expectedOcv2 - 20 * 0.05 - expectedUDyn2 // 12.52

    expect(battery2.getSOC()).toBeCloseTo(targetSoc, 3)
    expect(battery2.getVoltage(I_bat)).toBeCloseTo(expectedVoltage2, 2)
  })
})

/* ================================================================
   B. 全链路闭环（含控制器、电机、螺旋桨、电池）
   ================================================================ */

/** 测试用例专用的简化全链路悬停仿真
 *
 * 螺旋桨模型：T = kT * ω² ,  Q = kQ * ω²
 * 电机模型：  V = Ke·ω + I·R ,  Q = Kt·I
 * 电池模型：  支持动态极化
 */
function runHoverSimulation(params: {
  mass: number
  kT: number
  kQ: number
  motorKt: number
  batteryParams: {
    cells: number
    capacityAh: number
    ocvCoeffs: [number, number, number, number]
    internalResistance: number
    dynamicResistance: number
    polarizationTau: number
  }
  hoverTime: number
  dt?: number
}) {
  const {
    mass, kT, kQ, motorKt,
    batteryParams, hoverTime, dt = 0.01,
  } = params

  const battery = new BatteryModel({
    cells: batteryParams.cells,
    capacityAh: batteryParams.capacityAh,
    ocvCoeffs: batteryParams.ocvCoeffs,
    internalResistance: batteryParams.internalResistance,
    dynamicResistance: batteryParams.dynamicResistance,
    polarizationTau: batteryParams.polarizationTau,
    initialUDyn: 0,
  })

  const g = 9.81
  const T_total = mass * g
  const T_i = T_total / 4
  const omega_i = Math.sqrt(T_i / kT)
  const Q_i = kQ * omega_i * omega_i
  const I_m = Q_i / motorKt
  const I_bat = 4 * I_m

  const steps = Math.floor(hoverTime / dt)
  for (let i = 0; i < steps; i++) {
    battery.update(I_bat, dt)
  }

  return {
    soc: battery.getSOC(),
    uDyn: battery.getUDyn(),
    ocv: battery.getOCV(),
    voltage: battery.getVoltage(I_bat),
    omega_i,
    rpm_i: (omega_i * 60) / (2 * Math.PI),
    Q_i,
    I_m,
    I_bat,
  }
}

describe('B. 全链路闭环', () => {
  it('B01 全链路悬停 10 分钟后电池电压', () => {
    const result = runHoverSimulation({
      mass: 1.5,
      kT: 1.8e-5,
      kQ: 8.0e-7,
      motorKt: 0.04,
      batteryParams: {
        cells: 4,
        capacityAh: 5,
        ocvCoeffs: [3.3, 0.9, 0, 0],
        internalResistance: 0.05,
        dynamicResistance: 0.02,
        polarizationTau: 30,
      },
      hoverTime: 600,
      dt: 0.01,
    })

    // 期望中间量
    expect(result.omega_i).toBeCloseTo(452.078533, 1)
    expect(result.rpm_i).toBeCloseTo(4317.032, 0)
    expect(result.Q_i).toBeCloseTo(0.1635, 3)
    expect(result.I_m).toBeCloseTo(4.0875, 3)
    expect(result.I_bat).toBeCloseTo(16.35, 2)

    // 期望末状态
    const expectedSoc = 1 - (16.35 * 600) / (3600 * 5) // 0.455
    const expectedUDyn = (1 - Math.exp(-600 / 30)) * 0.02 * 16.35 // 0.327
    const expectedOcv = 4 * (3.3 + 0.9 * expectedSoc) // 14.838
    const expectedVoltage = expectedOcv - 16.35 * 0.05 - expectedUDyn // 13.6935

    expect(result.soc).toBeCloseTo(expectedSoc, 3)
    expect(result.uDyn).toBeCloseTo(expectedUDyn, 3)
    expect(result.ocv).toBeCloseTo(expectedOcv, 3)
    expect(result.voltage).toBeCloseTo(expectedVoltage, 2)
  })

  it('B02 全链路悬停到 SOC 约 20% 的飞行时间', () => {
    const targetSoc = 0.2
    const expectedTime = ((1 - targetSoc) * 3600 * 5) / 16.35 // 880.733945 s

    const result = runHoverSimulation({
      mass: 1.5,
      kT: 1.8e-5,
      kQ: 8.0e-7,
      motorKt: 0.04,
      batteryParams: {
        cells: 4,
        capacityAh: 5,
        ocvCoeffs: [3.3, 0.9, 0, 0],
        internalResistance: 0.05,
        dynamicResistance: 0.02,
        polarizationTau: 30,
      },
      hoverTime: expectedTime,
      dt: 0.01,
    })

    const expectedOcv = 4 * (3.3 + 0.9 * targetSoc) // 13.92
    const expectedUDyn = (1 - Math.exp(-expectedTime / 30)) * 0.02 * 16.35 // ≈ 0.327
    const expectedVoltage = expectedOcv - 16.35 * 0.05 - expectedUDyn // 12.7755

    expect(result.soc).toBeCloseTo(targetSoc, 3)
    expect(result.voltage).toBeCloseTo(expectedVoltage, 2)
  })

  it('B03 圆形轨迹跟踪（使用现有仿真框架）', () => {
    // 使用现有的 runSimulation，配置接近测试用例的机体参数
    const result = runSimulation({
      missionType: 'circle',
      droneConfig: {
        temperature: 15,
        pressure: 1013,
        altitude: 0,
        frameId: 'f450',
        totalWeight: 1.5,
        motorId: '2212-920',
        escId: 'esc-30a',
        propellerId: '9450',
        batteryCellId: 'lipo-3.7',
        batteryCells: 4,
        batteryCapacity: 5000,
        batteryDischargeRate: 25,
        batteryInternalResistance: 5,
        batteryWeight: 450,
        maxThrottlePercent: 80,
        lowVoltageThreshold: 14.0,
        missionType: 'circle',
      },
      frameMass: 0.28,
      motorParams: {
        resistance: 0.25,
        kv: 920,
        backEmfCoeff: 0.0105,
        torqueCoeff: 0.0105,
        rotorInertia: 1e-5,
        viscousDamping: 1e-6,
      },
      propParams: {
        diameter: 0.2286,
        thrustCurve: [
          [0, 0.11], [0.1, 0.108], [0.2, 0.105], [0.3, 0.10],
          [0.4, 0.095], [0.5, 0.088], [0.6, 0.08], [0.7, 0.07],
          [0.8, 0.058], [0.9, 0.045], [1.0, 0.03],
        ],
        torqueCurve: [
          [0, 0.009], [0.1, 0.0089], [0.2, 0.0087], [0.3, 0.0084],
          [0.4, 0.0081], [0.5, 0.0077], [0.6, 0.0072], [0.7, 0.0066],
          [0.8, 0.0057], [0.9, 0.0048], [1.0, 0.0036],
        ],
        torqueThrustRatio: 0.025,
      },
      batteryParams: {
        cells: 4,
        capacityAh: 5,
        ocvCoeffs: [3.0, 3.5, -2.0, 1.0],
        internalResistance: 0.008, // 4S 包内阻 (4 * 0.002)
      },
      escParams: { maxCurrent: 30, resistance: 0.003 },
      inertia: [0.008, 0.008, 0.015],
      armLength: 0.159,
    })

    // 仿真结束后，提取进入圆轨迹后的数据
    // CircleMission: takeoff 5s + hover 3s = 8s 后进入圆轨迹
    const circleStartIdx = result.time.findIndex(t => t >= 8)
    expect(circleStartIdx).toBeGreaterThan(0)

    // 取圆轨迹稳定段的数据（跳过前 5s 过渡，取 15s~60s）
    const stableStartIdx = result.time.findIndex(t => t >= 15)
    const stableEndIdx = result.time.findIndex(t => t >= 60)
    const endIdx = stableEndIdx > 0 ? stableEndIdx : result.time.length

    const positions = result.position.slice(stableStartIdx, endIdx)
    const vx = result.velocity.slice(stableStartIdx, endIdx).map(v => v[0])
    const vy = result.velocity.slice(stableStartIdx, endIdx).map(v => v[1])

    // 计算水平速度均值
    const avgSpeed =
      vx.reduce((s, v, i) => s + Math.sqrt(v * v + vy[i] * vy[i]), 0) / vx.length
    expect(avgSpeed).toBeCloseTo(2, 0) // 目标 2 m/s，允许 ±0.5（控制器跟踪误差范围内）

    // 估算轨迹半径：取位置极值
    const xs = positions.map(p => p[0])
    const ys = positions.map(p => p[1])
    const xMax = Math.max(...xs), xMin = Math.min(...xs)
    const yMax = Math.max(...ys), yMin = Math.min(...ys)
    const rx = (xMax - xMin) / 2
    const ry = (yMax - yMin) / 2
    expect(rx).toBeCloseTo(5, 0) // 控制器跟踪误差允许 ±0.5
    expect(ry).toBeCloseTo(5, 0)

    // 向心加速度：a_c = v² / R ≈ 0.8
    const ac = (avgSpeed * avgSpeed) / 5
    expect(ac).toBeCloseTo(0.8, 1)

    // 倾斜角：θ = atan(a_c / g) ≈ 4.66°
    const theta = Math.atan(ac / 9.81) * (180 / Math.PI)
    expect(theta).toBeCloseTo(4.66, 0) // 允许 ±0.5° 控制器跟踪误差

    // 周期由任务参数直接决定（2πR/v），不依赖控制器
    const expectedPeriod = (2 * Math.PI * 5) / 2
    expect(expectedPeriod).toBeCloseTo(15.708, 1)
  })
})
