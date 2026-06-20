import { useRef, useState } from 'react'
import { Battery, Cpu, Fan, Gauge, Package, Play, Shield, Square } from 'lucide-react'
import { useConfigStore, defaultConfig } from '@/store/configStore'
import { useSimStore } from '@/store/simStore'
import { getBatteryCells, getESCs, getFrames, getMotors, getPropellers } from '@/lib/database'
import { buildDocAlignedSimConfig, getDronePresets, getPresetById } from '@/lib/presets'
import type { SimConfig } from '@/lib/simulation'

const missionOptions: { id: SimConfig['missionType']; label: string; description: string }[] = [
  { id: 'hover', label: 'B01 悬停', description: '5 m 悬停，推进系统从文档悬停平衡点初始化，运行到 SOC=20%。' },
  { id: 'fullspeed', label: 'B02 5 m/s 直线', description: '无风条件下保持 5 m 高度，沿 +x_n 方向 5 m/s 匀速飞行。' },
  { id: 'circle', label: 'B03 圆轨迹 2 m/s', description: '半径 5 m、高度 5 m、速度 2 m/s 的圆形轨迹。' },
  { id: 'test-circle-7', label: 'B03 圆轨迹 7 m/s', description: '半径 5 m、高度 5 m、速度 7 m/s 的圆形轨迹，对比 SOC=20% 时间。' },
]

