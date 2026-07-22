import { useEffect, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useConfigStore, defaultConfig } from '@/store/configStore'
import { useControllerStore, type LoopTab } from '@/store/controllerStore'
import { buildSimConfig } from '@/lib/configBuilder'
import { getPresetById } from '@/lib/presets'
import { quatToEuler } from '@/lib/dynamics'
import { computeStepResponseMetrics } from '@/lib/controlMetrics'
import type { ControllerGains } from '@/lib/controller'
import type { SimResult } from '@/lib/simulation'
import { AlertTriangle, Link2, Link2Off, Rotate3D, Gauge, Move, Activity } from 'lucide-react'

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
    axisLabels: ['x', 'y', 'z'],
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
    axisLabels: ['x', 'y', 'z'],
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

const SIM_DURATION_FOR_TAB: Record<LoopTab, number> = {
  position: 12,
  velocity: 8,
  attitude: 5,
  rate: 5,
}

const POSITION_STEP_LIMITS = {
  maxVelocity: [0.75, 0.75, 1] as [number, number, number],
  maxAcceleration: [0.15, 0.15, 0.5] as [number, number, number],
  maxAngularVelocity: [3, 3, 2] as [number, number, number],
  maxMoment: [1, 1, 0.5] as [number, number, number],
}

function getStepAmplitude(tab: LoopTab, axis: 0 | 1 | 2): number {
  if ((tab === 'position' || tab === 'velocity') && axis === 2) return -1
  if (tab === 'attitude') return 5 * Math.PI / 180
  if (tab === 'rate') return 0.5
  return 1
}

function createWorker(): Worker {
  return new Worker(new URL('@/workers/simulation.worker.ts', import.meta.url), { type: 'module' })
}

function NedAxisHint() {
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 20, paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width="76" height="72" viewBox="0 0 76 72" role="img" aria-label="NED 坐标系：x 向北，y 向东，z 向下">
          <circle cx="30" cy="34" r="3" fill="var(--text-primary)" />

          <line x1="30" y1="34" x2="12" y2="14" stroke="#2563EB" strokeWidth="2" />
          <path d="M12 14 L15 23 L21 17 Z" fill="#2563EB" />
          <text x="4" y="12" fill="#2563EB" fontSize="12" fontWeight="700">x</text>

          <line x1="30" y1="34" x2="61" y2="34" stroke="#F97316" strokeWidth="2" />
          <path d="M61 34 L52 29 L52 39 Z" fill="#F97316" />
          <text x="64" y="38" fill="#F97316" fontSize="12" fontWeight="700">y</text>

          <line x1="30" y1="34" x2="30" y2="62" stroke="#16A34A" strokeWidth="2" />
          <path d="M30 62 L25 53 L35 53 Z" fill="#16A34A" />
          <text x="35" y="65" fill="#16A34A" fontSize="12" fontWeight="700">z</text>
        </svg>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>NED 坐标系</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            x：北 · y：东 · z：下
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            z 正方向向下，向上 1 m 对应 z = -1 m
          </div>
        </div>
      </div>
    </div>
  )
}

