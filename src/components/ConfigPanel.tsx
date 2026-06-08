import { useConfigStore } from '@/store/configStore'
import { useSimStore } from '@/store/simStore'
import { getFrames, getMotors, getPropellers, getBatteryCells, getESCs, getFrameById, getMotorById, getPropellerById, getBatteryCellById, getESCById } from '@/lib/database'
import { getDronePresets, getPresetById } from '@/lib/presets'
import { Package } from 'lucide-react'
import type { SimConfig } from '@/lib/simulation'
import { Play, Square, Wind, Shield, Cpu, Fan, Battery, Gauge } from 'lucide-react'
import { useRef } from 'react'

export default function ConfigPanel() {
  const { config, setConfig } = useConfigStore()
  const { status, progress, setStatus, setProgress, setResult, setError, setMissionType, reset } = useSimStore()
  const workerRef = useRef<Worker | null>(null)

  const frames = getFrames()
  const motors = getMotors()
  const propellers = getPropellers()
  const batteryCells = getBatteryCells()
  const escs = getESCs()
  const presets = getDronePresets()

  return (
    <section id="config" style={{ width: '100%', padding: 'var(--space-16) var(--space-6)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600,
            letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 'var(--space-3)',
          }}>
            部件配置
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 600 }}>
            从型号库中选择部件，组装完整无人机配置
          </p>
        </div>

        {/* Preset Selector */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
          padding: 'var(--space-5)', background: 'var(--accent-subtle)',
          borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-8)',
          border: '1px solid var(--accent-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
            <Package size={18} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)' }}>加载预设配置</span>
          </div>
          <select
            value=""
            onChange={e => {
              const preset = getPresetById(e.target.value)
              if (preset) setConfig(preset.config)
            }}
            style={{
              padding: 'var(--space-3) var(--space-4)', border: '1px solid var(--accent-primary)',
              borderRadius: 'var(--radius-md)', fontSize: 14, background: 'var(--bg-surface)',
              color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              outline: 'none', minWidth: 200,
            }}
          >
            <option value="">选择整机预设...</option>
            {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            快速加载预设整机，之后仍可自由修改每个部件
          </span>
        </div>

        {/* Environment Parameters */}
        <div style={{
          display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap',
          marginBottom: 'var(--space-8)', padding: 'var(--space-5)',
          background: 'oklch(97% 0.005 250)', borderRadius: 'var(--radius-lg)',
        }}>
          <EnvParam label="温度" value={`${config.temperature}°C`} icon={<Wind size={14} />} />
          <EnvParam label="气压" value={`${config.pressure} hPa`} />
          <EnvParam label="高度" value={`${config.altitude} m`} />
          <EnvParam label="油门上限" value={`${config.maxThrottlePercent}%`} />
          <EnvParam label="低电压保护" value={`${config.lowVoltageThreshold}V`} />
        </div>

        {/* Config Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-5)', marginBottom: 'var(--space-8)',
        }}>
          {/* Frame */}
          <ConfigCard icon={<Shield size={18} />} title="机架与整机" color="text-blue-600">
            <SelectField label="机架型号" value={config.frameId}
              onChange={v => setConfig({ frameId: v })}
              options={[{ value: '', label: '请选择...' }, ...frames.map(f => ({ value: f.id, label: f.name }))]} />
            <NumberField label="整机重量 (kg)" value={config.totalWeight}
              onChange={v => setConfig({ totalWeight: v })} step={0.1} min={0.1} />
          </ConfigCard>

          {/* Motor + ESC */}
          <ConfigCard icon={<Cpu size={18} />} title="电机及电调" color="text-green-600">
            <SelectField label="电机型号" value={config.motorId}
              onChange={v => setConfig({ motorId: v })}
              options={[{ value: '', label: '请选择...' }, ...motors.map(m => ({ value: m.id, label: m.name }))]} />
            <SelectField label="电调型号" value={config.escId}
              onChange={v => setConfig({ escId: v })}
              options={[{ value: '', label: '请选择...' }, ...escs.map(e => ({ value: e.id, label: e.name }))]} />
          </ConfigCard>

          {/* Propeller */}
          <ConfigCard icon={<Fan size={18} />} title="螺旋桨" color="text-purple-600">
            <SelectField label="螺旋桨型号" value={config.propellerId}
              onChange={v => setConfig({ propellerId: v })}
              options={[{ value: '', label: '请选择...' }, ...propellers.map(p => ({ value: p.id, label: p.name }))]} />
          </ConfigCard>

          {/* Battery */}
          <ConfigCard icon={<Battery size={18} />} title="电池" color="text-orange-600">
            <SelectField label="电芯型号" value={config.batteryCellId}
              onChange={v => setConfig({ batteryCellId: v })}
              options={[{ value: '', label: '请选择...' }, ...batteryCells.map(b => ({ value: b.id, label: b.name }))]} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <NumberField label="串数 (S)" value={config.batteryCells}
                onChange={v => setConfig({ batteryCells: v })} step={1} min={1} max={12} />
              <NumberField label="容量 (mAh)" value={config.batteryCapacity}
                onChange={v => setConfig({ batteryCapacity: v })} step={100} min={100} />
            </div>
          </ConfigCard>

          {/* Safety */}
          <ConfigCard icon={<Gauge size={18} />} title="安全参数" color="text-red-600">
            <NumberField label="低电压保护 (V)" value={config.lowVoltageThreshold}
              onChange={v => setConfig({ lowVoltageThreshold: v })} step={0.5} min={6} max={30} />
          </ConfigCard>
        </div>

        {/* Task Selector */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <label style={{
            display: 'block', fontSize: 13, fontWeight: 500,
            color: 'var(--text-secondary)', marginBottom: 'var(--space-3)',
          }}>
            选择飞行任务
          </label>

          {/* 标准场景 */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>标准场景</span>
            <div style={{
              display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-1)',
              background: 'oklch(96% 0.005 250)', borderRadius: 'var(--radius-lg)',
              width: 'fit-content', marginTop: 'var(--space-2)',
            }}>
              <TaskButton active={config.missionType === 'hover'}
                onClick={() => setConfig({ missionType: 'hover' })}>
                悬停续航
              </TaskButton>
              <TaskButton active={config.missionType === 'circle'}
                onClick={() => setConfig({ missionType: 'circle' })}>
                圆轨迹
              </TaskButton>
              <TaskButton active={config.missionType === 'figure8'}
                onClick={() => setConfig({ missionType: 'figure8' })}>
                8字机动
              </TaskButton>
              <TaskButton active={config.missionType === 'fullspeed'}
                onClick={() => setConfig({ missionType: 'fullspeed' })}>
                全速飞行
              </TaskButton>
            </div>
          </div>

          {/* 测试场景 */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>测试场景（固定参数）</span>
            <div style={{
              display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-1)',
              background: 'oklch(96% 0.005 250)', borderRadius: 'var(--radius-lg)',
              width: 'fit-content', marginTop: 'var(--space-2)',
            }}>
              <TaskButton active={config.missionType === 'test-hover'}
                onClick={() => setConfig({ missionType: 'test-hover' })}>
                测试-悬停
              </TaskButton>
              <TaskButton active={config.missionType === 'test-circle'}
                onClick={() => setConfig({ missionType: 'test-circle' })}>
                测试-圆轨迹
              </TaskButton>
              <TaskButton active={config.missionType === 'test-figure8'}
                onClick={() => setConfig({ missionType: 'test-figure8' })}>
                测试-8字机动
              </TaskButton>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
            {config.missionType === 'hover'
              ? '无人机起飞至 10m 高度并悬停，直到电池电量降至 20% 后自动降落'
              : config.missionType === 'circle'
                ? '无人机起飞后执行圆轨迹飞行（半径 5m，速度 2m/s），直到电池电量降至 20%'
                : config.missionType === 'figure8'
                  ? '无人机起飞后执行8字轨迹飞行（半径 5m，速度 2m/s），直到电池电量降至 20%'
                  : config.missionType === 'fullspeed'
                    ? '无人机起飞后以 7m/s 沿直线水平飞行（最大倾角 45°），直到电池电量降至 20%'
                    : config.missionType === 'test-hover'
                    ? '【测试场景】使用 test-standard 预设参数，悬停至 10m，验证推力≈14.7N、电流≈16.4A、时间≈880s'
                    : config.missionType === 'test-circle'
                      ? '【测试场景】使用 test-standard 预设参数，圆轨迹（半径 5m，速度 2m/s），验证向心加速度与倾斜角'
                      : config.missionType === 'test-figure8'
                        ? '【测试场景】使用 test-standard 预设参数，8字轨迹（半径 5m，速度 5m/s），验证横向加速度与推力'
                        : ''}
          </p>
        </div>

        {/* Simulate Button */}
        <div>
          {status === 'running' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <button onClick={cancelSimulation} style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-4) var(--space-8)', background: 'var(--status-danger)',
                color: 'var(--text-inverse)', fontSize: 15, fontWeight: 600,
                border: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                transition: 'all 0.15s ease', fontFamily: 'var(--font-body)',
              }}>
                <Square size={18} /> 取消仿真
              </button>
              <div style={{ flex: 1 }}>
                <div style={{
                  height: 4, background: 'oklch(92% 0.005 250)', borderRadius: 2, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', background: 'var(--accent-primary)',
                    width: `${progress * 100}%`, transition: 'width 0.3s ease',
                  }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                  {(progress * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          ) : (
            <button onClick={startSimulation} disabled={!config.motorId || !config.propellerId} style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-4) var(--space-8)', background: 'var(--accent-primary)',
              color: 'var(--text-inverse)', fontSize: 15, fontWeight: 600,
              border: 'none', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
              transition: 'all 0.15s ease', fontFamily: 'var(--font-body)',
              opacity: (!config.motorId || !config.propellerId) ? 0.5 : 1,
            }} onMouseEnter={e => { if (config.motorId && config.propellerId) { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
              <Play size={18} /> 开始仿真
            </button>
          )}
        </div>
      </div>
    </section>
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
    setMissionType(config.missionType)
    setStatus('running')

    const simConfig: SimConfig = {
      missionType: config.missionType,
      droneConfig: config,
      frameMass: frame?.mass ?? 0.28,
      motorParams: {
        resistance: motor.resistance,
        kv: motor.kv,
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
        dynamicResistance: cell?.dynamicResistance ? cell.dynamicResistance * config.batteryCells : undefined,
        polarizationTau: cell?.polarizationTau,
      },
      escParams: {
        maxCurrent: esc?.maxCurrent ?? 30,
        resistance: esc?.resistance ?? 0.003,
      },
      inertia: frame?.inertiaMatrix
        ? [frame.inertiaMatrix[0][0], frame.inertiaMatrix[1][1], frame.inertiaMatrix[2][2]] as [number, number, number]
        : [0.008, 0.008, 0.015],
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

/* ===== Sub-components ===== */

function ConfigCard({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
      transition: 'all 0.2s ease',
    }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'oklch(85% 0.01 250)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        marginBottom: 'var(--space-5)', paddingBottom: 'var(--space-4)',
        borderBottom: '1px solid var(--border-default)',
      }}>
        <div style={{
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent-subtle)', color: 'var(--accent-primary)',
          borderRadius: 'var(--radius-md)', fontSize: 16,
        }} className={color}>
          {icon}
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', padding: 'var(--space-3) var(--space-4)',
        border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
        fontSize: 14, background: 'var(--bg-surface)', color: 'var(--text-primary)',
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        transition: 'all 0.15s ease',
        outline: 'none',
      }} onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-subtle)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none' }}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}

function NumberField({ label, value, onChange, step = 1, min, max }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>{label}</label>
      <input type="number" value={value} step={step} min={min} max={max}
        onChange={e => onChange(parseFloat(e.target.value) || 0)} style={{
          width: '100%', padding: 'var(--space-3) var(--space-4)',
          border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
          fontSize: 14, background: 'var(--bg-surface)', color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)', outline: 'none',
          transition: 'all 0.15s ease',
        }} onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-subtle)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'none' }} />
    </div>
  )
}

function EnvParam({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      {icon && <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>}
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function TaskButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: 'var(--space-3) var(--space-5)', border: 'none',
      background: active ? 'var(--bg-surface)' : 'transparent',
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      fontSize: 14, fontWeight: 500, borderRadius: 'var(--radius-md)',
      cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'var(--font-body)',
      boxShadow: active ? 'var(--shadow-sm)' : 'none',
    }}>
      {children}
    </button>
  )
}
