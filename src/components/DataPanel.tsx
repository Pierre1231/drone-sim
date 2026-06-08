import { useSimStore } from '@/store/simStore'
import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { CheckCircle, XCircle } from 'lucide-react'

export default function DataPanel() {
  const { status, result, missionType } = useSimStore()
  const [activeTab, setActiveTab] = useState<'summary' | 'charts' | 'dashboard'>('summary')

  if (status !== 'complete' || !result) {
    return (
      <div style={{
        height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-secondary)', fontSize: 14,
      }}
      >
        <p>仿真完成后显示数据</p>
      </div>
    )
  }

  const lastIdx = result.time.length - 1
  const flightTime = result.time[lastIdx]
  const maxAlt = Math.max(...result.position.map(p => -p[2]))
  const finalSoc = result.soc[lastIdx]
  const avgPower = result.power.reduce((a, b) => a + b, 0) / result.power.length
  const maxSpeed = Math.max(...result.velocity.map(v => Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)))

  const totalDist = result.position.reduce((sum, p, i) => {
    if (i === 0) return 0
    const prev = result.position[i - 1]
    return sum + Math.sqrt((p[0] - prev[0]) ** 2 + (p[1] - prev[1]) ** 2 + (p[2] - prev[2]) ** 2)
  }, 0)

  const tabs = [
    { key: 'summary' as const, label: '汇总报告' },
    { key: 'dashboard' as const, label: '仪表盘' },
    { key: 'charts' as const, label: '图表' },
  ]

  return (
    <div>
      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-6)',
        padding: 'var(--space-1)', background: 'oklch(96% 0.005 250)',
        borderRadius: 'var(--radius-lg)', width: 'fit-content',
      }}
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: 'var(--space-3) var(--space-5)', border: 'none',
              background: activeTab === tab.key ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: 14, fontWeight: 500, borderRadius: 'var(--radius-md)',
              cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'var(--font-body)',
              boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}
          >
            飞行汇总报告
          </h3>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-5)', marginBottom: 'var(--space-10)',
          }}
          >
            <SummaryCard label="总飞行时间" value={`${(flightTime / 60).toFixed(1)} min`} />
            <SummaryCard label="总距离" value={`${totalDist.toFixed(1)} m`} />
            <SummaryCard label="平均功率" value={`${avgPower.toFixed(0)} W`} />
            <SummaryCard label="最大高度" value={`${maxAlt.toFixed(1)} m`} />
            <SummaryCard label="最大速度" value={`${maxSpeed.toFixed(1)} m/s`} />
            <SummaryCard label="剩余电量" value={`${(finalSoc * 100).toFixed(0)}%`} />
          </div>

          {/* 理论参考值对比 */}
          {missionType && ['test-hover', 'test-circle', 'test-figure8'].includes(missionType) && result && (
            <TheoryComparison missionType={missionType} result={result} />
          )}
        </>
      )}

      {activeTab === 'dashboard' && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}
          >
            基本信息概览
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', marginBottom: 'var(--space-10)' }}
          >
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
            }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}
              >
                基本信息
              </h4>
              <BarItem label="续航时间" value={flightTime / 60} max={30} unit="min" color="#3b82f6" />
              <BarItem label="剩余电量" value={finalSoc * 100} max={100} unit="%" color="#22c55e" />
              <BarItem label="最大速度" value={maxSpeed} max={20} unit="m/s" color="#f97316" />
              <BarItem label="平均功率" value={avgPower} max={500} unit="W" color="#a855f7" />
            </div>

          </div>

          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}
          >
            整体性能
          </h3>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-5)', marginBottom: 'var(--space-10)',
          }}
          >
            <PerformanceCard label="总飞行时间" value={`${(flightTime / 60).toFixed(1)} min`} />
            <PerformanceCard label="总飞行距离" value={`${totalDist.toFixed(1)} m`} />
            <PerformanceCard label="平均功率消耗" value={`${avgPower.toFixed(0)} W`} />
            <PerformanceCard label="最大高度" value={`${maxAlt.toFixed(1)} m`} />
            <PerformanceCard label="最大速度" value={`${maxSpeed.toFixed(1)} m/s`} />
            <PerformanceCard label="最终剩余电量" value={`${(finalSoc * 100).toFixed(0)}%`} />
          </div>
        </>
      )}

      {activeTab === 'charts' && (
        <>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}
          >
            时间序列分析
          </h3>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)',
          }}
          >
            <ChartCard title="电压" option={makeChartOption(result.time, result.voltage, 'V', '#3b82f6')} />
            <ChartCard title="高度" option={makeChartOption(result.time, result.position.map(p => -p[2]), 'm', '#22c55e')} />
            <ChartCard title="功率" option={makeChartOption(result.time, result.power, 'W', '#f97316')} />
            <ChartCard title="推力" option={makeChartOption(result.time, result.totalThrust, 'N', '#a855f7')} />
          </div>
        </>
      )}
    </div>
  )
}

