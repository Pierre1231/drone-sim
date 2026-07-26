import { useMemo, useState } from 'react'
import { useConfigStore } from '@/store/configStore'
import { estimateEndurance } from '@/lib/selectionEngine'
import { getBatteryCells, getESCs, getFrames, getMotors, getPropellers } from '@/lib/database'
import type { DroneConfig } from '@/store/configStore'
import SelectionDroneModel from '@/components/SelectionDroneModel'
import FlightResultVisual from '@/components/FlightResultVisual'
import SelectionStarfield from '@/components/SelectionStarfield'

type PartKey = 'frame' | 'motor' | 'propeller' | 'esc' | 'battery'
type Estimate = ReturnType<typeof estimateEndurance>

interface SelectFieldProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="selection-field">
      <span>{label}</span>
      <select className="ds-select" value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function NumberField({ label, value, min, max, step, suffix, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix: string
  onChange: (value: number) => void
}) {
  return (
    <label className="selection-field">
      <span>{label}</span>
      <div className="selection-number-input">
        <input className="ds-input" type="number" value={value} min={min} max={max} step={step} onChange={event => onChange(Number(event.target.value))} />
        <small>{suffix}</small>
      </div>
    </label>
  )
}

const presets: { label: string; config: Partial<DroneConfig> }[] = [
  { label: 'F450 标准版', config: { frameId: 'f450', motorId: '2212-920', escId: 'esc-30a', propellerId: '9450', batteryCellId: 'lipo-3.7', batteryCells: 4, batteryCapacity: 5000, totalWeight: 1.5 } },
  { label: 'F450 增强版', config: { frameId: 'f450', motorId: '2212-1000', escId: 'esc-40a', propellerId: '1045', batteryCellId: 'lipo-3.7', batteryCells: 4, batteryCapacity: 5000, totalWeight: 1.6 } },
]

const partLabels: { key: PartKey; name: string; hint: string }[] = [
  { key: 'propeller', name: '螺旋桨', hint: '尺寸与桨距' },
  { key: 'motor', name: '电机', hint: 'KV 与推力' },
  { key: 'frame', name: '机架', hint: '轴距与结构' },
  { key: 'battery', name: '电池', hint: '电压与容量' },
  { key: 'esc', name: '电调', hint: '持续电流' },
]

