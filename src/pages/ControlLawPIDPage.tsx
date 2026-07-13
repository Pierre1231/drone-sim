import { useEffect, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useConfigStore, defaultConfig } from '@/store/configStore'
import { useControllerStore, type LoopTab } from '@/store/controllerStore'
import { buildSimConfig } from '@/lib/configBuilder'
import { getPresetById } from '@/lib/presets'
import { quatToEuler } from '@/lib/dynamics'
import type { ControllerGains } from '@/lib/controller'
import type { SimResult } from '@/lib/simulation'
import { Link2, Link2Off, Rotate3D, Gauge, Move, Activity } from 'lucide-react'

const LOOP_META: Record<
  LoopTab,
  {
    label: string
    icon: React.ReactNode
    gains: { key: keyof ControllerGains; label: string; max: number }[]
    axisLabels: [string, string, string]
    outputLabel: string
    outputUnit: string
  }
> = {
  position: {
    label: '位置环',
    icon: <Move size={18} />,
    gains: [
      { key: 'positionKp', label: 'Kp', max: 5 },
      { key: 'positionKi', label: 'Ki', max: 0.5 },
    ],
    axisLabels: ['北 x', '东 y', '下 z'],
    outputLabel: '位置',
    outputUnit: 'm',
  },
  velocity: {
    label: '速度环',
    icon: <Activity size={18} />,
    gains: [
      { key: 'velocityKp', label: 'Kp', max: 5 },
      { key: 'velocityKi', label: 'Ki', max: 0.5 },
      { key: 'velocityKd', label: 'Kd', max: 1 },
    ],
    axisLabels: ['北 x', '东 y', '下 z'],
    outputLabel: '速度',
    outputUnit: 'm/s',
  },
  attitude: {
    label: '姿态环',
    icon: <Rotate3D size={18} />,
    gains: [
      { key: 'attitudeKp', label: 'Kp', max: 10 },
    ],
    axisLabels: ['滚转', '俯仰', '偏航'],
    outputLabel: '姿态角',
    outputUnit: 'rad',
  },
  rate: {
    label: '角速度环',
    icon: <Gauge size={18} />,
    gains: [
      { key: 'rateKp', label: 'Kp', max: 1 },
      { key: 'rateKi', label: 'Ki', max: 0.2 },
      { key: 'rateKd', label: 'Kd', max: 0.05 },
    ],
    axisLabels: ['滚转 x', '俯仰 y', '偏航 z'],
    outputLabel: '角速度',
    outputUnit: 'rad/s',
  },
}

const MISSION_FOR_TAB: Record<LoopTab, 'step-position' | 'step-velocity' | 'step-attitude' | 'step-rate'> = {
  position: 'step-position',
  velocity: 'step-velocity',
  attitude: 'step-attitude',
  rate: 'step-rate',
}

function createWorker(): Worker {
  return new Worker(new URL('@/workers/simulation.worker.ts', import.meta.url), { type: 'module' })
}

function useDebouncedSimulation() {
  const { config } = useConfigStore()
  const { pidGains, activeLoopTab, setLastResponse } = useControllerStore()
  const workerRef = useRef<Worker | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    workerRef.current = createWorker()
    return () => {
      workerRef.current?.terminate()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      const baseConfig = buildSimConfig({ ...config, missionType: 'hover' })
      if (!baseConfig || !workerRef.current) return

      const simConfig = {
        ...baseConfig,
        missionType: MISSION_FOR_TAB[activeLoopTab],
        controllerGains: pidGains,
        maxSimTime: 5,
      }

      const worker = workerRef.current
      worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'complete') {
          setLastResponse(e.data.result as SimResult)
        } else if (e.data.type === 'error') {
          setLastResponse(null)
        }
      }
      worker.postMessage({ type: 'start', config: simConfig })
    }, 200)
  }, [config, pidGains, activeLoopTab, setLastResponse])
}

function extractOutput(result: SimResult, tab: LoopTab): { time: number[]; output: number[][]; control: number[] } {
  const time = result.time
  if (tab === 'attitude') {
    const output = result.quaternion.map(q => quatToEuler(q as [number, number, number, number]))
    return { time, output, control: result.totalThrust }
  }
  if (tab === 'position') {
    return { time, output: result.position, control: result.totalThrust }
  }
  if (tab === 'velocity') {
    return { time, output: result.velocity, control: result.totalThrust }
  }
  return { time, output: result.angularVelocity, control: result.totalThrust }
}

