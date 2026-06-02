import ConfigPanel from '@/components/ConfigPanel'
import PlaybackPanel from '@/components/PlaybackPanel'

function App() {
  return (
    <div className="h-screen flex flex-col">
      {/* 配置区 */}
      <div className="h-[300px] bg-blue-50 border-b border-blue-200 overflow-hidden">
        <ConfigPanel />
      </div>

      {/* 3D 回放区 */}
      <div className="flex-1 bg-gray-900">
        <PlaybackPanel />
      </div>

      {/* 数据展示区 */}
      <div className="h-[250px] bg-white border-t border-gray-200">
        <DataPanel />
      </div>
    </div>
  )
}

import { useSimStore } from '@/store/simStore'
import { useState } from 'react'

function DataPanel() {
  const { status, result } = useSimStore()
  const [activeTab, setActiveTab] = useState<'summary' | 'charts'>('summary')

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
  const totalDist = result.position.reduce((sum, p, i) => {
    if (i === 0) return 0
    const prev = result.position[i - 1]
    return sum + Math.sqrt((p[0]-prev[0])**2 + (p[1]-prev[1])**2 + (p[2]-prev[2])**2)
  }, 0)

  if (activeTab === 'summary') {
    return (
      <div className="h-full p-4">
        <div className="flex gap-2 mb-3">
          <button onClick={() => setActiveTab('summary')} className={`px-3 py-1 text-sm rounded ${activeTab === 'summary' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>汇总报告</button>
          <button onClick={() => setActiveTab('charts')} className={`px-3 py-1 text-sm rounded ${activeTab === 'charts' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>图表</button>
        </div>
        <div className="grid grid-cols-6 gap-4">
          <SummaryCard label="总飞行时间" value={`${(flightTime / 60).toFixed(1)} min`} />
          <SummaryCard label="总距离" value={`${totalDist.toFixed(1)} m`} />
          <SummaryCard label="平均功率" value={`${(avgPower).toFixed(0)} W`} />
          <SummaryCard label="最大高度" value={`${maxAlt.toFixed(1)} m`} />
          <SummaryCard label="最低电压" value={`${minVoltage.toFixed(2)} V`} />
          <SummaryCard label="剩余电量" value={`${(finalSoc * 100).toFixed(0)}%`} />
        </div>
      </div>
    )
  }

  // Simple ASCII charts
  return (
    <div className="h-full p-4">
      <div className="flex gap-2 mb-3">
        <button onClick={() => setActiveTab('summary')} className={`px-3 py-1 text-sm rounded ${activeTab === 'summary' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>汇总报告</button>
        <button onClick={() => setActiveTab('charts')} className={`px-3 py-1 text-sm rounded ${activeTab === 'charts' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>图表</button>
      </div>
      <div className="grid grid-cols-3 gap-4 h-[calc(100%-3rem)]">
        <SimpleChart title="电压 (V)" data={result.voltage} color="#3b82f6" min={Math.min(...result.voltage) * 0.9} max={Math.max(...result.voltage) * 1.05} />
        <SimpleChart title="高度 (m)" data={result.position.map(p => -p[2])} color="#22c55e" min={0} max={Math.max(...result.position.map(p => -p[2])) * 1.2} />
        <SimpleChart title="功率 (W)" data={result.power} color="#f97316" min={0} max={Math.max(...result.power) * 1.2} />
      </div>
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

function SimpleChart({ title, data, color, min, max }: { title: string; data: number[]; color: string; min: number; max: number }) {
  const width = 300
  const height = 120
  const step = width / (data.length - 1)
  const points = data.map((v, i) => {
    const x = i * step
    const y = height - ((v - min) / (max - min)) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <svg width={width} height={height} className="overflow-visible">
        <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
    </div>
  )
}

export default App
