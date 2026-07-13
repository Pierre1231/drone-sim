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
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={selectStyle}
      >
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
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(Number(e.target.value))}
          style={numberInputStyle}
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
    <div style={{ ...cardStyle, borderTop: `4px solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {icon}
        <h2 style={cardTitleStyle}>{title}</h2>
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
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'var(--space-10) var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            选型模式
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
            选择部件并快速估算悬停与 15 m/s 高速前飞工况下的续航。
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => setConfig(p.config)}
              style={presetButtonStyle}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>部件配置</h3>
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
        <section style={{ marginBottom: 24 }}>
          {result.warnings.map((w, i) => (
            <div key={i} style={warningStyle}>
              <AlertTriangle size={18} color="var(--status-danger)" />
              <span style={{ fontSize: 14, color: 'var(--status-danger)' }}>{w.message}</span>
            </div>
          ))}
        </section>
      )}

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>续航估算</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
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

const sectionStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  borderRadius: 16,
  border: '1px solid var(--border-default)',
  padding: 'var(--space-6)',
  marginBottom: 24,
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 16,
}

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
}

const selectStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 14,
}

const numberInputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: 14,
  width: '100%',
}

const presetButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-surface)',
  color: 'var(--text-secondary)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  borderRadius: 12,
  padding: 24,
  border: '1px solid var(--border-default)',
}

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 18,
  fontWeight: 700,
  color: 'var(--text-primary)',
}

const bigMetricStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  marginBottom: 8,
}

const bigMetricValueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 48,
  fontWeight: 800,
  color: 'var(--text-primary)',
  lineHeight: 1,
}

const bigMetricUnitStyle: React.CSSProperties = {
  fontSize: 18,
  color: 'var(--text-secondary)',
  fontWeight: 600,
}

const warningStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 16px',
  background: 'oklch(95% 0.03 25)',
  border: '1px solid oklch(85% 0.06 25)',
  borderRadius: 8,
  marginBottom: 10,
}