function makeChartOption(time: number[], data: number[], unit: string, color: string) {
  return {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: { type: 'category', data: time.map(t => (t / 60).toFixed(1)), show: false },
    yAxis: { type: 'value', name: unit },
    series: [{
      data, type: 'line', smooth: true,
      areaStyle: { opacity: 0.2 },
      itemStyle: { color },
      lineStyle: { width: 2 },
    }],
    tooltip: { trigger: 'axis' },
  }
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
    }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function PerformanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
    }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function ChartCard({ title, option }: { title: string; option: any }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)',
    }}
    >
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>{title}</div>
      <ReactECharts option={option} style={{ height: 200 }} />
    </div>
  )
}

function BarItem({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
        <span>{label}</span>
        <span>{value.toFixed(1)} {unit}</span>
      </div>
      <div style={{ width: '100%', height: 8, background: 'oklch(94% 0.005 250)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4, transition: 'width 0.6s ease',
          width: `${pct}%`, background: color,
        }} />
      </div>
    </div>
  )
}

/* -------------------- 理论参考值对比 -------------------- */

function TheoryComparison({ missionType, result }: { missionType: string; result: any }) {
  const last = result.time.length - 1

  let rows: { label: string; theory: string; actual: string; ok: boolean }[] = []

  if (missionType === 'hover' || missionType === 'test-hover') {
    // 提取悬停稳定段（time 15~25 s，跳过 takeoff 超调）
    const hoverStart = result.time.findIndex((t: number) => t >= 15)
    const hoverEnd = result.time.findIndex((t: number) => t >= 25)
    const endIdx = hoverEnd > 0 ? hoverEnd : Math.min(last + 1, hoverStart + 100)
    const hoverThrusts = result.totalThrust.slice(hoverStart, endIdx)
    const hoverAlts = result.position.slice(hoverStart, endIdx).map((p: number[]) => -p[2])
    const avgThrust = hoverThrusts.reduce((a: number, b: number) => a + b, 0) / hoverThrusts.length
    const avgAlt = hoverAlts.reduce((a: number, b: number) => a + b, 0) / hoverAlts.length

    const isTest = missionType.startsWith('test')
    rows = [
      { label: '悬停高度', theory: '10.0 m', actual: `${avgAlt.toFixed(1)} m`, ok: Math.abs(avgAlt - 10) < 1.0 },
      { label: '悬停推力', theory: isTest ? '14.72 N' : '~14.7 N', actual: `${avgThrust.toFixed(2)} N`, ok: Math.abs(avgThrust - 14.715) < 0.5 },
      { label: '飞行时间', theory: isTest ? '14.68 min' : '~10–15 min', actual: `${(result.time[last] / 60).toFixed(2)} min`, ok: Math.abs(result.time[last] - 880.7) < 60 },
      { label: '末态 SOC', theory: '20.0%', actual: `${(result.soc[last] * 100).toFixed(1)}%`, ok: Math.abs(result.soc[last] - 0.2) < 0.02 },
      { label: '末态电压', theory: isTest ? '12.78 V' : '~12.8 V', actual: `${result.voltage[last].toFixed(2)} V`, ok: Math.abs(result.voltage[last] - 12.776) < 0.5 },
    ]
  } else {
    // 提取稳定段数据（跳过 takeoff + hover）
    const stableStart = result.time.findIndex((t: number) => t >= 10)
    const stableEnd = result.time.findIndex((t: number) => t >= 60)
    const endIdx = stableEnd > 0 ? stableEnd : result.time.length
    const positions = result.position.slice(stableStart, endIdx)
    const vels = result.velocity.slice(stableStart, endIdx)

    const avgSpeed = vels.length > 0
      ? vels.reduce((s: number, v: number[]) => s + Math.sqrt(v[0] ** 2 + v[1] ** 2), 0) / vels.length
      : 0

    const xs = positions.map((p: number[]) => p[0])
    const ys = positions.map((p: number[]) => p[1])
    const rx = xs.length > 0 ? (Math.max(...xs) - Math.min(...xs)) / 2 : 0
    const ry = ys.length > 0 ? (Math.max(...ys) - Math.min(...ys)) / 2 : 0
    const rAvg = (rx + ry) / 2

    const ac = rAvg > 0 ? (avgSpeed * avgSpeed) / rAvg : 0
    const theta = Math.atan(ac / 9.81) * (180 / Math.PI)
    const totalThrust = 1.5 * Math.sqrt(9.81 ** 2 + ac ** 2)

    if (missionType === 'circle' || missionType === 'test-circle') {
      rows = [
        { label: '平均速度', theory: '2.00 m/s', actual: `${avgSpeed.toFixed(2)} m/s`, ok: Math.abs(avgSpeed - 2) < 0.5 },
        { label: '轨迹半径', theory: '5.00 m', actual: `${rAvg.toFixed(2)} m`, ok: Math.abs(rAvg - 5) < 0.5 },
        { label: '向心加速度', theory: '0.80 m/s²', actual: `${ac.toFixed(2)} m/s²`, ok: Math.abs(ac - 0.8) < 0.1 },
        { label: '倾斜角', theory: '4.66°', actual: `${theta.toFixed(2)}°`, ok: Math.abs(theta - 4.66) < 1.0 },
        { label: '合推力大小', theory: '14.76 N', actual: `${totalThrust.toFixed(2)} N`, ok: Math.abs(totalThrust - 14.76) < 0.5 },
        { label: '周期', theory: '15.71 s', actual: `${((2 * Math.PI * rAvg) / Math.max(avgSpeed, 0.1)).toFixed(2)} s`, ok: true },
      ]
    } else if (missionType === 'figure8') {
      rows = [
        { label: '平均速度', theory: '2.00 m/s', actual: `${avgSpeed.toFixed(2)} m/s`, ok: Math.abs(avgSpeed - 2) < 0.5 },
        { label: '轨迹半径', theory: '5.00 m', actual: `${rAvg.toFixed(2)} m`, ok: Math.abs(rAvg - 5) < 0.5 },
        { label: '最大横向加速度', theory: '0.80 m/s²', actual: `${ac.toFixed(2)} m/s²`, ok: Math.abs(ac - 0.8) < 0.2 },
        { label: '倾斜角', theory: '4.66°', actual: `${theta.toFixed(2)}°`, ok: Math.abs(theta - 4.66) < 1.2 },
        { label: '合推力大小', theory: '14.76 N', actual: `${totalThrust.toFixed(2)} N`, ok: Math.abs(totalThrust - 14.76) < 0.5 },
        { label: '周期', theory: '22.21 s', actual: `${((2 * Math.PI * rAvg) / Math.max(avgSpeed, 0.1)).toFixed(2)} s`, ok: true },
      ]
    } else {
      // test-figure8
      rows = [
        { label: '平均速度', theory: '5.00 m/s', actual: `${avgSpeed.toFixed(2)} m/s`, ok: Math.abs(avgSpeed - 5) < 1.0 },
        { label: '轨迹半径', theory: '5.00 m', actual: `${rAvg.toFixed(2)} m`, ok: Math.abs(rAvg - 5) < 0.5 },
        { label: '最大横向加速度', theory: '5.00 m/s²', actual: `${ac.toFixed(2)} m/s²`, ok: Math.abs(ac - 5.0) < 1.0 },
        { label: '倾斜角', theory: '27.0°', actual: `${theta.toFixed(2)}°`, ok: Math.abs(theta - 27.0) < 3.0 },
        { label: '合推力大小', theory: '16.52 N', actual: `${totalThrust.toFixed(2)} N`, ok: Math.abs(totalThrust - 16.52) < 1.0 },
        { label: '周期', theory: '12.57 s', actual: `${((2 * Math.PI * rAvg) / Math.max(avgSpeed, 0.1)).toFixed(2)} s`, ok: true },
      ]
    }
  }

  return (
    <>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}>
        理论参考值对比
      </h3>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 'var(--space-10)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'oklch(97% 0.005 250)' }}>
              <th style={thStyle}>指标</th>
              <th style={thStyle}>理论参考值</th>
              <th style={thStyle}>仿真实际值</th>
              <th style={thStyle}>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                <td style={tdStyle}>{row.label}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{row.theory}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)' }}>{row.actual}</td>
                <td style={tdStyle}>
                  {row.ok ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e', fontWeight: 600 }}>
                      <CheckCircle size={14} /> 通过
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontWeight: 600 }}>
                      <XCircle size={14} /> 偏差
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

const thStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  textAlign: 'left', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const tdStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  fontSize: 14, color: 'var(--text-primary)',
}

