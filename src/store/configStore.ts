import { create } from 'zustand'

export interface DroneConfig {
  // Environment
  temperature: number
  pressure: number
  altitude: number

  // Frame
  frameId: string
  totalWeight: number

  // Motor + ESC
  motorId: string
  escId: string

  // Propeller
  propellerId: string

  // Battery (cell-level)
  batteryCellId: string
  batteryCells: number
  batteryCapacity: number
  batteryDischargeRate: number
  batteryInternalResistance: number
  batteryWeight: number

  // Safety
  maxThrottlePercent: number
  lowVoltageThreshold: number

  // Mission
  missionType: 'hover' | 'circle' | 'figure8'
}

export const defaultConfig: DroneConfig = {
  temperature: 15,
  pressure: 1013,
  altitude: 0,

  frameId: '',
  totalWeight: 1.5,

  motorId: '',
  escId: '',

  propellerId: '',

  batteryCellId: '',
  batteryCells: 4,
  batteryCapacity: 5000,
  batteryDischargeRate: 25,
  batteryInternalResistance: 5,
  batteryWeight: 450,

  maxThrottlePercent: 80,
  lowVoltageThreshold: 14.0,

  missionType: 'hover',
}

interface ConfigStore {
  config: DroneConfig
  setConfig: (config: Partial<DroneConfig>) => void
  resetConfig: () => void
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: { ...defaultConfig },
  setConfig: (partial) => set((state) => ({ config: { ...state.config, ...partial } })),
  resetConfig: () => set({ config: { ...defaultConfig } }),
}))
