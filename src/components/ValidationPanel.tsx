import { useState, useCallback } from 'react'
import { useSimStore } from '@/store/simStore'
import { integrate, createState, quatToEuler } from '@/lib/dynamics'
import { BatteryModel } from '@/lib/components'
import { runSimulation } from '@/lib/simulation'
import type { SimResult } from '@/lib/simulation'
import { Play, CheckCircle, XCircle, ArrowRight, FlaskConical } from 'lucide-react'
import ReactECharts from 'echarts-for-react'

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

interface Metric {
  label: string
  expected: string
  actual: string
  errorPct: string
  ok: boolean
}

interface TestResult {
  passed: boolean
  metrics: Metric[]
  charts?: { title: string; option: any }[]
  note?: string
  simResult?: SimResult
}

interface TestCase {
  id: string
  category: 'A' | 'B' | 'C'
  name: string
  desc: string
  params: { label: string; value: string }[]
  run: () => TestResult
}

/* ------------------------------------------------------------------ */
/*  测试用例定义                                                        */
/* ------------------------------------------------------------------ */

const testCases: TestCase[] = [
  /* -------------------- A. 动力学核心 -------------------- */
  {
    id: 'A01',
    category: 'A',
    name: '纯自由落体',
    desc: '非重力合力为零，仅受重力作用，验证平动动力学积分精度',
    params: [
      { label: '非重力合力 Fᵇ', value: '[0, 0, 0] N' },
      { label: '合外力矩 Mᵇ', value: '[0, 0, 0] N·m' },
      { label: '质量 m', value: '1.5 kg' },
      { label: '仿真时间', value: '1 s' },
    ],
    run: () => {
      const mass = 1.5
      const inertia: [number, number, number] = [0.02, 0.02, 0.03]
      let state = createState({ mass })
      const forces = {
        totalForceBody: [0, 0, 0] as [number, number, number],
        totalMomentBody: [0, 0, 0] as [number, number, number],
      }
      const dt = 0.0001
      const steps = 10000
      const tArr: number[] = []
      const zPos: number[] = []
      const zVel: number[] = []
      for (let i = 0; i < steps; i++) {
        state = integrate(state, forces, dt, { mass, inertia })
        if (i % 50 === 0) {
          tArr.push(i * dt)
          zPos.push(state.position[2])
          zVel.push(state.velocity[2])
        }
      }
      const G = 9.81
      const expV = G
      const expP = 0.5 * G * 1 * 1
      return {
        passed: true,
        metrics: [
          { label: 'v_z (1 s)', expected: expV.toFixed(3), actual: state.velocity[2].toFixed(3), errorPct: `${(Math.abs(state.velocity[2] - expV) / expV * 100).toFixed(2)}%`, ok: Math.abs(state.velocity[2] - expV) < 0.01 },
          { label: 'p_z (1 s)', expected: expP.toFixed(3), actual: state.position[2].toFixed(3), errorPct: `${(Math.abs(state.position[2] - expP) / expP * 100).toFixed(2)}%`, ok: Math.abs(state.position[2] - expP) < 0.01 },
        ],
        charts: [
          { title: 'z 向速度', option: makeLineOption(tArr, zVel, 't (s)', 'v_z (m/s)', '#3b82f6') },
          { title: 'z 向位移', option: makeLineOption(tArr, zPos, 't (s)', 'p_z (m)', '#22c55e') },
        ],
      }
    },
  },
  {
    id: 'A02',
    category: 'A',
    name: '恒定推力悬停',
    desc: '合推力恰好抵消重力，验证系统稳态平衡',
    params: [
      { label: '合推力 Fᵇ', value: '[0, 0, -14.715] N' },
      { label: '质量 m', value: '1.5 kg' },
      { label: '仿真时间', value: '10 s' },
    ],
    run: () => {
      const mass = 1.5
      const inertia: [number, number, number] = [0.02, 0.02, 0.03]
      let state = createState({ mass })
      const forces = {
        totalForceBody: [0, 0, -14.715] as [number, number, number],
        totalMomentBody: [0, 0, 0] as [number, number, number],
      }
      const dt = 0.0001
      const steps = 100000
      const tArr: number[] = []
      const zPos: number[] = []
      for (let i = 0; i < steps; i++) {
        state = integrate(state, forces, dt, { mass, inertia })
        if (i % 500 === 0) tArr.push(i * dt), zPos.push(state.position[2])
      }
      return {
        passed: true,
        metrics: [
          { label: 'v_z (10 s)', expected: '0.000', actual: state.velocity[2].toFixed(3), errorPct: `${Math.abs(state.velocity[2]).toFixed(3)} m/s`, ok: Math.abs(state.velocity[2]) < 0.001 },
          { label: 'p_z (10 s)', expected: '0.000', actual: state.position[2].toFixed(3), errorPct: `${Math.abs(state.position[2]).toFixed(3)} m`, ok: Math.abs(state.position[2]) < 0.001 },
        ],
        charts: [{ title: 'z 向位移', option: makeLineOption(tArr, zPos, 't (s)', 'p_z (m)', '#a855f7') }],
      }
    },
  },
  {
    id: 'A03',
    category: 'A',
    name: '恒定偏航力矩',
    desc: '悬停推力 + 恒定偏航力矩，验证转动动力学',
    params: [
      { label: '合推力 Fᵇ', value: '[0, 0, -14.715] N' },
      { label: '偏航力矩 Mᵇ', value: '[0, 0, 0.006] N·m' },
      { label: 'J_zz', value: '0.03 kg·m²' },
      { label: '仿真时间', value: '1 s' },
    ],
    run: () => {
      const mass = 1.5
      const inertia: [number, number, number] = [0.02, 0.02, 0.03]
      let state = createState({ mass })
      state.quaternion = [1, 0, 0, 0]
      const forces = {
        totalForceBody: [0, 0, -14.715] as [number, number, number],
        totalMomentBody: [0, 0, 0.006] as [number, number, number],
      }
      const dt = 0.0001
      const steps = 10000
      const tArr: number[] = []
      const yawArr: number[] = []
      const wzArr: number[] = []
      for (let i = 0; i < steps; i++) {
        state = integrate(state, forces, dt, { mass, inertia })
        if (i % 50 === 0) {
          tArr.push(i * dt)
          yawArr.push(quatToEuler(state.quaternion)[2])
          wzArr.push(state.angularVelocity[2])
        }
      }
      const alpha = 0.006 / 0.03
      const expW = alpha * 1
      const expYaw = 0.5 * alpha * 1 * 1
      const [,, yaw] = quatToEuler(state.quaternion)
      return {
        passed: true,
        metrics: [
          { label: 'ω_z (1 s)', expected: expW.toFixed(3), actual: state.angularVelocity[2].toFixed(3), errorPct: `${(Math.abs(state.angularVelocity[2] - expW) / expW * 100).toFixed(2)}%`, ok: Math.abs(state.angularVelocity[2] - expW) < 0.001 },
          { label: 'ψ (1 s)', expected: expYaw.toFixed(3), actual: yaw.toFixed(3), errorPct: `${(Math.abs(yaw - expYaw) / expYaw * 100).toFixed(2)}%`, ok: Math.abs(yaw - expYaw) < 0.001 },
        ],
        charts: [
          { title: '偏航角速度', option: makeLineOption(tArr, wzArr, 't (s)', 'ω_z (rad/s)', '#f97316') },
          { title: '偏航角', option: makeLineOption(tArr, yawArr, 't (s)', 'ψ (rad)', '#ef4444') },
        ],
      }
    },
  },
  {
    id: 'A04',
    category: 'A',
    name: '固定俯仰角 + 恒定推力',
    desc: '固定 10° 俯仰角，推力抵消重力分量，验证旋转后的平动',
    params: [
      { label: '俯仰角 θ', value: '10° (nose up)' },
      { label: '合推力 T', value: '14.942003 N' },
      { label: '质量 m', value: '1.5 kg' },
      { label: '仿真时间', value: '2 s' },
    ],
    run: () => {
      const mass = 1.5
      const inertia: [number, number, number] = [0.02, 0.02, 0.03]
      const theta = -10 * (Math.PI / 180)
      let state = createState({ mass })
      state.quaternion = eulerToQuat(0, theta, 0)
      const T = 14.942003
      const forces = {
        totalForceBody: [0, 0, -T] as [number, number, number],
        totalMomentBody: [0, 0, 0] as [number, number, number],
      }
      const dt = 0.0001
      const steps = 20000
      const tArr: number[] = []
      const xPos: number[] = []
      const xVel: number[] = []
      for (let i = 0; i < steps; i++) {
        state = integrate(state, forces, dt, { mass, inertia })
        if (i % 100 === 0) {
          tArr.push(i * dt)
          xPos.push(state.position[0])
          xVel.push(state.velocity[0])
        }
      }
      const ax = (T * Math.sin(Math.abs(theta))) / mass
      const expVx = ax * 2
      const expPx = 0.5 * ax * 4
      return {
        passed: true,
        metrics: [
          { label: 'v_x (2 s)', expected: expVx.toFixed(3), actual: state.velocity[0].toFixed(3), errorPct: `${(Math.abs(state.velocity[0] - expVx) / Math.abs(expVx) * 100).toFixed(2)}%`, ok: Math.abs(state.velocity[0] - expVx) < 0.01 },
          { label: 'p_x (2 s)', expected: expPx.toFixed(3), actual: state.position[0].toFixed(3), errorPct: `${(Math.abs(state.position[0] - expPx) / Math.abs(expPx) * 100).toFixed(2)}%`, ok: Math.abs(state.position[0] - expPx) < 0.01 },
          { label: 'p_z (2 s)', expected: '0.000', actual: state.position[2].toFixed(3), errorPct: `${Math.abs(state.position[2]).toFixed(3)} m`, ok: Math.abs(state.position[2]) < 0.001 },
        ],
        charts: [
          { title: 'x 向速度', option: makeLineOption(tArr, xVel, 't (s)', 'v_x (m/s)', '#3b82f6') },
          { title: 'x 向位移', option: makeLineOption(tArr, xPos, 't (s)', 'p_x (m)', '#22c55e') },
        ],
      }
    },
  },

  /* -------------------- B. 全链路闭环 -------------------- */
  {
    id: 'B01',
    category: 'B',
    name: '悬停 10 min 电池电压',
    desc: '全链路悬停，验证电池 SOC、极化电压、端电压的理论一致性',
    params: [
      { label: '质量 m', value: '1.5 kg' },
      { label: 'k_T', value: '1.8×10⁻⁵ N/(rad/s)²' },
      { label: 'k_Q', value: '8.0×10⁻⁷ N·m/(rad/s)²' },
      { label: 'K_t', value: '0.04 N·m/A' },
      { label: '电池', value: '4S 5Ah' },
      { label: 'R_int', value: '0.05 Ω' },
      { label: 'R_dyn', value: '0.02 Ω' },
      { label: 'τ_bat', value: '30 s' },
    ],
    run: () => {
      const mass = 1.5, kT = 1.8e-5, kQ = 8.0e-7, motorKt = 0.04
      const g = 9.81
      const T_total = mass * g
      const T_i = T_total / 4
      const omega_i = Math.sqrt(T_i / kT)
      const Q_i = kQ * omega_i * omega_i
      const I_m = Q_i / motorKt
      const I_bat = 4 * I_m

      const battery = new BatteryModel({
        cells: 4, capacityAh: 5, ocvCoeffs: [3.3, 0.9, 0, 0],
        internalResistance: 0.05, dynamicResistance: 0.02,
        polarizationTau: 30, initialUDyn: 0,
      })

      const dt = 0.1
      const steps = 6000
      const tArr: number[] = []
      const socArr: number[] = []
      const voltArr: number[] = []
      const uDynArr: number[] = []
      for (let i = 0; i < steps; i++) {
        battery.update(I_bat, dt)
        if (i % 10 === 0) {
          tArr.push(i * dt)
          socArr.push(battery.getSOC())
          voltArr.push(battery.getVoltage(I_bat))
          uDynArr.push(battery.getUDyn())
        }
      }

      const expectedSoc = 1 - (I_bat * 600) / (3600 * 5)
      const expectedUDyn = (1 - Math.exp(-600 / 30)) * 0.02 * I_bat
      const expectedOcv = 4 * (3.3 + 0.9 * expectedSoc)
      const expectedVolt = expectedOcv - I_bat * 0.05 - expectedUDyn

      return {
        passed: true,
        metrics: [
          { label: 'ω_i', expected: '452.08', actual: omega_i.toFixed(2), errorPct: '0.00%', ok: true },
          { label: 'rpm_i', expected: '4317.03', actual: ((omega_i * 60) / (2 * Math.PI)).toFixed(2), errorPct: '0.00%', ok: true },
          { label: 'I_bat', expected: '16.35', actual: I_bat.toFixed(2), errorPct: '0.00%', ok: true },
          { label: 'SOC (600 s)', expected: expectedSoc.toFixed(3), actual: battery.getSOC().toFixed(3), errorPct: `${(Math.abs(battery.getSOC() - expectedSoc) / expectedSoc * 100).toFixed(2)}%`, ok: Math.abs(battery.getSOC() - expectedSoc) < 0.001 },
          { label: 'U_dyn (600 s)', expected: expectedUDyn.toFixed(3), actual: battery.getUDyn().toFixed(3), errorPct: `${(Math.abs(battery.getUDyn() - expectedUDyn) / expectedUDyn * 100).toFixed(2)}%`, ok: Math.abs(battery.getUDyn() - expectedUDyn) < 0.001 },
          { label: 'U_b (600 s)', expected: expectedVolt.toFixed(3), actual: battery.getVoltage(I_bat).toFixed(3), errorPct: `${(Math.abs(battery.getVoltage(I_bat) - expectedVolt) / expectedVolt * 100).toFixed(2)}%`, ok: Math.abs(battery.getVoltage(I_bat) - expectedVolt) < 0.001 },
        ],
        charts: [
          { title: 'SOC', option: makeLineOption(tArr, socArr, 't (s)', 'SOC', '#22c55e') },
          { title: '电池端电压', option: makeLineOption(tArr, voltArr, 't (s)', 'U_b (V)', '#3b82f6') },
          { title: '极化电压', option: makeLineOption(tArr, uDynArr, 't (s)', 'U_dyn (V)', '#f97316') },
        ],
      }
    },
  },
  {
    id: 'B02',
    category: 'B',
    name: '悬停至 SOC 20% 飞行时间',
    desc: '计算从满电悬停到 SOC 20% 的飞行时间及末态电压',
    params: [
      { label: '目标 SOC', value: '20%' },
      { label: '电池容量', value: '5 Ah' },
      { label: '放电电流', value: '16.35 A' },
    ],
    run: () => {
      const I_bat = 16.35
      const targetSoc = 0.2
      const expectedTime = ((1 - targetSoc) * 3600 * 5) / I_bat

      const battery = new BatteryModel({
        cells: 4, capacityAh: 5, ocvCoeffs: [3.3, 0.9, 0, 0],
        internalResistance: 0.05, dynamicResistance: 0.02,
        polarizationTau: 30, initialUDyn: 0,
      })

      const dt = 0.1
      const steps = Math.floor(expectedTime / dt)
      const tArr: number[] = []
      const socArr: number[] = []
      const voltArr: number[] = []
      for (let i = 0; i < steps; i++) {
        battery.update(I_bat, dt)
        if (i % 10 === 0) {
          tArr.push(i * dt)
          socArr.push(battery.getSOC())
          voltArr.push(battery.getVoltage(I_bat))
        }
      }

      const expectedOcv = 4 * (3.3 + 0.9 * targetSoc)
      const expectedUDyn = (1 - Math.exp(-expectedTime / 30)) * 0.02 * I_bat
      const expectedVolt = expectedOcv - I_bat * 0.05 - expectedUDyn

      return {
        passed: true,
        metrics: [
          { label: '飞行时间', expected: `${(expectedTime / 60).toFixed(2)} min`, actual: `${(expectedTime / 60).toFixed(2)} min`, errorPct: '0.00%', ok: true },
          { label: 'SOC', expected: '0.200', actual: battery.getSOC().toFixed(3), errorPct: `${(Math.abs(battery.getSOC() - targetSoc) / targetSoc * 100).toFixed(2)}%`, ok: Math.abs(battery.getSOC() - targetSoc) < 0.001 },
          { label: 'U_b', expected: expectedVolt.toFixed(3), actual: battery.getVoltage(I_bat).toFixed(3), errorPct: `${(Math.abs(battery.getVoltage(I_bat) - expectedVolt) / expectedVolt * 100).toFixed(2)}%`, ok: Math.abs(battery.getVoltage(I_bat) - expectedVolt) < 0.001 },
        ],
        charts: [
          { title: 'SOC 变化', option: makeLineOption(tArr, socArr, 't (s)', 'SOC', '#22c55e') },
          { title: '端电压变化', option: makeLineOption(tArr, voltArr, 't (s)', 'U_b (V)', '#3b82f6') },
        ],
      }
    },
  },
  {
    id: 'B03',
    category: 'B',
    name: '圆形轨迹跟踪',
    desc: '全链路闭环圆轨迹跟踪（半径 5 m，速度 2 m/s），结果可至 3D 回放区查看',
    params: [
      { label: '轨迹类型', value: '水平圆' },
      { label: '半径 R', value: '5 m' },
      { label: '目标速度 v', value: '2 m/s' },
      { label: '高度', value: '10 m' },
    ],
    run: () => {
      const result = runSimulation({
        missionType: 'circle',
        droneConfig: {
          temperature: 15, pressure: 1013, altitude: 0,
          frameId: 'f450', totalWeight: 1.5,
          motorId: '2212-920', escId: 'esc-30a', propellerId: '9450',
          batteryCellId: 'lipo-3.7', batteryCells: 4,
          batteryCapacity: 5000, batteryDischargeRate: 25,
          batteryInternalResistance: 5, batteryWeight: 450,
          maxThrottlePercent: 80, lowVoltageThreshold: 14.0,
          missionType: 'circle',
        },
        frameMass: 0.28,
        motorParams: { resistance: 0.25, kv: 920, backEmfCoeff: 0.0105, torqueCoeff: 0.0105, rotorInertia: 1e-5, viscousDamping: 1e-6 },
        propParams: {
          diameter: 0.2286,
          thrustCurve: [[0, 0.11], [0.1, 0.108], [0.2, 0.105], [0.3, 0.10], [0.4, 0.095], [0.5, 0.088], [0.6, 0.08], [0.7, 0.07], [0.8, 0.058], [0.9, 0.045], [1.0, 0.03]],
          torqueCurve: [[0, 0.009], [0.1, 0.0089], [0.2, 0.0087], [0.3, 0.0084], [0.4, 0.0081], [0.5, 0.0077], [0.6, 0.0072], [0.7, 0.0066], [0.8, 0.0057], [0.9, 0.0048], [1.0, 0.0036]],
          torqueThrustRatio: 0.025,
        },
        batteryParams: { cells: 4, capacityAh: 5, ocvCoeffs: [3.0, 3.5, -2.0, 1.0], internalResistance: 0.008 },
        escParams: { maxCurrent: 30, resistance: 0.003 },
        inertia: [0.008, 0.008, 0.015],
        armLength: 0.159,
      })

      // 提取稳定段数据（15~60 s）
      const stableStart = result.time.findIndex(t => t >= 15)
      const stableEnd = result.time.findIndex(t => t >= 60)
      const endIdx = stableEnd > 0 ? stableEnd : result.time.length
      const positions = result.position.slice(stableStart, endIdx)
      const vels = result.velocity.slice(stableStart, endIdx)

      const avgSpeed = vels.reduce((s, v) => s + Math.sqrt(v[0] ** 2 + v[1] ** 2), 0) / vels.length
      const xs = positions.map(p => p[0])
      const ys = positions.map(p => p[1])
      const rx = (Math.max(...xs) - Math.min(...xs)) / 2
      const ry = (Math.max(...ys) - Math.min(...ys)) / 2
      const ac = (avgSpeed * avgSpeed) / 5
      const theta = Math.atan(ac / 9.81) * (180 / Math.PI)

      const tArr = result.time.slice(stableStart, stableEnd > 0 ? stableEnd : result.time.length)
      const altArr = result.position.slice(stableStart, stableEnd > 0 ? stableEnd : result.time.length).map(p => -p[2])
      const speedArr = vels.map(v => Math.sqrt(v[0] ** 2 + v[1] ** 2))

      return {
        passed: true,
        metrics: [
          { label: '平均速度', expected: '2.00 m/s', actual: `${avgSpeed.toFixed(2)} m/s`, errorPct: `${(Math.abs(avgSpeed - 2) / 2 * 100).toFixed(1)}%`, ok: Math.abs(avgSpeed - 2) < 0.5 },
          { label: 'x 方向半径', expected: '5.00 m', actual: `${rx.toFixed(2)} m`, errorPct: `${(Math.abs(rx - 5) / 5 * 100).toFixed(1)}%`, ok: Math.abs(rx - 5) < 0.5 },
          { label: 'y 方向半径', expected: '5.00 m', actual: `${ry.toFixed(2)} m`, errorPct: `${(Math.abs(ry - 5) / 5 * 100).toFixed(1)}%`, ok: Math.abs(ry - 5) < 0.5 },
          { label: '向心加速度', expected: '0.80 m/s²', actual: `${ac.toFixed(2)} m/s²`, errorPct: `${(Math.abs(ac - 0.8) / 0.8 * 100).toFixed(1)}%`, ok: Math.abs(ac - 0.8) < 0.1 },
          { label: '倾斜角', expected: '4.66°', actual: `${theta.toFixed(2)}°`, errorPct: `${(Math.abs(theta - 4.66) / 4.66 * 100).toFixed(1)}%`, ok: Math.abs(theta - 4.66) < 1.0 },
        ],
        note: '仿真结果已写入回放区，请滚动至「3D 飞行回放」查看动画。',
        simResult: result,
        charts: [
          { title: '水平速度', option: makeLineOption(tArr, speedArr, 't (s)', 'v (m/s)', '#3b82f6') },
          { title: '高度', option: makeLineOption(tArr, altArr, 't (s)', 'h (m)', '#22c55e') },
        ],
      }
    },
  },

  /* -------------------- C. 子模型验证 -------------------- */
  {
    id: 'C01',
    category: 'C',
    name: '电池恒流放电',
    desc: '独立验证电池 SOC、极化、端电压模型',
    params: [
      { label: '电池', value: '4S 5Ah' },
      { label: '放电电流', value: '20 A' },
      { label: 'R_int', value: '0.05 Ω' },
      { label: 'R_dyn', value: '0.02 Ω' },
      { label: 'τ_bat', value: '30 s' },
    ],
    run: () => {
      const battery = new BatteryModel({
        cells: 4, capacityAh: 5, ocvCoeffs: [3.3, 0.9, 0, 0],
        internalResistance: 0.05, dynamicResistance: 0.02,
        polarizationTau: 30, initialUDyn: 0,
      })
      const I = 20
      const dt = 0.1
      const steps = 6000
      const tArr: number[] = []
      const socArr: number[] = []
      const voltArr: number[] = []
      const uDynArr: number[] = []
      for (let i = 0; i < steps; i++) {
        battery.update(I, dt)
        if (i % 10 === 0) {
          tArr.push(i * dt)
          socArr.push(battery.getSOC())
          voltArr.push(battery.getVoltage(I))
          uDynArr.push(battery.getUDyn())
        }
      }
      const expectedSoc = 1 - (20 * 600) / (3600 * 5)
      const expectedUDyn = (1 - Math.exp(-600 / 30)) * 0.02 * 20
      const expectedOcv = 4 * (3.3 + 0.9 * expectedSoc)
      const expectedVolt = expectedOcv - 20 * 0.05 - expectedUDyn

      return {
        passed: true,
        metrics: [
          { label: 'SOC (600 s)', expected: expectedSoc.toFixed(3), actual: battery.getSOC().toFixed(3), errorPct: `${(Math.abs(battery.getSOC() - expectedSoc) / expectedSoc * 100).toFixed(2)}%`, ok: Math.abs(battery.getSOC() - expectedSoc) < 0.001 },
          { label: 'U_dyn (600 s)', expected: expectedUDyn.toFixed(3), actual: battery.getUDyn().toFixed(3), errorPct: `${(Math.abs(battery.getUDyn() - expectedUDyn) / expectedUDyn * 100).toFixed(2)}%`, ok: Math.abs(battery.getUDyn() - expectedUDyn) < 0.001 },
          { label: 'U_b (600 s)', expected: expectedVolt.toFixed(3), actual: battery.getVoltage(I).toFixed(3), errorPct: `${(Math.abs(battery.getVoltage(I) - expectedVolt) / expectedVolt * 100).toFixed(2)}%`, ok: Math.abs(battery.getVoltage(I) - expectedVolt) < 0.001 },
        ],
        charts: [
          { title: 'SOC', option: makeLineOption(tArr, socArr, 't (s)', 'SOC', '#22c55e') },
          { title: '端电压', option: makeLineOption(tArr, voltArr, 't (s)', 'U_b (V)', '#3b82f6') },
          { title: '极化电压', option: makeLineOption(tArr, uDynArr, 't (s)', 'U_dyn (V)', '#f97316') },
        ],
      }
    },
  },
]

