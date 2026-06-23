import { defaultConfig } from '@/store/configStore'
import type { DroneConfig } from '@/store/configStore'
import type { SimConfig } from './simulation'
import { buildSimConfig } from './configBuilder'

export interface DronePreset {
  id: string
  name: string
  description: string
  config: Partial<DroneConfig>
}

/** 预定义整机配置 —— 一键填充所有部件参数 */
export const dronePresets: DronePreset[] = [
  {
    id: 'f450-standard',
    name: 'F450 标准版',
    description: 'DJI F450 机架 + 2212 920KV 电机 + 9450 桨',
    config: {
      frameId: 'f450',
      motorId: '2212-920',
      escId: 'esc-30a',
      propellerId: '9450',
      batteryCellId: 'lipo-3.7',
      batteryCells: 4,
      batteryCapacity: 5000,
      batteryWeight: 450,
      totalWeight: 1.5,
    },
  },
  {
    id: 'f450-pro',
    name: 'F450 增强版',
    description: 'DJI F450 机架 + 2212 1000KV 电机 + 1045 桨',
    config: {
      frameId: 'f450',
      motorId: '2212-1000',
      escId: 'esc-40a',
      propellerId: '1045',
      batteryCellId: 'lipo-3.7',
      batteryCells: 4,
      batteryCapacity: 5000,
      batteryWeight: 450,
      totalWeight: 1.6,
    },
  },
  {
    id: 'test-standard',
    name: '测试用标准机',
    description: '测试用例精确匹配配置：6S 8Ah 电池、Kt=Ke=0.02 电机、D=0.254 桨，参数与测试用例文档默认参数一致',
    config: {
      frameId: 'test-frame',
      motorId: 'test-motor',
      escId: 'test-esc',
      propellerId: 'test-prop',
      batteryCellId: 'test-battery',
      batteryCells: 6,
      batteryCapacity: 8000,
      batteryWeight: 450,
      totalWeight: 1.5,
      lowVoltageThreshold: 16.8,
      batteryInternalResistance: 0,
      missionType: 'test-hover',
      config: 'X',
    },
  },
]

export function getDronePresets(): DronePreset[] {
  return dronePresets
}

export function getPresetById(id: string): DronePreset | undefined {
  return dronePresets.find(p => p.id === id)
}

function normalize(v: [number, number, number]): [number, number, number] {
  const n = Math.hypot(v[0], v[1], v[2])
  return n > 0 ? [v[0] / n, v[1] / n, v[2] / n] : [1, 0, 0]
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function rotationMatrixToQuaternion(R: number[][]): [number, number, number, number] {
  const trace = R[0][0] + R[1][1] + R[2][2]
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2
    return [
      0.25 * s,
      (R[2][1] - R[1][2]) / s,
      (R[0][2] - R[2][0]) / s,
      (R[1][0] - R[0][1]) / s,
    ]
  }
  if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
    const s = Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]) * 2
    return [
      (R[2][1] - R[1][2]) / s,
      0.25 * s,
      (R[0][1] + R[1][0]) / s,
      (R[0][2] + R[2][0]) / s,
    ]
  }
  if (R[1][1] > R[2][2]) {
    const s = Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]) * 2
    return [
      (R[0][2] - R[2][0]) / s,
      (R[0][1] + R[1][0]) / s,
      0.25 * s,
      (R[1][2] + R[2][1]) / s,
    ]
  }
  const s = Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]) * 2
  return [
    (R[1][0] - R[0][1]) / s,
    (R[0][2] + R[2][0]) / s,
    (R[1][2] + R[2][1]) / s,
    0.25 * s,
  ]
}

function circleTrimQuaternion(speed: number, radius: number): [number, number, number, number] {
  const g = 9.81
  const desiredForce = [-speed * speed / radius, 0, -g] as [number, number, number]
  const bT = normalize(desiredForce)
  const bz = [-bT[0], -bT[1], -bT[2]] as [number, number, number]
  const bxRef = [1, 0, 0] as [number, number, number]
  const by = normalize(cross(bz, bxRef))
  const bx = normalize(cross(by, bz))
  return rotationMatrixToQuaternion([
    [bx[0], by[0], bz[0]],
    [bx[1], by[1], bz[1]],
    [bx[2], by[2], bz[2]],
  ])
}

const CIRCLE_INITIAL = {
  position: [5, 0, -5] as [number, number, number],
  velocity: [0, 2, 0] as [number, number, number],
  quaternion: circleTrimQuaternion(2, 5),
  angularVelocity: [0, 0, 0] as [number, number, number],
}

const DOC_HOVER_TRIM = {
  motorSpeeds: [452.078533, 452.078533, 452.078533, 452.078533] as [number, number, number, number],
  motorCurrents: [8.175, 8.175, 8.175, 8.175] as [number, number, number, number],
  dutyCycles: [0.410998, 0.410998, 0.410998, 0.410998] as [number, number, number, number],
}

/**
 * Build a SimConfig that exactly matches the default parameters in the
 * test-case document. This is the canonical configuration used by the
 * test-standard preset.
 */
export function buildDocAlignedSimConfig(
  missionType: SimConfig['missionType'] = 'test-hover'
): SimConfig {
  const preset = getPresetById('test-standard')!
  const droneConfig = { ...defaultConfig, ...preset.config, missionType } as DroneConfig
  const base = buildSimConfig(droneConfig)
  if (!base) {
    throw new Error('Failed to build doc-aligned SimConfig from test-standard preset')
  }

  if (missionType === 'test-hover' || missionType === 'hover') {
    return {
      ...base,
      missionParams: { targetAltitude: 5, takeoffDuration: 0 },
      initialState: {
        position: [0, 0, -5],
        velocity: [0, 0, 0],
        quaternion: [1, 0, 0, 0],
        angularVelocity: [0, 0, 0],
      },
      initialPropulsionState: DOC_HOVER_TRIM,
      // Allow the hover mission to run until the 20% SOC cutoff (~1491 s).
      maxSimTime: 2000,
    }
  }

  if (missionType === 'test-circle' || missionType === 'circle') {
    return {
      ...base,
      missionParams: { targetAltitude: 5, takeoffDuration: 0, hoverDuration: 0, radius: 5, speed: 2 },
      initialState: CIRCLE_INITIAL,
      maxSimTime: 1600,
    }
  }

  if (missionType === 'test-circle-7') {
    return {
      ...base,
      missionParams: { targetAltitude: 5, takeoffDuration: 0, hoverDuration: 0, radius: 5, speed: 7 },
      initialState: {
        position: [5, 0, -5],
        velocity: [0, 7, 0],
        quaternion: circleTrimQuaternion(7, 5),
        angularVelocity: [0, 0, 0],
      },
      maxSimTime: 1000,
    }
  }

  if (missionType === 'fullspeed') {
    return {
      ...base,
      missionParams: { targetAltitude: 5, takeoffDuration: 0, hoverDuration: 0, speed: 5 },
      initialState: {
        position: [0, 0, -5],
        velocity: [5, 0, 0],
        quaternion: [1, 0, 0, 0],
        angularVelocity: [0, 0, 0],
      },
      maxSimTime: 1600,
    }
  }

  return base
}
