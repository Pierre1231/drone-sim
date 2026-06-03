import type { DroneConfig } from '@/store/configStore'

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
]

export function getDronePresets(): DronePreset[] {
  return dronePresets
}

export function getPresetById(id: string): DronePreset | undefined {
  return dronePresets.find(p => p.id === id)
}
