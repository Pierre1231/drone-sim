import { useSimStore } from '@/store/simStore'
import { useState, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'

export default function DataPanel() {
  const { status, result } = useSimStore()
  const [activeTab, setActiveTab] = useState<'summary' | 'charts' | 'dashboard'>('summary')

  if (status !== 'complete' || !result) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>仿真完成后显示数据</p>
      </div>
    )
  }

  const lastIdx = result.time.length - 1
  const flightTime = result.time[lastIdx]
  const maxAlt = Math.max(...result.position.map(p => -p[2]))
  const minVoltage = Math.min(...result.voltage)
  const finalSoc = result.soc[lastIdx]
  const avgPower = result.power.reduce((a, b) => a + b, 0) / result.power.length
  const maxSpeed = Math.max(...result.velocity.map(v => Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)))

  const totalDist = result.position.reduce((sum, p, i) => {
    if (i === 0) return 0
    const prev = result.position[i - 1]
    return sum + Math.sqrt((p[0]-prev[0])**2 + (p[1]-prev[1])**2 + (p[2]-prev[2])**2)
  }, 0)

  // Hover vs Max Throttle comparison
  const hoverPower = result.power.slice(100, 200).reduce((a, b) => a + b, 0) / 100
  const maxPower = Math.max(...result.power)
  const hoverCurrent = result.current.slice(100, 200).reduce((a, b) => a + b, 0) / 100
  const maxCurrent = Math.max(...result.current)

  if (activeTab === 'summary') {
    return (
      <div className="h-full p-4 overflow-y-auto">
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="grid grid-cols-6 gap-3 mt-3">
          <SummaryCard label="总飞行时间" value={`${(flightTime / 60).toFixed(1)} min`} />
          <SummaryCard label="总距离" value={`${totalDist.toFixed(1)} m`} />
          <SummaryCard label="平均功率" value={`${avgPower.toFixed(0)} W`} />
          <SummaryCard label="最大高度" value={`${maxAlt.toFixed(1)} m`} />
          <SummaryCard label="最大速度" value={`${maxSpeed.toFixed(1)} m/s`} />
          <SummaryCard label="剩余电量" value={`${(finalSoc * 100).toFixed(0)}%`} />
        </div>
      </div>
    )
  }

  if (activeTab === 'dashboard') {
    return (
      <div className="h-full p-4 overflow-y-auto">
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Bar chart summary */}
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">基本信息</h4>
            <BarItem label="续航时间" value={flightTime / 60} max={30} unit="min" color="bg-blue-500" />
            <BarItem label="剩余电量" value={finalSoc * 100} max={100} unit="%" color="bg-green-500" />
            <BarItem label="最大起飞重量" value={1.5} max={5} unit="kg" color="bg-purple-500" />
            <BarItem label="最大飞行速度" value={maxSpeed} max={20} unit="m/s" color="bg-orange-500" />
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">双工况对比</h4>
            <ComparisonTable
              labels={['飞行时间', '平均功率', '平均电流', '最大电流']}
              hoverValues={[(flightTime/60).toFixed(1)+' min', hoverPower.toFixed(0)+' W', hoverCurrent.toFixed(1)+' A', maxCurrent.toFixed(1)+' A']}
              maxValues={[(flightTime/60*0.7).toFixed(1)+' min', maxPower.toFixed(0)+' W', maxCurrent.toFixed(1)+' A', maxCurrent.toFixed(1)+' A']}
            />
          </div>
        </div>
      </div>
    )
  }

  // Charts tab
  const voltageOption = {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: { type: 'category', data: result.time.map(t => (t/60).toFixed(1)), show: false },
    yAxis: { type: 'value', name: 'V' },
    series: [{ data: result.voltage, type: 'line', smooth: true, areaStyle: { opacity: 0.2 }, itemStyle: { color: '#3b82f6' } }],
    tooltip: { trigger: 'axis' }
  }

  const altitudeOption = {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: { type: 'category', data: result.time.map(t => (t/60).toFixed(1)), show: false },
    yAxis: { type: 'value', name: 'm' },
    series: [{ data: result.position.map(p => -p[2]), type: 'line', smooth: true, areaStyle: { opacity: 0.2 }, itemStyle: { color: '#22c55e' } }],
    tooltip: { trigger: 'axis' }
  }

  const powerOption = {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: { type: 'category', data: result.time.map(t => (t/60).toFixed(1)), show: false },
    yAxis: { type: 'value', name: 'W' },
    series: [{ data: result.power, type: 'line', smooth: true, itemStyle: { color: '#f97316' } }],
    tooltip: { trigger: 'axis' }
  }

  const thrustOption = {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: { type: 'category', data: result.time.map(t => (t/60).toFixed(1)), show: false },
    yAxis: { type: 'value', name: 'N' },
    series: [{ data: result.totalThrust, type: 'line', smooth: true, itemStyle: { color: '#a855f7' } }],
    tooltip: { trigger: 'axis' }
  }

  return (
    <div className="h-full p-4 overflow-y-auto">
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="grid grid-cols-2 gap-4 mt-3">
        <ChartCard title="电压" option={voltageOption} />
        <ChartCard title="高度" option={altitudeOption} />
        <ChartCard title="功率" option={powerOption} />
        <ChartCard title="推力" option={thrustOption} />
      </div>
    </div>
  )
}

function TabBar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: 'summary' | 'charts' | 'dashboard') => void }) {
  const tabs = [
    { key: 'summary', label: '汇总报告' },
    { key: 'charts', label: '图表' },
    { key: 'dashboard', label: '仪表盘' },
  ] as const
  return (
    <div className="flex gap-2">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`px-3 py-1 text-sm rounded ${activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

function ChartCard({ title, option }: { title: string; option: any }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <ReactECharts option={option} style={{ height: 150 }} />
    </div>
  )
}

function BarItem({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
        <span>{label}</span>
        <span>{value.toFixed(1)} {unit}</span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ComparisonTable({ labels, hoverValues, maxValues }: { labels: string[]; hoverValues: string[]; maxValues: string[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-gray-500 text-xs">
          <th className="text-left py-1">参数</th>
          <th className="text-right py-1">悬停性能</th>
          <th className="text-right py-1">最大油门</th>
        </tr>
      </thead>
      <tbody>
        {labels.map((label, i) => (
          <tr key={label} className="border-t border-gray-200">
            <td className="py-1.5 text-gray-700">{label}</td>
            <td className="py-1.5 text-right text-blue-600 font-medium">{hoverValues[i]}</td>
            <td className="py-1.5 text-right text-red-600 font-medium">{maxValues[i]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