function buildChartOption(
  time: number[],
  output: number[][],
  tab: LoopTab,
  axisLabels: [string, string, string]
): EChartsOption {
  const colors = ['var(--status-danger)', 'var(--status-warning)', 'var(--accent-primary)']
  const series = axisLabels.map((label, i) => ({
    name: label,
    type: 'line' as const,
    showSymbol: false,
    data: output.map((v, idx) => [time[idx], v[i]]),
    lineStyle: { color: colors[i], width: 2 },
    itemStyle: { color: colors[i] },
  }))

  return {
    grid: { left: 48, right: 16, top: 32, bottom: 32 },
    tooltip: { trigger: 'axis' },
    legend: { data: axisLabels, top: 0 },
    xAxis: { type: 'value', name: '时间 (s)', min: 0, max: Math.max(5, time[time.length - 1] ?? 5) },
    yAxis: { type: 'value', name: `${LOOP_META[tab].outputLabel} (${LOOP_META[tab].outputUnit})` },
    series,
  }
}

function buildControlOption(time: number[], control: number[]): EChartsOption {
  return {
    grid: { left: 48, right: 16, top: 24, bottom: 32 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', name: '时间 (s)', min: 0, max: Math.max(5, time[time.length - 1] ?? 5) },
    yAxis: { type: 'value', name: '总推力 (N)' },
    series: [{
      type: 'line',
      showSymbol: false,
      data: control.map((v, i) => [time[i], v]),
      lineStyle: { color: 'var(--status-warning)', width: 2 },
    }],
  }
}

export default function ControlLawPIDPage() {
  const { config, setConfig } = useConfigStore()
  const { activeLoopTab, setActiveLoopTab, pidGains, setPidGain, rollPitchLinked, setRollPitchLinked } = useControllerStore()
  const result = useControllerStore(state => state.lastResponse)
  const [activeAxis, setActiveAxis] = useState<0 | 1 | 2>(0)

  // 如果用户直接进入 PID 页面且没有配置过部件，自动加载 test-standard 预设
  useEffect(() => {
    if (!config.frameId) {
      const preset = getPresetById('test-standard')
      if (preset) {
        setConfig({ ...defaultConfig, ...preset.config })
      }
    }
  }, [config.frameId, setConfig])

  useDebouncedSimulation()

  const meta = LOOP_META[activeLoopTab]

  const chartData = useMemo(() => {
    if (!result) return null
    return extractOutput(result, activeLoopTab)
  }, [result, activeLoopTab])

  const responseOption = useMemo(() => {
    if (!chartData) return {}
    return buildChartOption(chartData.time, chartData.output, activeLoopTab, meta.axisLabels)
  }, [chartData, activeLoopTab, meta.axisLabels])

  const controlOption = useMemo(() => {
    if (!chartData) return {}
    return buildControlOption(chartData.time, chartData.control)
  }, [chartData])

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 className="ds-display" style={{ fontSize: 32, marginBottom: 8 }}>PID 控制律</h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
          调整串级 PID 增益，实时观察阶跃响应与控制量变化。
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(Object.keys(LOOP_META) as LoopTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveLoopTab(tab)}
            className={`ds-tab ${tab === activeLoopTab ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {LOOP_META[tab].icon}
              {LOOP_META[tab].label}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        <section className="section-card ds-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 className="ds-title" style={{ fontSize: 16, margin: 0 }}>{meta.label}参数</h3>
            <button
              onClick={() => setRollPitchLinked(!rollPitchLinked)}
              className="ds-button ghost"
              style={{ padding: '6px 10px', fontSize: 12 }}
            >
              {rollPitchLinked ? <Link2 size={14} /> : <Link2Off size={14} />}
              {rollPitchLinked ? '滚转/俯仰联动' : '独立调节'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {(meta.axisLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => setActiveAxis(i as 0 | 1 | 2)}
                className={`ds-tab ${i === activeAxis ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {label}
              </button>
            )))}
          </div>

          {meta.gains.map(g => {
            const value = pidGains[g.key][activeAxis]
            return (
              <div key={g.key} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{g.label}</span>
                  <span className="ds-mono" style={{ fontSize: 13, color: 'var(--accent-primary)', fontWeight: 700, padding: '4px 8px', background: 'var(--accent-subtle)', borderRadius: 'var(--radius-md)' }}>{value.toFixed(4)}</span>
                </div>
                <input
                  type="range"
                  className="ds-slider"
                  min={0}
                  max={g.max}
                  step={g.max / 200}
                  value={value}
                  onChange={e => setPidGain(g.key, activeAxis, Number(e.target.value))}
                />
              </div>
            )
          })}
        </section>

        <div className="ds-stagger">
          <section className="section-card" style={{ marginBottom: 16 }}>
            <h3 className="ds-title" style={{ fontSize: 16, marginBottom: 12 }}>阶跃响应</h3>
            {result ? (
              <ReactECharts option={responseOption} style={{ height: 300 }} />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)' }}>
                正在计算响应…
              </div>
            )}
          </section>
          <section className="section-card">
            <h3 className="ds-title" style={{ fontSize: 16, marginBottom: 12 }}>控制量</h3>
            {result ? (
              <ReactECharts option={controlOption} style={{ height: 200 }} />
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)' }}>
                正在计算控制量…
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
