import { useConfigStore } from '@/store/configStore'
import { useSimStore } from '@/store/simStore'
import { getFrames, getMotors, getPropellers, getBatteryCells, getESCs, getFrameById, getMotorById, getPropellerById, getBatteryCellById, getESCById } from '@/lib/database'
import { estimateHoverPerformance } from '@/lib/estimation'
import type { SimConfig } from '@/lib/simulation'
import { Gauge, Wind, Cpu, Fan, Battery, Shield, Play, Square } from 'lucide-react'

export default function ConfigPanel() {
  const { config, setConfig } = useConfigStore()
  const { status, progress, setStatus, setProgress, setResult, setError, reset } = useSimStore()
  const workerRef = useRef<Worker | null>(null)

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

      {/* Simulation control */}
      <div className="flex items-center gap-3 pt-2">
        {status === 'running' ? (
          <>
            <button
              onClick={cancelSimulation}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
            >
              <Square size={16} /> 取消
            </button>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{(progress * 100).toFixed(0)}%</p>
            </div>
          </>
        ) : (
          <button
            onClick={startSimulation}
            disabled={!config.motorId || !config.propellerId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Play size={16} /> 开始仿真
          </button>
        )}
      </div>
    </div>
  )

  function startSimulation() {
    if (!config.motorId || !config.propellerId) return

    const frame = getFrameById(config.frameId)
    const motor = getMotorById(config.motorId)
    const prop = getPropellerById(config.propellerId)
    const cell = getBatteryCellById(config.batteryCellId)
    const esc = getESCById(config.escId)

    if (!motor || !prop) return

    reset()
    setStatus('running')

    const simConfig: SimConfig = {
      missionType: 'hover',
      droneConfig: config,
      frameMass: frame?.mass ?? 0.28,
      motorParams: {
        resistance: motor.resistance,
        backEmfCoeff: motor.backEmfCoeff,
        torqueCoeff: motor.torqueCoeff,
        rotorInertia: motor.rotorInertia,
        viscousDamping: motor.viscousDamping,
      },
      propParams: {
        diameter: prop.diameter,
        thrustCurve: prop.thrustCurve,
        torqueCurve: prop.torqueCurve,
        torqueThrustRatio: prop.torqueThrustRatio,
      },
      batteryParams: {
        cells: config.batteryCells,
        capacityAh: config.batteryCapacity / 1000,
        ocvCoeffs: cell?.ocvCoeffs ?? [3.0, 3.5, -2.0, 1.0],
        internalResistance: (cell?.internalResistance ?? 0.002) * config.batteryCells + config.batteryInternalResistance / 1000,
      },
      escParams: {
        maxCurrent: esc?.maxCurrent ?? 30,
        resistance: esc?.resistance ?? 0.003,
      },
      inertia: frame?.inertiaMatrix.map(row => row.reduce((a, b) => a + b, 0) / 3) as [number, number, number] ?? [0.008, 0.008, 0.015],
      armLength: (frame?.wheelbase ?? 450) / 1000 / Math.sqrt(2),
    }

    const worker = new Worker(new URL('@/workers/simulation.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker

    worker.onmessage = (e) => {
      const { type, progress, result, error } = e.data
      if (type === 'progress') {
        setProgress(progress.progress)
      } else if (type === 'complete') {
        setResult(result)
        worker.terminate()
      } else if (type === 'error') {
        setError(error)
        worker.terminate()
      }
    }

    worker.postMessage({ type: 'start', config: simConfig })
  }

  function cancelSimulation() {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'cancel' })
      workerRef.current.terminate()
      workerRef.current = null
    }
    reset()
  }
}

import React, { useRef } from 'react'

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