function useDebouncedSimulation(activeAxis: 0 | 1 | 2) {
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
    setLastResponse(null)
    timeoutRef.current = setTimeout(() => {
      const baseConfig = buildSimConfig({ ...config, missionType: 'hover' })
      if (!baseConfig || !workerRef.current) return

      const simConfig = {
        ...baseConfig,
        missionType: MISSION_FOR_TAB[activeLoopTab],
        controllerGains: pidGains,
        controllerLimits: activeLoopTab === 'position' ? POSITION_STEP_LIMITS : baseConfig.controllerLimits,
        stepAxis: activeAxis,
        stepAmplitude: getStepAmplitude(activeLoopTab, activeAxis),
        maxSimTime: SIM_DURATION_FOR_TAB[activeLoopTab],
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
  }, [config, pidGains, activeLoopTab, activeAxis, setLastResponse])
}

function extractOutput(result: SimResult, tab: LoopTab): { time: number[]; output: number[][] } {
  const time = result.time
  if (tab === 'attitude') {
    const output = result.quaternion.map(q => quatToEuler(q as [number, number, number, number]))
    return { time, output }
  }
  if (tab === 'position') {
    return { time, output: result.position }
  }
  if (tab === 'velocity') {
    return { time, output: result.velocity }
  }
  return { time, output: result.angularVelocity }
}

function extractControl(
  result: SimResult,
  tab: LoopTab,
  axis: 0 | 1 | 2,
): { values: number[]; label: string; unit: string } {
  const moments = result.commandedMoments
  if ((tab === 'position' || tab === 'velocity') && axis === 0 && moments) {
    return { values: moments.map(moment => moment[1]), label: 'Pitch 力矩 My', unit: 'N·m' }
  }
  if ((tab === 'position' || tab === 'velocity') && axis === 1 && moments) {
    return { values: moments.map(moment => moment[0]), label: 'Roll 力矩 Mx', unit: 'N·m' }
  }
  if ((tab === 'attitude' || tab === 'rate') && moments) {
    const momentNames = ['Mx', 'My', 'Mz']
    return { values: moments.map(moment => moment[axis]), label: `控制力矩 ${momentNames[axis]}`, unit: 'N·m' }
  }
  return {
    values: result.commandedThrust ?? result.totalThrust,
    label: '总推力指令',
    unit: 'N',
  }
}

function getChartEndTime(time: number[]): number {
  return Math.max(5, Math.ceil(time[time.length - 1] ?? 5))
}

function buildChartOption(
  time: number[],
  output: number[][],
  tab: LoopTab,
  axisLabels: [string, string, string],
  activeAxis: 0 | 1 | 2,
  showOtherAxes: boolean,
): EChartsOption {
  const colors = ['#2563EB', '#F97316', '#16A34A']
  const displayedAxes = showOtherAxes ? [0, 1, 2] : [activeAxis]
  const responseSeries = displayedAxes.map(i => ({
    name: `${axisLabels[i]} 实际值`,
    type: 'line' as const,
    showSymbol: false,
    data: output.map((v, idx) => [time[idx], v[i]]),
    lineStyle: { color: colors[i], width: i === activeAxis ? 3 : 2, opacity: i === activeAxis ? 1 : 0.45 },
    itemStyle: { color: colors[i] },
  }))

  const target = getStepAmplitude(tab, activeAxis)

  const targetSeries = {
    name: `${axisLabels[activeAxis]} 目标值`,
    type: 'line' as const,
    showSymbol: false,
    data: time.map(t => [t, t >= 0.5 ? target : 0]),
    lineStyle: { color: '#7C3AED', width: 2, type: 'dashed' as const },
    itemStyle: { color: '#7C3AED' },
  }

  const series = [...responseSeries, targetSeries]

  const legendLabels = [...responseSeries.map(item => item.name), targetSeries.name]

  return {
    grid: { left: 48, right: 16, top: 32, bottom: 32 },
    tooltip: { trigger: 'axis' },
    legend: { data: legendLabels, top: 0 },
    xAxis: { type: 'value', name: '时间 (s)', min: 0, max: getChartEndTime(time) },
    yAxis: { type: 'value', name: `${LOOP_META[tab].outputLabel} (${LOOP_META[tab].outputUnit})` },
    series,
  }
}

function buildControlOption(time: number[], control: number[], label: string, unit: string): EChartsOption {
  return {
    grid: { left: 48, right: 16, top: 24, bottom: 32 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', name: '时间 (s)', min: 0, max: getChartEndTime(time) },
    yAxis: { type: 'value', name: `${label} (${unit})` },
    series: [{
      type: 'line',
      showSymbol: false,
      data: control.map((v, i) => [time[i], v]),
      lineStyle: { color: '#F97316', width: 2 },
    }],
  }
}

export default function ControlLawPIDPage() {
  const { config, setConfig } = useConfigStore()
  const { activeLoopTab, setActiveLoopTab, pidGains, setPidGain, rollPitchLinked, setRollPitchLinked } = useControllerStore()
  const result = useControllerStore(state => state.lastResponse)
  const [activeAxis, setActiveAxis] = useState<0 | 1 | 2>(0)
  const [showOtherAxes, setShowOtherAxes] = useState(false)

  // 如果用户直接进入 PID 页面且没有配置过部件，自动加载 test-standard 预设
  useEffect(() => {
    if (!config.frameId) {
      const preset = getPresetById('test-standard')
      if (preset) {
        setConfig({ ...defaultConfig, ...preset.config })
      }
    }
  }, [config.frameId, setConfig])

  useDebouncedSimulation(activeAxis)

  const meta = LOOP_META[activeLoopTab]

  const chartData = useMemo(() => {
    if (!result) return null
    return extractOutput(result, activeLoopTab)
  }, [result, activeLoopTab])

  const responseOption = useMemo(() => {
    if (!chartData) return {}
    return buildChartOption(chartData.time, chartData.output, activeLoopTab, meta.axisLabels, activeAxis, showOtherAxes)
  }, [chartData, activeLoopTab, meta.axisLabels, activeAxis, showOtherAxes])

  const controlOption = useMemo(() => {
    if (!chartData || !result) return {}
    const control = extractControl(result, activeLoopTab, activeAxis)
    return buildControlOption(chartData.time, control.values, control.label, control.unit)
  }, [chartData, result, activeLoopTab, activeAxis])

  const metrics = useMemo(() => {
    if (!chartData) return null
    return computeStepResponseMetrics(
      chartData.time,
      chartData.output.map(value => value[activeAxis]),
      getStepAmplitude(activeLoopTab, activeAxis),
    )
  }, [chartData, activeLoopTab, activeAxis])

  const warnings = useMemo(() => {
    if (!result || !metrics) return []
    const items: string[] = []
    if (metrics.diverged) items.push('响应已明显偏离目标，当前参数可能导致系统发散。')
    const maxAttitude = Math.max(...result.quaternion.map(q => {
      const [roll, pitch] = quatToEuler(q as [number, number, number, number])
      return Math.max(Math.abs(roll), Math.abs(pitch))
    }))
    if (maxAttitude > 30 * Math.PI / 180) items.push('Roll/Pitch 超过 30°，已离开小角度调参区域。')
    if (metrics.settlingTime === null && !metrics.diverged) items.push('响应未在当前仿真窗口内进入并保持在 ±2% 误差带。')
    return items
  }, [result, metrics])

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

          {(activeLoopTab === 'position' || activeLoopTab === 'velocity') && <NedAxisHint />}
        </section>

        <div className="ds-stagger">
          <section className="section-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 className="ds-title" style={{ fontSize: 16, margin: 0 }}>阶跃响应</h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showOtherAxes}
                  onChange={event => setShowOtherAxes(event.target.checked)}
                />
                显示其他轴
              </label>
            </div>
            {result ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  目标 {getStepAmplitude(activeLoopTab, activeAxis).toFixed(activeLoopTab === 'attitude' ? 3 : 1)} {meta.outputUnit}
                  {' · '}阶跃时刻 0.5 s{' · '}仿真时长 {SIM_DURATION_FOR_TAB[activeLoopTab]} s
                </div>
                <ReactECharts option={responseOption} notMerge style={{ height: 300 }} />
                {metrics && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 8 }}>
                    {[
                      ['最终值', `${metrics.finalValue.toFixed(3)} ${meta.outputUnit}`],
                      ['稳态误差', `${metrics.steadyStateError.toFixed(3)} ${meta.outputUnit}`],
                      ['超调量', `${metrics.overshootPercent.toFixed(1)} %`],
                      ['上升时间', metrics.riseTime === null ? '—' : `${metrics.riseTime.toFixed(2)} s`],
                      ['调节时间', metrics.settlingTime === null ? '未收敛' : `${metrics.settlingTime.toFixed(2)} s`],
                      ['IAE', metrics.iae.toFixed(3)],
                    ].map(([label, value]) => (
                      <div key={label} style={{ padding: '9px 10px', borderRadius: 8, background: 'var(--bg-primary)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>{label}</div>
                        <div className="ds-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {warnings.map(warning => (
                  <div key={warning} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--status-warning)', background: 'var(--status-warning-subtle, #FFF7ED)', borderRadius: 8, padding: '9px 10px', marginTop: 8, fontSize: 12 }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{warning}</span>
                  </div>
                ))}
              </>
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
