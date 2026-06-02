import { useConfigStore } from '@/store/configStore'
import { getFrames, getMotors, getPropellers, getBatteryCells, getESCs } from '@/lib/database'
import { estimateHoverPerformance } from '@/lib/estimation'
import { Gauge, Wind, Cpu, Fan, Battery, Shield } from 'lucide-react'

export default function ConfigPanel() {
  const { config, setConfig } = useConfigStore()

  const frames = getFrames()
  const motors = getMotors()
  const propellers = getPropellers()
  const batteryCells = getBatteryCells()
  const escs = getESCs()

  // Real-time estimation
  const estimation = React.useMemo(() => {
    if (!config.motorId || !config.propellerId || config.batteryCapacity <= 0) return null
    try {
      return estimateHoverPerformance({
        totalWeightKg: config.totalWeight,
        propDiameterIn: propellers.find(p => p.id === config.propellerId)?.diameter
          ? propellers.find(p => p.id === config.propellerId)!.diameter / 0.0254
          : 9,
        batteryCapacityMah: config.batteryCapacity,
        batteryCells: config.batteryCells,
        motorEfficiency: 0.75,
      })
    } catch {
      return null
    }
  }, [config, propellers])

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Environment */}
      <ConfigGroup icon={<Wind size={18} />} title="环境参数" color="text-gray-600">
        <div className="grid grid-cols-3 gap-3">
          <ReadOnlyField label="温度" value={`${config.temperature}°C`} />
          <ReadOnlyField label="气压" value={`${config.pressure} hPa`} />
          <ReadOnlyField label="高度" value={`${config.altitude} m`} />
        </div>
      </ConfigGroup>

      {/* Frame */}
      <ConfigGroup icon={<Shield size={18} />} title="机架" color="text-blue-600">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="机架型号"
            value={config.frameId}
            onChange={v => setConfig({ frameId: v })}
            options={[{ value: '', label: '请选择...' }, ...frames.map(f => ({ value: f.id, label: f.name }))]}
          />
          <NumberField
            label="整机重量 (kg)"
            value={config.totalWeight}
            onChange={v => setConfig({ totalWeight: v })}
            step={0.1}
            min={0.1}
          />
        </div>
      </ConfigGroup>

      {/* Motor + ESC */}
      <ConfigGroup icon={<Cpu size={18} />} title="电机及电调" color="text-green-600">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="电机型号"
            value={config.motorId}
            onChange={v => setConfig({ motorId: v })}
            options={[{ value: '', label: '请选择...' }, ...motors.map(m => ({ value: m.id, label: m.name }))]}
          />
          <SelectField
            label="电调型号"
            value={config.escId}
            onChange={v => setConfig({ escId: v })}
            options={[{ value: '', label: '请选择...' }, ...escs.map(e => ({ value: e.id, label: e.name }))]}
          />
          <NumberField
            label="安全起飞油门上限 (%)"
            value={config.maxThrottlePercent}
            onChange={v => setConfig({ maxThrottlePercent: v })}
            step={5}
            min={50}
            max={100}
          />
        </div>
      </ConfigGroup>

      {/* Propeller */}
      <ConfigGroup icon={<Fan size={18} />} title="螺旋桨" color="text-purple-600">
        <SelectField
          label="螺旋桨型号"
          value={config.propellerId}
          onChange={v => setConfig({ propellerId: v })}
          options={[{ value: '', label: '请选择...' }, ...propellers.map(p => ({ value: p.id, label: p.name }))]}
        />
      </ConfigGroup>

      {/* Battery */}
      <ConfigGroup icon={<Battery size={18} />} title="电池" color="text-orange-600">
        <div className="grid grid-cols-3 gap-3">
          <SelectField
            label="电芯型号"
            value={config.batteryCellId}
            onChange={v => setConfig({ batteryCellId: v })}
            options={[{ value: '', label: '请选择...' }, ...batteryCells.map(b => ({ value: b.id, label: b.name }))]}
          />
          <NumberField label="串数 (S)" value={config.batteryCells} onChange={v => setConfig({ batteryCells: v })} step={1} min={1} max={12} />
          <NumberField label="容量 (mAh)" value={config.batteryCapacity} onChange={v => setConfig({ batteryCapacity: v })} step={100} min={100} />
          <NumberField label="放电倍率 (C)" value={config.batteryDischargeRate} onChange={v => setConfig({ batteryDischargeRate: v })} step={1} min={1} />
          <NumberField label="内阻 (mΩ)" value={config.batteryInternalResistance} onChange={v => setConfig({ batteryInternalResistance: v })} step={1} min={1} />
          <NumberField label="重量 (g)" value={config.batteryWeight} onChange={v => setConfig({ batteryWeight: v })} step={10} min={10} />
        </div>
      </ConfigGroup>

      {/* Safety */}
      <ConfigGroup icon={<Gauge size={18} />} title="安全参数" color="text-red-600">
        <NumberField
          label="低电压保护阈值 (V)"
          value={config.lowVoltageThreshold}
          onChange={v => setConfig({ lowVoltageThreshold: v })}
          step={0.5}
          min={6}
          max={30}
        />
      </ConfigGroup>

      {/* Real-time estimation */}
      {estimation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 font-medium">
            预计悬停时间：~{estimation.hoverTimeMin.toFixed(1)} 分钟 | 预计电流：~{estimation.currentA.toFixed(1)} A
          </p>
        </div>
      )}
    </div>
  )
}

import React from 'react'

function ConfigGroup({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function NumberField({ label, value, onChange, step = 1, min, max }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="px-2 py-1.5 text-sm bg-gray-100 rounded-md text-gray-600">{value}</div>
    </div>
  )
}
