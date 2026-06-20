import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { useSimStore } from '@/store/simStore'
import type { SimResult } from '@/lib/simulation'

type TabKey = 'comparison' | 'summary' | 'charts'
type Verdict = 'pass' | 'warn' | 'fail'

interface CompareRow {
  metric: string
  expected: string
  actual: string
  error: string
  tolerance: string
  verdict: Verdict
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

function maxBy<T>(values: T[], selector: (value: T) => number): number {
  let max = -Infinity
  for (const value of values) max = Math.max(max, selector(value))
  return max
}

function distance(a: number[], b: number[]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}

function firstIndexAtOrAfter(time: number[], target: number): number {
  const idx = time.findIndex(t => t >= target)
  return idx >= 0 ? idx : time.length - 1
}

function sliceByTime<T>(result: SimResult, values: T[], start: number, end: number): T[] {
  const startIdx = firstIndexAtOrAfter(result.time, start)
  const endIdx = firstIndexAtOrAfter(result.time, end)
  return values.slice(startIdx, Math.max(startIdx + 1, endIdx))
}

function verdictForAbsError(error: number, tolerance: number): Verdict {
  if (error <= tolerance) return 'pass'
  if (error <= tolerance * 2) return 'warn'
  return 'fail'
}

function fmt(value: number, unit = ''): string {
  return `${value.toFixed(3)}${unit ? ` ${unit}` : ''}`
}

function makeRow(metric: string, actual: number, expected: number, tolerance: number, unit = ''): CompareRow {
  const error = actual - expected
  return {
    metric,
    expected: fmt(expected, unit),
    actual: fmt(actual, unit),
    error: `${error >= 0 ? '+' : ''}${fmt(error, unit)}`,
    tolerance: `±${tolerance}${unit ? ` ${unit}` : ''}`,
    verdict: verdictForAbsError(Math.abs(error), tolerance),
  }
}

function cutoffIndex(result: SimResult): number {
  const idx = result.soc.findIndex(s => s <= 0.2)
  return idx >= 0 ? idx : result.time.length - 1
}

function compareHover(result: SimResult): CompareRow[] {
  const idx600 = firstIndexAtOrAfter(result.time, 600)
  const idxCutoff = cutoffIndex(result)
  const stablePower = average(sliceByTime(result, result.power, 20, 120))
  const stableThrust = average(sliceByTime(result, result.totalThrust, 20, 120))

  return [
    makeRow('稳态电池功率', stablePower, 339.373061, 8, 'W'),
    makeRow('稳态总推力', stableThrust, 14.715, 0.5, 'N'),
    makeRow('600 s 后 SOC', result.soc[idx600], 0.697615, 0.02),
    makeRow('到 SOC=20% 的时间', result.time[idxCutoff], 1491.0, 120, 's'),
    makeRow('SOC=20% 时电压', result.voltage[idxCutoff], 19.6740, 0.7, 'V'),
    makeRow('SOC=20% 时电流', result.current[idxCutoff], 17.2498, 1.0, 'A'),
  ]
}

function compareFullSpeed(result: SimResult): CompareRow[] {
  const idx600 = firstIndexAtOrAfter(result.time, 600)
  const idxCutoff = cutoffIndex(result)
  const power = average(sliceByTime(result, result.power, 20, 120))

  return [
    makeRow('稳态电池功率', power, 341.223962, 8, 'W'),
    makeRow('600 s 后 SOC', result.soc[idx600], 0.695826, 0.02),
    makeRow('到 SOC=20% 的时间', result.time[idxCutoff], 1482.5, 120, 's'),
    makeRow('SOC=20% 时电压', result.voltage[idxCutoff], 19.6670, 0.7, 'V'),
    makeRow('SOC=20% 时电流', result.current[idxCutoff], 17.3500, 1.0, 'A'),
  ]
}

function compareCircle(result: SimResult, targetSpeed: 2 | 7): CompareRow[] {
  const start = targetSpeed === 2 ? 10 : 20
  const end = Math.min(120, result.time[result.time.length - 1])
  const powers = sliceByTime(result, result.power, start, end)
  const power = average(powers)
  const expectedPower = targetSpeed === 2 ? 341.294069 : 578.013196
  const expectedSoc600 = targetSpeed === 2 ? 0.695758 : 0.449874
  const expectedEndurance = targetSpeed === 2 ? 1482.1 : 842.6
  const idxCutoff = cutoffIndex(result)
  const idx600 = firstIndexAtOrAfter(result.time, 600)

  return [
    makeRow('稳态电池功率', power, expectedPower, targetSpeed === 2 ? 8 : 30, 'W'),
    makeRow('600 s 后 SOC', result.soc[idx600], expectedSoc600, targetSpeed === 2 ? 0.02 : 0.04),
    makeRow('到 SOC=20% 的时间', result.time[idxCutoff], expectedEndurance, targetSpeed === 2 ? 120 : 80, 's'),
  ]
}

function buildComparison(missionType: string | null, result: SimResult): { title: string; rows: CompareRow[]; note: string } {
  if (missionType === 'test-hover' || missionType === 'hover') {
    return {
      title: 'B01 全链路悬停',
      rows: compareHover(result),
      note: '对照《四旋翼仿真测试用例.md》B01：5 m 悬停、6S 8Ah、电池截止 SOC=20%。',
    }
  }
  if (missionType === 'fullspeed') {
    return {
      title: 'B02 水平匀速 5 m/s',
      rows: compareFullSpeed(result),
      note: '对照《四旋翼仿真测试用例.md》B02 输出表：稳态 Pbat、SOC(600s)、SOC20 时间、电压和电流。',
    }
  }
  if (missionType === 'test-circle' || missionType === 'circle') {
    return {
      title: 'B03 圆形轨迹 2 m/s',
      rows: compareCircle(result, 2),
      note: '只判定文档 B03 表格中明确给出的输出：稳态 Pbat、SOC(600s)、到 SOC=20% 的时间。',
    }
  }
  if (missionType === 'test-circle-7') {
    return {
      title: 'B03 圆形轨迹 7 m/s',
      rows: compareCircle(result, 7),
      note: '只判定文档 B03 表格中明确给出的输出：稳态 Pbat、SOC(600s)、到 SOC=20% 的时间。',
    }
  }
  return {
    title: '未匹配文档工况',
    rows: [],
    note: '请选择 B01 悬停、B02 5m/s 直线、B03 圆轨迹 2m/s 或 B03 圆轨迹 7m/s 后运行仿真。',
  }
}

function makeChartOption(time: number[], data: number[], unit: string, color: string): EChartsOption {
  return {
    grid: { top: 24, right: 18, bottom: 30, left: 52 },
    xAxis: { type: 'value', name: 't (s)', nameLocation: 'middle', nameGap: 22 },
    yAxis: { type: 'value', name: unit },
    series: [{
      data: time.map((t, i) => [t, data[i]]),
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color },
      areaStyle: { opacity: 0.12, color },
    }],
    tooltip: { trigger: 'axis' },
    animation: false,
  } as EChartsOption
}

