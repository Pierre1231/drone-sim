import { create } from 'zustand'
import type { SimResult } from '@/lib/simulation'

export type SimStatus = 'idle' | 'running' | 'complete' | 'error'

interface SimStore {
  status: SimStatus
  progress: number
  error: string | null
  result: SimResult | null
  missionType: 'hover' | 'circle' | 'figure8' | 'fullspeed' | 'test-hover' | 'test-circle' | 'test-figure8' | null
  setStatus: (status: SimStatus) => void
  setProgress: (progress: number) => void
  setError: (error: string | null) => void
  setResult: (result: SimResult | null) => void
  setMissionType: (missionType: 'hover' | 'circle' | 'figure8' | 'fullspeed' | 'test-hover' | 'test-circle' | 'test-figure8' | null) => void
  reset: () => void
}

export const useSimStore = create<SimStore>((set) => ({
  status: 'idle',
  progress: 0,
  error: null,
  result: null,
  missionType: null,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  setResult: (result) => set({ status: result ? 'complete' : 'idle', result }),
  setMissionType: (missionType) => set({ missionType }),
  reset: () => set({ status: 'idle', progress: 0, error: null, result: null, missionType: null }),
}))