export default function SelectionPage() {
  const { config, setConfig } = useConfigStore()
  const [activePart, setActivePart] = useState<PartKey>('frame')
  const [calculated, setCalculated] = useState<Estimate | null>(null)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const frames = useMemo(() => getFrames().map(item => ({ value: item.id, label: `${item.name} (${item.mass * 1000}g)` })), [])
  const motors = useMemo(() => getMotors().map(item => ({ value: item.id, label: `${item.name} (${item.kv}KV)` })), [])
  const propellers = useMemo(() => getPropellers().map(item => ({ value: item.id, label: item.name })), [])
  const escs = useMemo(() => getESCs().map(item => ({ value: item.id, label: `${item.name} (${item.maxCurrent}A)` })), [])
  const cells = useMemo(() => getBatteryCells().map(item => ({ value: item.id, label: item.name })), [])
  const update = (partial: Partial<DroneConfig>) => { setConfig(partial); setCalculated(null); setActivePreset(null) }

  const configPanel = {
    frame: <SelectField label="机架规格" value={config.frameId} options={[{ value: '', label: '请选择机架' }, ...frames]} onChange={value => update({ frameId: value })} />,
    motor: <SelectField label="电机规格（四只）" value={config.motorId} options={[{ value: '', label: '请选择电机' }, ...motors]} onChange={value => update({ motorId: value })} />,
    propeller: <SelectField label="螺旋桨规格（四副）" value={config.propellerId} options={[{ value: '', label: '请选择螺旋桨' }, ...propellers]} onChange={value => update({ propellerId: value })} />,
    esc: <SelectField label="电调规格（四只）" value={config.escId} options={[{ value: '', label: '请选择电调' }, ...escs]} onChange={value => update({ escId: value })} />,
    battery: <div className="selection-battery-fields">
      <SelectField label="电芯类型" value={config.batteryCellId} options={[{ value: '', label: '请选择电芯' }, ...cells]} onChange={value => update({ batteryCellId: value })} />
      <NumberField label="串联节数" value={config.batteryCells} min={1} max={12} step={1} suffix="S" onChange={value => update({ batteryCells: value })} />
      <NumberField label="电池容量" value={config.batteryCapacity} min={100} max={50000} step={100} suffix="mAh" onChange={value => update({ batteryCapacity: value })} />
    </div>,
  }

  return (
    <div className="selection-page">
      <SelectionStarfield />
      <header className="selection-heading">
        <div>
          <p className="selection-eyebrow">QUADCOPTER CONFIGURATOR</p>
          <h1 className="ds-display">四旋翼无人机选型</h1>
          <p>点击模型上的部件，逐项完成配置，再计算悬停与高速前飞续航。</p>
        </div>
        <div className="selection-presets">
          {presets.map(preset => <button key={preset.label} className={`ds-button secondary ${activePreset === preset.label ? 'active' : ''}`} aria-pressed={activePreset === preset.label} onClick={() => { setConfig(preset.config); setCalculated(null); setActivePreset(preset.label) }}>{preset.label}</button>)}
        </div>
      </header>

      <section className="selection-workspace ds-fade-in">
        <div className="selection-model-stage">
          <SelectionDroneModel activePart={activePart} onSelect={setActivePart} />
          {partLabels.map(part => (
            <button key={part.key} className={`selection-part selection-part--${part.key} ${activePart === part.key ? 'active' : ''}`} onClick={() => setActivePart(part.key)}>
              <strong>{part.name}</strong><span>{part.hint}</span>
            </button>
          ))}
        </div>
        <aside className="selection-config-panel">
          <div className="selection-config-index">{String(partLabels.findIndex(part => part.key === activePart) + 1).padStart(2, '0')} / 05</div>
          <h2>{partLabels.find(part => part.key === activePart)?.name}配置</h2>
          <p>当前选中的部件已抬升并高亮。选择参数后可继续点击模型上的其他部件。</p>
          {configPanel[activePart]}
          <NumberField label="整机起飞总重" value={config.totalWeight} min={0.1} max={50} step={0.1} suffix="kg" onChange={value => update({ totalWeight: value })} />
          <div className="selection-part-tabs">
            {partLabels.map(part => <button key={part.key} className={activePart === part.key ? 'active' : ''} onClick={() => setActivePart(part.key)}>{part.name}</button>)}
          </div>
        </aside>
      </section>

      <div className="selection-calculate">
        <p>计算模型按 4 个旋翼、SOC 20% 截止及标准空气密度估算。</p>
        <button className="ds-button selection-calculate-button" onClick={() => setCalculated(estimateEndurance(config))}>开始计算</button>
      </div>

      {calculated && (
        <div className="selection-results ds-fade-in">
          {calculated.warnings.length > 0 && <section className="selection-warnings">
            <h2>配置警告</h2>
            {calculated.warnings.map((warning, index) => <p key={index}>{warning.message}</p>)}
          </section>}
          <section>
            <div className="selection-results-heading"><span>ENDURANCE ESTIMATE</span><h2>续航估计</h2></div>
            <ResultCard title="悬停（低功率）" subtitle="稳定悬停工况" result={calculated.hover} mode="hover" imageSide="right" />
            <ResultCard title="15 m/s 高速前飞（高功率）" subtitle="定速前飞工况" result={calculated.highSpeed} mode="forward" imageSide="left" />
          </section>
        </div>
      )}
    </div>
  )
}

function ResultCard({ title, subtitle, result, mode, imageSide }: {
  title: string
  subtitle: string
  result: Estimate['hover']
  mode: 'hover' | 'forward'
  imageSide: 'left' | 'right'
}) {
  const data = <div className="selection-result-data">
    <p>{subtitle}</p><h3>{title}</h3>
    <div className="selection-endurance"><strong>{result.enduranceMin.toFixed(1)}</strong><span>分钟</span></div>
    <dl>
      <div><dt>总电流</dt><dd>{result.currentA.toFixed(1)} A</dd></div>
      <div><dt>输入功率</dt><dd>{result.powerW.toFixed(0)} W</dd></div>
      <div><dt>推力余量</dt><dd>{(result.thrustMargin * 100).toFixed(0)}%</dd></div>
      <div><dt>油门开度</dt><dd>{result.throttlePercent.toFixed(1)}%</dd></div>
      {result.pitchAngleDeg !== undefined && <div><dt>机体前倾角</dt><dd>{result.pitchAngleDeg.toFixed(1)}°</dd></div>}
    </dl>
  </div>
  const visual = <div className="selection-result-visual"><FlightResultVisual mode={mode} /></div>
  return <article className="selection-result-card">{imageSide === 'left' ? visual : data}{imageSide === 'left' ? data : visual}</article>
}