export default function DataPanel() {
  const { status, result, missionType } = useSimStore()
  const [activeTab, setActiveTab] = useState<TabKey>('comparison')

  if (status !== 'complete' || !result || result.time.length === 0) {
    return <div style={emptyStyle}>仿真完成后，这里会显示与文档测试用例的对比结果。</div>
  }

  const lastIdx = result.time.length - 1
  const flightTime = result.time[lastIdx]
  const finalSoc = result.soc[lastIdx]
  const avgPower = average(result.power)
  const maxAltitude = maxBy(result.position, p => -p[2])
  const maxSpeed = maxBy(result.velocity, v => Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2))
  const totalDistance = result.position.reduce((sum, p, i) => i === 0 ? 0 : sum + distance(p, result.position[i - 1]), 0)
  const comparison = buildComparison(missionType, result)
  const passCount = comparison.rows.filter(row => row.verdict === 'pass').length
  const hasFail = comparison.rows.some(row => row.verdict === 'fail')
  const hasWarn = comparison.rows.some(row => row.verdict === 'warn')

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'comparison', label: '文档对比' },
    { key: 'summary', label: '仿真概览' },
    { key: 'charts', label: '时间曲线' },
  ]

  return (
    <div>
      <div style={tabBarStyle}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={tabStyle(activeTab === tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'comparison' && (
        <section>
          <div style={comparisonHeaderStyle}>
            <div>
              <h3 style={headingStyle}>{comparison.title}</h3>
              <p style={subtleTextStyle}>{comparison.note}</p>
            </div>
            {comparison.rows.length > 0 && (
              <StatusPill verdict={hasFail ? 'fail' : hasWarn ? 'warn' : 'pass'}>
                {passCount}/{comparison.rows.length} 项通过
              </StatusPill>
            )}
          </div>

          {comparison.rows.length === 0 ? (
            <div style={emptyStyle}>{comparison.note}</div>
          ) : (
            <div style={tableWrapStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'oklch(97% 0.005 250)' }}>
                    <th style={thStyle}>指标</th>
                    <th style={thStyle}>文档期望</th>
                    <th style={thStyle}>仿真实际</th>
                    <th style={thStyle}>偏差</th>
                    <th style={thStyle}>容差</th>
                    <th style={thStyle}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map(row => (
                    <tr key={row.metric} style={{ borderTop: '1px solid var(--border-default)' }}>
                      <td style={tdStyle}>{row.metric}</td>
                      <td style={monoTdStyle}>{row.expected}</td>
                      <td style={monoTdStyle}>{row.actual}</td>
                      <td style={monoTdStyle}>{row.error}</td>
                      <td style={monoTdStyle}>{row.tolerance}</td>
                      <td style={tdStyle}><InlineStatus verdict={row.verdict} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'summary' && (
        <section>
          <h3 style={headingStyle}>仿真概览</h3>
          <div style={summaryGridStyle}>
            <SummaryCard label="仿真时长" value={`${(flightTime / 60).toFixed(1)} min`} />
            <SummaryCard label="飞行距离" value={`${totalDistance.toFixed(1)} m`} />
            <SummaryCard label="平均功率" value={`${avgPower.toFixed(0)} W`} />
            <SummaryCard label="最高高度" value={`${maxAltitude.toFixed(1)} m`} />
            <SummaryCard label="最大速度" value={`${maxSpeed.toFixed(1)} m/s`} />
            <SummaryCard label="剩余电量" value={`${(finalSoc * 100).toFixed(1)}%`} />
          </div>
        </section>
      )}

      {activeTab === 'charts' && (
        <section>
          <h3 style={headingStyle}>时间曲线</h3>
          <div style={chartGridStyle}>
            <ChartCard title="电压" option={makeChartOption(result.time, result.voltage, 'V', '#3b82f6')} />
            <ChartCard title="电流" option={makeChartOption(result.time, result.current, 'A', '#14b8a6')} />
            <ChartCard title="功率" option={makeChartOption(result.time, result.power, 'W', '#f97316')} />
            <ChartCard title="高度" option={makeChartOption(result.time, result.position.map(p => -p[2]), 'm', '#22c55e')} />
            <ChartCard title="总推力" option={makeChartOption(result.time, result.totalThrust, 'N', '#8b5cf6')} />
            <ChartCard title="SOC" option={makeChartOption(result.time, result.soc.map(s => s * 100), '%', '#64748b')} />
          </div>
        </section>
      )}
    </div>
  )
}

function InlineStatus({ verdict }: { verdict: Verdict }) {
  if (verdict === 'pass') return <span style={statusTextStyle('#16a34a')}><CheckCircle size={14} />通过</span>
  if (verdict === 'warn') return <span style={statusTextStyle('#ca8a04')}><AlertCircle size={14} />接近边界</span>
  return <span style={statusTextStyle('#dc2626')}><XCircle size={14} />偏差较大</span>
}

function StatusPill({ verdict, children }: { verdict: Verdict; children: React.ReactNode }) {
  const color = verdict === 'pass' ? '#16a34a' : verdict === 'warn' ? '#ca8a04' : '#dc2626'
  const background = verdict === 'pass' ? 'oklch(96% 0.04 145)' : verdict === 'warn' ? 'oklch(96% 0.05 85)' : 'oklch(96% 0.04 25)'
  return <span style={{ color, background, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{children}</span>
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryCardStyle}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function ChartCard({ title, option }: { title: string; option: EChartsOption }) {
  return (
    <div style={chartCardStyle}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <ReactECharts option={option} style={{ height: 230 }} />
    </div>
  )
}

const emptyStyle: React.CSSProperties = {
  minHeight: 220,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-secondary)',
  fontSize: 14,
  border: '1px dashed var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--bg-surface)',
}

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginBottom: 24,
  padding: 4,
  background: 'oklch(96% 0.005 250)',
  borderRadius: 8,
  width: 'fit-content',
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '10px 16px',
    border: 'none',
    borderRadius: 8,
    background: active ? 'var(--bg-surface)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
  }
}

const headingStyle: React.CSSProperties = { fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }
const subtleTextStyle: React.CSSProperties = { margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }
const comparisonHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }
const tableWrapStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, overflowX: 'auto' }
const thStyle: React.CSSProperties = { padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap' }
const monoTdStyle: React.CSSProperties = { ...tdStyle, fontFamily: 'var(--font-mono)' }
const summaryGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }
const summaryCardStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }
const chartGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }
const chartCardStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 16 }

function statusTextStyle(color: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 6, color, fontWeight: 700, whiteSpace: 'nowrap' }
}
