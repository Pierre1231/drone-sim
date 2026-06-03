import { useSimStore } from '@/store/simStore'
import { useState } from 'react'
import ReactECharts from 'echarts-for-react'

export default function DataPanel() {
  const { status, result } = useSimStore()
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

  const hoverPower = result.power.slice(100, 200).reduce((a, b) => a + b, 0) / 100
  const maxPower = Math.max(...result.power)
  const hoverCurrent = result.current.slice(100, 200).reduce((a, b) => a + b, 0) / 100
  const maxCurrent = Math.max(...result.current)

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

            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
            }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}
              >
                双工况对比
              </h4>
              <ComparisonTable
                labels={['飞行时间', '平均功率', '平均电流', '最大电流']}
                hoverValues={[`${(flightTime / 60).toFixed(1)} min`, `${hoverPower.toFixed(0)} W`, `${hoverCurrent.toFixed(1)} A`, `${maxCurrent.toFixed(1)} A`]}
                maxValues={[`${(flightTime / 60 * 0.5).toFixed(1)} min`, `${maxPower.toFixed(0)} W`, `${maxCurrent.toFixed(1)} A`, `${maxCurrent.toFixed(1)} A`]}
              />
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

function ComparisonTable({ labels, hoverValues, maxValues }: { labels: string[]; hoverValues: string[]; maxValues: string[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{
            padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 12, fontWeight: 600,
            color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em',
            background: 'oklch(97% 0.005 250)',
          }}
          >
            参数
          </th>
          <th style={{
            padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontSize: 12, fontWeight: 600,
            color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em',
            background: 'oklch(97% 0.005 250)',
          }}
          >
            悬停性能
          </th>
          <th style={{
            padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontSize: 12, fontWeight: 600,
            color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em',
            background: 'oklch(97% 0.005 250)',
          }}
          >
            最大油门
          </th>
        </tr>
      </thead>
      <tbody>
        {labels.map((label, i) => (
          <tr key={label} style={{ borderBottom: '1px solid var(--border-default)' }}>
            <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 14, color: 'var(--text-primary)' }}>{label}</td>
            <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>{hoverValues[i]}</td>
            <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', color: 'var(--status-danger)', fontWeight: 600 }}>{maxValues[i]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
