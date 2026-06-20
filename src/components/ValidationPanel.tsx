import { useMemo, useState } from 'react'
import { CheckCircle, Play, XCircle } from 'lucide-react'
import { runSimulation, type SimResult } from '@/lib/simulation'
import { buildDocAlignedSimConfig } from '@/lib/presets'
import { useSimStore } from '@/store/simStore'

type Verdict = 'pass' | 'fail'

interface Metric {
  label: string
  expected: string
  actual: string
  tolerance: string
  verdict: Verdict
}

interface ValidationCase {
  id: 'test-hover' | 'fullspeed' | 'test-circle' | 'test-circle-7'
  title: string
  description: string
  run: () => { metrics: Metric[]; result: SimResult }
}

function firstIndexAtOrAfter(time: number[], target: number): number {
  const idx = time.findIndex(t => t >= target)
  return idx >= 0 ? idx : time.length - 1
}

function cutoffIndex(result: SimResult): number {
  const idx = result.soc.findIndex(s => s <= 0.2)
  return idx >= 0 ? idx : result.time.length - 1
}

function avg(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

function metric(label: string, actual: number, expected: number, tolerance: number, unit = ''): Metric {
  const pass = Math.abs(actual - expected) <= tolerance
  const fmt = (value: number) => `${value.toFixed(3)}${unit ? ` ${unit}` : ''}`
  return {
    label,
    expected: fmt(expected),
    actual: fmt(actual),
    tolerance: `±${tolerance}${unit ? ` ${unit}` : ''}`,
    verdict: pass ? 'pass' : 'fail',
  }
}

function compareHover(result: SimResult): Metric[] {
  const idx600 = firstIndexAtOrAfter(result.time, 600)
  const idxCutoff = cutoffIndex(result)
  const stableStart = firstIndexAtOrAfter(result.time, 20)
  const stableEnd = firstIndexAtOrAfter(result.time, 120)
  return [
    metric('稳态电池功率', avg(result.power.slice(stableStart, stableEnd)), 339.373061, 8, 'W'),
    metric('稳态总推力', avg(result.totalThrust.slice(stableStart, stableEnd)), 14.715, 0.5, 'N'),
    metric('600 s 后 SOC', result.soc[idx600], 0.697615, 0.02),
    metric('到 SOC=20% 的时间', result.time[idxCutoff], 1491.0, 120, 's'),
    metric('SOC=20% 时电压', result.voltage[idxCutoff], 19.6740, 0.7, 'V'),
    metric('SOC=20% 时电流', result.current[idxCutoff], 17.2498, 1.0, 'A'),
  ]
}

function compareCircle(result: SimResult, speed: 2 | 7): Metric[] {
  const stableStart = firstIndexAtOrAfter(result.time, speed === 2 ? 10 : 20)
  const stableEnd = firstIndexAtOrAfter(result.time, 120)
  const idx600 = firstIndexAtOrAfter(result.time, 600)
  const idxCutoff = cutoffIndex(result)
  return [
    metric('稳态电池功率', avg(result.power.slice(stableStart, stableEnd)), speed === 2 ? 341.294069 : 578.013196, speed === 2 ? 8 : 30, 'W'),
    metric('600 s 后 SOC', result.soc[idx600], speed === 2 ? 0.695758 : 0.449874, speed === 2 ? 0.02 : 0.04),
    metric('到 SOC=20% 的时间', result.time[idxCutoff], speed === 2 ? 1482.1 : 842.6, speed === 2 ? 120 : 80, 's'),
  ]
}

function compareFullSpeed(result: SimResult): Metric[] {
  const stableStart = firstIndexAtOrAfter(result.time, 20)
  const stableEnd = firstIndexAtOrAfter(result.time, 120)
  const idx600 = firstIndexAtOrAfter(result.time, 600)
  const idxCutoff = cutoffIndex(result)
  return [
    metric('稳态电池功率', avg(result.power.slice(stableStart, stableEnd)), 341.223962, 8, 'W'),
    metric('600 s 后 SOC', result.soc[idx600], 0.695826, 0.02),
    metric('到 SOC=20% 的时间', result.time[idxCutoff], 1482.5, 120, 's'),
    metric('SOC=20% 时电压', result.voltage[idxCutoff], 19.6670, 0.7, 'V'),
    metric('SOC=20% 时电流', result.current[idxCutoff], 17.3500, 1.0, 'A'),
  ]
}

export default function ValidationPanel() {
  const [activeId, setActiveId] = useState<ValidationCase['id']>('test-hover')
  const [running, setRunning] = useState(false)
  const [metrics, setMetrics] = useState<Metric[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { setResult, setMissionType, setStatus } = useSimStore()

  const cases = useMemo<ValidationCase[]>(() => [
    {
      id: 'test-hover',
      title: 'B01 全链路悬停',
      description: '只判定文档明确列出的悬停输出项。',
      run: () => {
        const result = runSimulation(buildDocAlignedSimConfig('test-hover'))
        return { result, metrics: compareHover(result) }
      },
    },
    {
      id: 'fullspeed',
      title: 'B02 水平匀速 5 m/s',
      description: '只判定文档输出表中的 Pbat、SOC(600s)、SOC20 时间、电压和电流。',
      run: () => {
        const result = runSimulation(buildDocAlignedSimConfig('fullspeed'))
        return { result, metrics: compareFullSpeed(result) }
      },
    },
    {
      id: 'test-circle',
      title: 'B03 圆形轨迹 2 m/s',
      description: '只判定文档输出表中的 Pbat、SOC(600s)、SOC20 时间。',
      run: () => {
        const result = runSimulation(buildDocAlignedSimConfig('test-circle'))
        return { result, metrics: compareCircle(result, 2) }
      },
    },
    {
      id: 'test-circle-7',
      title: 'B03 圆形轨迹 7 m/s',
      description: '只判定文档输出表中的 Pbat、SOC(600s)、SOC20 时间。',
      run: () => {
        const result = runSimulation(buildDocAlignedSimConfig('test-circle-7'))
        return { result, metrics: compareCircle(result, 7) }
      },
    },
  ], [])

  const activeCase = cases.find(item => item.id === activeId) ?? cases[0]

  function runCase() {
    setRunning(true)
    setError(null)
    setMetrics(null)
    try {
      const output = activeCase.run()
      setMetrics(output.metrics)
      setResult(output.result)
      setMissionType(activeCase.id)
      setStatus('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证运行失败')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cases.map(item => (
          <button
            key={item.id}
            onClick={() => {
              setActiveId(item.id)
              setMetrics(null)
              setError(null)
            }}
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              background: activeId === item.id ? 'oklch(96% 0.02 250)' : 'var(--bg-surface)',
              padding: 12,
              textAlign: 'left',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: activeId === item.id ? 700 : 500,
            }}
          >
            {item.title}
          </button>
        ))}
      </aside>

      <section>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>{activeCase.title}</h3>
            <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>{activeCase.description}</p>
          </div>
          <button
            onClick={runCase}
            disabled={running}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              background: running ? 'oklch(90% 0.01 250)' : 'var(--accent-primary)',
              color: running ? 'var(--text-secondary)' : 'var(--text-inverse)',
              cursor: running ? 'default' : 'pointer',
              fontWeight: 700,
            }}
          >
            <Play size={16} />
            {running ? '运行中' : '运行验证'}
          </button>
        </div>

        {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

        {metrics ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: 'oklch(97% 0.005 250)' }}>
                <th style={thStyle}>指标</th>
                <th style={thStyle}>文档期望</th>
                <th style={thStyle}>仿真实际</th>
                <th style={thStyle}>容差</th>
                <th style={thStyle}>状态</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(item => (
                <tr key={item.label} style={{ borderTop: '1px solid var(--border-default)' }}>
                  <td style={tdStyle}>{item.label}</td>
                  <td style={monoTdStyle}>{item.expected}</td>
                  <td style={monoTdStyle}>{item.actual}</td>
                  <td style={monoTdStyle}>{item.tolerance}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: item.verdict === 'pass' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                      {item.verdict === 'pass' ? <CheckCircle size={15} /> : <XCircle size={15} />}
                      {item.verdict === 'pass' ? '通过' : '未通过'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 24, border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-secondary)' }}>
            点击运行验证后显示文档对比结果。
          </div>
        )}
      </section>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '12px 14px', textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap' }
const monoTdStyle: React.CSSProperties = { ...tdStyle, fontFamily: 'var(--font-mono)' }