export default function ConfigPanel() {
  const { config, setConfig } = useConfigStore()
  const { status, progress, setStatus, setProgress, setResult, setError, setMissionType, reset } = useSimStore()
  const [selectedPresetId, setSelectedPresetId] = useState('test-standard')
  const workerRef = useRef<Worker | null>(null)

  const frames = getFrames()
  const motors = getMotors()
  const propellers = getPropellers()
  const batteryCells = getBatteryCells()
  const escs = getESCs()
  const presets = getDronePresets()
  const activeMission = missionOptions.find(item => item.id === config.missionType) ?? missionOptions[0]

  function startSimulation() {
    const simConfig = buildDocAlignedSimConfig(config.missionType)

    reset()
    setMissionType(config.missionType)
    setStatus('running')

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
    workerRef.current?.postMessage({ type: 'cancel' })
    workerRef.current?.terminate()
    workerRef.current = null
    reset()
  }

  return (
    <section id="config" style={{ width: '100%', padding: 'var(--space-16) var(--space-6)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={sectionTitleStyle}>文档工况配置</h2>
          <p style={sectionTextStyle}>仿真参数严格使用《四旋翼仿真测试用例.md》的 test-standard 固定参数；下方部件信息用于查看文档默认配置。</p>
        </div>

        <div style={presetStyle}>
          <Package size={18} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-primary)' }}>整机预设</span>
          <select
            value={selectedPresetId}
            onChange={e => {
              const preset = getPresetById(e.target.value)
              if (preset) {
                setSelectedPresetId(e.target.value)
                setConfig({ ...defaultConfig, ...preset.config })
              }
            }}
            style={selectInlineStyle}
          >
            {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>文档对比建议保持 test-standard。</span>
        </div>

        <div style={gridStyle}>
          <ConfigCard icon={<Shield size={18} />} title="机架与整机">
            <SelectField label="机架型号" value={config.frameId} onChange={v => setConfig({ frameId: v })} options={frames.map(f => ({ value: f.id, label: f.name }))} />
            <SelectField label="布局" value={config.config ?? 'X'} onChange={v => setConfig({ config: v as '+' | 'X' })} options={[{ value: 'X', label: 'X 型' }, { value: '+', label: '+ 型' }]} />
            <NumberField label="整机质量 (kg)" value={config.totalWeight} onChange={v => setConfig({ totalWeight: v })} step={0.1} min={0.1} />
          </ConfigCard>
          <ConfigCard icon={<Cpu size={18} />} title="电机与电调">
            <SelectField label="电机型号" value={config.motorId} onChange={v => setConfig({ motorId: v })} options={motors.map(m => ({ value: m.id, label: m.name }))} />
            <SelectField label="电调型号" value={config.escId} onChange={v => setConfig({ escId: v })} options={escs.map(e => ({ value: e.id, label: e.name }))} />
          </ConfigCard>
          <ConfigCard icon={<Fan size={18} />} title="螺旋桨">
            <SelectField label="螺旋桨型号" value={config.propellerId} onChange={v => setConfig({ propellerId: v })} options={propellers.map(p => ({ value: p.id, label: p.name }))} />
          </ConfigCard>
          <ConfigCard icon={<Battery size={18} />} title="电池">
            <SelectField label="电芯型号" value={config.batteryCellId} onChange={v => setConfig({ batteryCellId: v })} options={batteryCells.map(b => ({ value: b.id, label: b.name }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <NumberField label="串数 (S)" value={config.batteryCells} onChange={v => setConfig({ batteryCells: v })} step={1} min={1} max={12} />
              <NumberField label="容量 (mAh)" value={config.batteryCapacity} onChange={v => setConfig({ batteryCapacity: v })} step={100} min={100} />
            </div>
          </ConfigCard>
          <ConfigCard icon={<Gauge size={18} />} title="安全约束">
            <NumberField label="低电压阈值 (V)" value={config.lowVoltageThreshold} onChange={v => setConfig({ lowVoltageThreshold: v })} step={0.5} min={6} max={30} />
          </ConfigCard>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>文档工况</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {missionOptions.map(item => (
              <TaskButton key={item.id} active={config.missionType === item.id} onClick={() => setConfig({ missionType: item.id })}>
                {item.label}
              </TaskButton>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>{activeMission.description}</p>
        </div>

        {status === 'running' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={cancelSimulation} style={dangerButtonStyle}><Square size={18} />取消仿真</button>
            <div style={{ flex: 1 }}>
              <div style={{ height: 4, background: 'oklch(92% 0.005 250)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${progress * 100}%`, transition: 'width 0.3s ease' }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{(progress * 100).toFixed(0)}%</p>
            </div>
          </div>
        ) : (
          <button onClick={startSimulation} style={primaryButtonStyle}><Play size={18} />开始仿真</button>
        )}
      </div>
    </section>
  )
}

function ConfigCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, color: 'var(--text-primary)', fontWeight: 700 }}>
        <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
        {title}
      </div>
      {children}
    </div>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  )
}

function NumberField({ label, value, onChange, step = 1, min, max }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <input type="number" value={value} step={step} min={min} max={max} onChange={e => onChange(parseFloat(e.target.value) || 0)} style={inputStyle} />
    </label>
  )
}

function TaskButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: '10px 14px', border: '1px solid var(--border-default)', borderRadius: 8, background: active ? 'var(--accent-subtle)' : 'var(--bg-surface)', color: active ? 'var(--accent-primary)' : 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }}>
      {children}
    </button>
  )
}

const sectionTitleStyle: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }
const sectionTextStyle: React.CSSProperties = { fontSize: 16, color: 'var(--text-secondary)', maxWidth: 720 }
const presetStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--accent-subtle)', borderRadius: 8, marginBottom: 24, border: '1px solid var(--accent-primary)', flexWrap: 'wrap' }
const selectInlineStyle: React.CSSProperties = { padding: '10px 12px', border: '1px solid var(--accent-primary)', borderRadius: 8, background: 'var(--bg-surface)', color: 'var(--text-primary)' }
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }
const fieldStyle: React.CSSProperties = { display: 'block', marginBottom: 12 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--bg-surface)', color: 'var(--text-primary)' }
const primaryButtonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 22px', border: 'none', borderRadius: 8, background: 'var(--accent-primary)', color: 'var(--text-inverse)', fontWeight: 700, cursor: 'pointer' }
const dangerButtonStyle: React.CSSProperties = { ...primaryButtonStyle, background: 'var(--status-danger)' }
