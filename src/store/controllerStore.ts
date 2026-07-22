import { create } from 'zustand'
import { createDocumentControllerGains, type ControllerGains } from '@/lib/controller'
import type { SimResult } from '@/lib/simulation'

export type ControlLaw = 'pid' | 'lqr' | 'mpc'
export type LoopTab = 'position' | 'velocity' | 'attitude' | 'rate'
export type LoopAxis = 0 | 1 | 2

interface ControllerStore {
  activeLaw: ControlLaw
  activeLoopTab: LoopTab
  pidGains: ControllerGains
  lastResponse: SimResult | null
  rollPitchLinked: boolean
  setActiveLaw: (law: ControlLaw) => void
  setActiveLoopTab: (tab: LoopTab) => void
  setPidGain: (loop: keyof ControllerGains, axis: LoopAxis, value: number) => void
  setPidGains: (gains: ControllerGains) => void
  setLastResponse: (result: SimResult | null) => void
  setRollPitchLinked: (linked: boolean) => void
  reset: () => void
}

const documentGains = createDocumentControllerGains()

// Conservative horizontal gains for the interactive step-response tuner.
// They keep the fixed propulsion/dynamics model inside its small-angle region,
// so position overshoot is followed by a visible return toward the target.
const defaultGains: ControllerGains = {
  ...documentGains,
  positionKp: [0.5, 0.5, 0.5],
  positionKi: [0, 0, 0],
  velocityKp: [0.5, 0.5, 0.5],
  velocityKi: [0, 0, 0],
  velocityKd: [0.02, 0.02, 0.02],
}

export const useControllerStore = create<ControllerStore>((set) => ({
  activeLaw: 'pid',
  activeLoopTab: 'position',
  pidGains: defaultGains,
  lastResponse: null,
  rollPitchLinked: true,
  setActiveLaw: (law) => set({ activeLaw: law }),
  setActiveLoopTab: (tab) => set({ activeLoopTab: tab }),
  setPidGain: (loop, axis, value) => set((state) => {
    const next = { ...state.pidGains, [loop]: [...state.pidGains[loop]] as [number, number, number] }
    next[loop][axis] = value
    if (state.rollPitchLinked && axis <= 1 && (loop === 'positionKp' || loop === 'positionKi' || loop === 'velocityKp' || loop === 'velocityKi' || loop === 'velocityKd' || loop === 'attitudeKp' || loop === 'rateKp' || loop === 'rateKi' || loop === 'rateKd')) {
      next[loop][1 - axis] = value
    }
    return { pidGains: next }
  }),
  setPidGains: (gains) => set({ pidGains: gains }),
  setLastResponse: (result) => set({ lastResponse: result }),
  setRollPitchLinked: (linked) => set({ rollPitchLinked: linked }),
  reset: () => set({
    activeLaw: 'pid',
    activeLoopTab: 'position',
    pidGains: defaultGains,
    lastResponse: null,
    rollPitchLinked: true,
  }),
}))
