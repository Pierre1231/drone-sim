import { useMemo } from 'react'
import { useConfigStore } from '@/store/configStore'
import { estimateEndurance } from '@/lib/selectionEngine'
import { getBatteryCells, getESCs, getFrames, getMotors, getPropellers } from '@/lib/database'
import type { DroneConfig } from '@/store/configStore'
import { AlertTriangle, Gauge, Scale, Timer, Zap } from 'lucide-react'

interface SelectFieldProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <select className="ds-select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

function NumberField({ label, value, min, max, step, suffix, onChange }: NumberFieldProps) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          className="ds-input"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(Number(e.target.value))}
        />
        {suffix && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{suffix}</span>}
      </div>
    </label>
  )
}

function ResultCard({
  title,
  icon,
  result,
  accent,
}: {
  title: string
  icon: React.ReactNode
  result: ReturnType<typeof estimateEndurance>['hover']
  accent: string
}) {
  return (
    <div className="ds-card" style={{ ...cardStyle, borderTop: `4px solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {icon}
        <h2 className="ds-title" style={{ fontSize: 16, margin: 0 }}>{title}</h2>
      </div>
      <div style={bigMetricStyle}>
        <span style={bigMetricValueStyle}>{result.enduranceMin.toFixed(1)}</span>
        <span style={bigMetricUnitStyle}>min</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        <MetricItem icon={<Zap size={16} />} label="电流" value={`${result.currentA.toFixed(1)} A`} />
        <MetricItem icon={<Gauge size={16} />} label="功率" value={`${result.powerW.toFixed(0)} W`} />
        <MetricItem icon={<Scale size={16} />} label="推力余量" value={`${(result.thrustMargin * 100).toFixed(0)}%`} />
        <MetricItem icon={<Gauge size={16} />} label="油门" value={`${result.throttlePercent.toFixed(1)}%`} />
      </div>
      {'pitchAngleDeg' in result && result.pitchAngleDeg !== undefined && (
        <MetricItem icon={<Gauge size={16} />} label="前倾角" value={`${result.pitchAngleDeg.toFixed(1)}°`} />
      )}
    </div>
  )
}

function MetricItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--text-secondary)', display: 'flex' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  )
}

const presets: { label: string; config: Partial<DroneConfig> }[] = [
  {
    label: 'F450 标准版',
    config: {
      frameId: 'f450',
      motorId: '2212-920',
      escId: 'esc-30a',
      propellerId: '9450',
      batteryCellId: 'lipo-3.7',
      batteryCells: 4,
      batteryCapacity: 5000,
      totalWeight: 1.5,
    },
  },
  {
    label: 'F450 增强版',
    config: {
      frameId: 'f450',
      motorId: '2212-1000',
      escId: 'esc-40a',
      propellerId: '1045',
      batteryCellId: 'lipo-3.7',
      batteryCells: 4,
      batteryCapacity: 5000,
      totalWeight: 1.6,
    },
  },
]

export default function SelectionPage() {
  const { config, setConfig } = useConfigStore()

  const result = useMemo(() => estimateEndurance(config), [config])

  const frames = useMemo(() => getFrames().map(f => ({ value: f.id, label: `${f.name} (${f.mass * 1000}g)` })), [])
  const motors = useMemo(() => getMotors().map(m => ({ value: m.id, label: `${m.name} (${m.kv}KV)` })), [])
  const props = useMemo(() => getPropellers().map(p => ({ value: p.id, label: p.name })), [])
  const escs = useMemo(() => getESCs().map(e => ({ value: e.id, label: `${e.name} (${e.maxCurrent}A)` })), [])
  const cells = useMemo(() => getBatteryCells().map(c => ({ value: c.id, label: c.name })), [])

  const update = (partial: Partial<DroneConfig>) => setConfig(partial)

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="ds-display" style={{ fontSize: 32, marginBottom: 8 }}>选型模式</h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
            选择部件并快速估算悬停与 15 m/s 高速前飞工况下的续航。
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => setConfig(p.config)}
              className="ds-button secondary"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <section className="section-card ds-fade-in">
        <h3 className="ds-title" style={{ fontSize: 18, marginBottom: 16 }}>部件配置</h3>
        <div style={formGridStyle}>
          <SelectField
            label="机架"
            value={config.frameId}
            options={[{ value: '', label: '请选择机架' }, ...frames]}
            onChange={v => update({ frameId: v })}
          />
          <SelectField
            label="电机"
            value={config.motorId}
            options={[{ value: '', label: '请选择电机' }, ...motors]}
            onChange={v => update({ motorId: v })}
          />
          <SelectField
            label="螺旋桨"
            value={config.propellerId}
            options={[{ value: '', label: '请选择螺旋桨' }, ...props]}
            onChange={v => update({ propellerId: v })}
          />
          <SelectField
            label="电调"
            value={config.escId}
            options={[{ value: '', label: '请选择电调' }, ...escs]}
            onChange={v => update({ escId: v })}
          />
          <SelectField
            label="电芯类型"
            value={config.batteryCellId}
            options={[{ value: '', label: '请选择电芯' }, ...cells]}
            onChange={v => update({ batteryCellId: v })}
          />
          <NumberField
            label="串联节数"
            value={config.batteryCells}
            min={1}
            max={12}
            step={1}
            suffix="S"
            onChange={v => update({ batteryCells: v })}
          />
          <NumberField
            label="电池容量"
            value={config.batteryCapacity}
            min={100}
            max={50000}
            step={100}
            suffix="mAh"
            onChange={v => update({ batteryCapacity: v })}
          />
          <NumberField
            label="起飞总重"
            value={config.totalWeight}
            min={0.1}
            max={50}
            step={0.1}
            suffix="kg"
            onChange={v => update({ totalWeight: v })}
          />
        </div>
      </section>

      {result.warnings.length > 0 && (
        <section style={{ marginBottom: 24, marginTop: 24 }}>
          {result.warnings.map((w, i) => (
            <div key={i} style={warningStyle}>
              <AlertTriangle size={18} color="var(--status-danger)" />
              <span style={{ fontSize: 14, color: 'var(--status-danger)' }}>{w.message}</span>
            </div>
          ))}
        </section>
      )}

      <section className="ds-fade-in" style={{ marginTop: 24 }}>
        <h3 className="ds-title" style={{ fontSize: 18, marginBottom: 16 }}>续航估算</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }} className="ds-stagger">
          <ResultCard
            title="悬停（低功率）"
            icon={<Timer size={24} color="var(--status-success)" />}
            result={result.hover}
            accent="var(--status-success)"
          />
          <ResultCard
            title="15 m/s 高速前飞（高功率）"
            icon={<Zap size={24} color="var(--status-warning)" />}
            result={result.highSpeed}
            accent="var(--status-warning)"
          />
        </div>
      </section>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  display: 'block',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 6,
}

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: 24,
}

const bigMetricStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
}

const bigMetricValueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 48,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: 'var(--text-primary)',
  lineHeight: 1,
}

const bigMetricUnitStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--text-secondary)',
}

const warningStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 16px',
  background: 'var(--status-danger-subtle)',
  borderRadius: 'var(--radius-lg)',
  marginBottom: 10,
}