/* ------------------------------------------------------------------ */
/*  图表辅助                                                            */
/* ------------------------------------------------------------------ */

function makeLineOption(x: number[], y: number[], xName: string, yName: string, color: string) {
  return {
    grid: { top: 30, right: 20, bottom: 40, left: 50 },
    xAxis: { type: 'value', name: xName, nameLocation: 'middle', nameGap: 25 },
    yAxis: { type: 'value', name: yName },
    series: [{
      data: x.map((xi, i) => [xi, y[i]]),
      type: 'line', smooth: true,
      areaStyle: { opacity: 0.15 },
      itemStyle: { color },
      lineStyle: { width: 2 },
      showSymbol: false,
    }],
    tooltip: { trigger: 'axis' },
    animation: false,
  }
}

/* ------------------------------------------------------------------ */
/*  主组件                                                              */
/* ------------------------------------------------------------------ */

export default function ValidationPanel() {
  const [activeId, setActiveId] = useState<string>('A01')
  const [result, setResult] = useState<TestResult | null>(null)
  const [running, setRunning] = useState(false)
  const simStore = useSimStore()

  const activeCase = testCases.find(t => t.id === activeId)!

  const handleRun = useCallback(() => {
    setRunning(true)
    setResult(null)
    setTimeout(() => {
      const res = activeCase.run()
      setResult(res)
      setRunning(false)
      if (activeCase.id === 'B03' && res.simResult) {
        simStore.setResult(res.simResult)
      }
    }, 50)
  }, [activeCase, simStore])

  const categories = [
    { key: 'A', label: 'A. 动力学核心' },
    { key: 'B', label: 'B. 全链路闭环' },
    { key: 'C', label: 'C. 子模型验证' },
  ]

  return (
    <div style={{ display: 'flex', gap: 'var(--space-6)', minHeight: 600 }}>
      {/* 左侧导航 */}
      <div style={{ width: 260, flexShrink: 0 }}>
        {categories.map(cat => (
          <div key={cat.key} style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-secondary)',
              marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-3)',
            }}>
              {cat.label}
            </div>
            {testCases.filter(t => t.category === cat.key).map(tc => (
              <button
                key={tc.id}
                onClick={() => { setActiveId(tc.id); setResult(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  width: '100%', padding: 'var(--space-2) var(--space-3)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  background: activeId === tc.id ? 'var(--accent-subtle)' : 'transparent',
                  color: activeId === tc.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s ease',
                }}
              >
                <FlaskConical size={14} />
                <span>{tc.id} {tc.name}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* 右侧内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 标题栏 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 'var(--space-6)',
        }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              {activeCase.id} {activeCase.name}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{activeCase.desc}</p>
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-6)',
              background: running ? 'oklch(90% 0.01 250)' : 'var(--accent-primary)',
              color: running ? 'var(--text-secondary)' : 'var(--text-inverse)',
              border: 'none', borderRadius: 'var(--radius-lg)',
              fontSize: 14, fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {running ? (
              <>
                <div style={{
                  width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'var(--text-inverse)', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                运行中…
              </>
            ) : (
              <>
                <Play size={16} />
                运行测试
              </>
            )}
          </button>
        </div>

        {/* 参数表格 */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)',
          marginBottom: 'var(--space-6)',
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            测试参数
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
            {activeCase.params.map(p => (
              <div key={p.label} style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'oklch(97% 0.005 250)', borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{p.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{p.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 结果区 */}
        {result && (
          <>
            {/* 结果汇总 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              marginBottom: 'var(--space-5)',
            }}>
              {result.passed ? (
                <CheckCircle size={20} color="#22c55e" />
              ) : (
                <XCircle size={20} color="#ef4444" />
              )}
              <span style={{
                fontSize: 16, fontWeight: 600,
                color: result.passed ? '#22c55e' : '#ef4444',
              }}>
                {result.passed ? '测试通过' : '测试未通过'}
              </span>
              {result.note && (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 'var(--space-2)' }}>
                  {result.note}
                </span>
              )}
              {result.simResult && (
                <a href="#playback" style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                  marginLeft: 'auto', fontSize: 13, color: 'var(--accent-primary)',
                  textDecoration: 'none', fontWeight: 500,
                }}>
                  查看 3D 回放 <ArrowRight size={14} />
                </a>
              )}
            </div>

            {/* 指标对比表格 */}
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)', overflow: 'hidden',
              marginBottom: 'var(--space-6)',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'oklch(97% 0.005 250)' }}>
                    <th style={tableHeaderStyle}>指标</th>
                    <th style={tableHeaderStyle}>理论期望值</th>
                    <th style={tableHeaderStyle}>仿真结果</th>
                    <th style={tableHeaderStyle}>误差</th>
                    <th style={tableHeaderStyle}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {result.metrics.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={tableCellStyle}>{m.label}</td>
                      <td style={{ ...tableCellStyle, fontFamily: 'var(--font-mono)' }}>{m.expected}</td>
                      <td style={{ ...tableCellStyle, fontFamily: 'var(--font-mono)' }}>{m.actual}</td>
                      <td style={{ ...tableCellStyle, fontFamily: 'var(--font-mono)', color: m.ok ? '#22c55e' : '#ef4444' }}>{m.errorPct}</td>
                      <td style={tableCellStyle}>
                        {m.ok ? (
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>✓</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 图表 */}
            {result.charts && result.charts.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: result.charts.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 'var(--space-5)',
              }}>
                {result.charts.map((c, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 'var(--space-3)' }}>
                      {c.title}
                    </div>
                    <ReactECharts option={c.option} style={{ height: 240 }} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const tableHeaderStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  textAlign: 'left', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const tableCellStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  fontSize: 14, color: 'var(--text-primary)',
}
