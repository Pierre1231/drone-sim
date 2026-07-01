import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle, Play, XCircle } from 'lucide-react'
import type { SimResult } from '@/lib/simulation'
import { buildDocAlignedSimConfig } from '@/lib/presets'
import { useSimStore } from '@/store/simStore'
import { buildDocumentComparison, type DocumentComparisonRow } from '@/lib/documentComparison'
import { runScenario } from '@/lib/simulationEngine'

interface ValidationCase {
  id: 'test-hover' | 'fullspeed' | 'test-circle' | 'test-circle-7'
  title: string
  description: string
  run: () => { metrics: DocumentComparisonRow[]; result: SimResult }
}

export default function ValidationPanel() {
  const [activeId, setActiveId] = useState<ValidationCase['id']>('test-hover')
  const [running, setRunning] = useState(false)
  const [metrics, setMetrics] = useState<DocumentComparisonRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { setResult, setMissionType, setStatus } = useSimStore()

  const cases = useMemo<ValidationCase[]>(() => [
    {
      id: 'test-hover',
      title: 'B01 全链路悬停',
      description: '只判定文档明确列出的悬停输出项。',
      run: () => runCaseComparison('test-hover'),
    },
    {
      id: 'fullspeed',
      title: 'B02 水平匀速 5 m/s',
      description: '只判定文档输出表中的 Pbat、SOC(600s)、SOC20 时间、电压和电流。',
      run: () => runCaseComparison('fullspeed'),
    },
    {
      id: 'test-circle',
      title: 'B03 圆形轨迹 2 m/s',
      description: '只判定文档输出表中的 Pbat、SOC(600s)、SOC20 时间。',
      run: () => runCaseComparison('test-circle'),
    },
    {
      id: 'test-circle-7',
      title: 'B03 圆形轨迹 7 m/s',
      description: '只判定文档输出表中的 Pbat、SOC(600s)、SOC20 时间。',
      run: () => runCaseComparison('test-circle-7'),
    },
  ], [])

  const activeCase = cases.find(item => item.id === activeId) ?? cases[0]

  function runValidationCase() {
    setRunning(true)
    setError(null)
    setMetrics(null)
    try {
      const output = activeCase.run()
      setMetrics(output.metrics)
      setResult(output.result)
      setMissionType(activeCase.id)
      setStatus('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证运行失败')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cases.map(item => (
          <button
            key={item.id}
            onClick={() => {
              setActiveId(item.id)
              setMetrics(null)
              setError(null)
            }}
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              background: activeId === item.id ? 'oklch(96% 0.02 250)' : 'var(--bg-surface)',
              padding: 12,
              textAlign: 'left',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: activeId === item.id ? 700 : 500,
            }}
          >
            {item.title}
          </button>
        ))}
      </aside>

      <section>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>{activeCase.title}</h3>
            <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>{activeCase.description}</p>
          </div>
          <button
            onClick={runValidationCase}
            disabled={running}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              background: running ? 'oklch(90% 0.01 250)' : 'var(--accent-primary)',
              color: running ? 'var(--text-secondary)' : 'var(--text-inverse)',
              cursor: running ? 'default' : 'pointer',
              fontWeight: 700,
            }}
          >
            <Play size={16} />
            {running ? '运行中' : '运行验证'}
          </button>
        </div>

        {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

        {metrics ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: 'oklch(97% 0.005 250)' }}>
                <th style={thStyle}>指标</th>
                <th style={thStyle}>文档期望</th>
                <th style={thStyle}>仿真实际</th>
                <th style={thStyle}>偏差</th>
                <th style={thStyle}>容差</th>
                <th style={thStyle}>状态</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(item => (
                <tr key={item.metric} style={{ borderTop: '1px solid var(--border-default)' }}>
                  <td style={tdStyle}>{item.metric}</td>
                  <td style={monoTdStyle}>{item.expected}</td>
                  <td style={monoTdStyle}>{item.actual}</td>
                  <td style={monoTdStyle}>{item.error}</td>
                  <td style={monoTdStyle}>{item.tolerance}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: verdictColor(item.verdict), fontWeight: 700 }}>
                      {item.verdict === 'pass' ? <CheckCircle size={15} /> : item.verdict === 'warn' ? <AlertCircle size={15} /> : <XCircle size={15} />}
                      {item.verdict === 'pass' ? '通过' : item.verdict === 'warn' ? '接近边界' : '未通过'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 24, border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-secondary)' }}>
            点击运行验证后显示文档对比结果。
          </div>
        )}
      </section>
    </div>
  )
}

function runCaseComparison(id: ValidationCase['id']): { metrics: DocumentComparisonRow[]; result: SimResult } {
  const result = runScenario({ config: buildDocAlignedSimConfig(id) })
  return { result, metrics: buildDocumentComparison(id, result).rows }
}

function verdictColor(verdict: DocumentComparisonRow['verdict']): string {
  if (verdict === 'pass') return '#16a34a'
  if (verdict === 'warn') return '#ca8a04'
  return '#dc2626'
}

const thStyle: React.CSSProperties = { padding: '12px 14px', textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap' }
const monoTdStyle: React.CSSProperties = { ...tdStyle, fontFamily: 'var(--font-mono)' }
