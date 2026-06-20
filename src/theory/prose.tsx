import type { ReactNode, CSSProperties } from 'react'

/* ============================================================
 * 文档排版原语 —— PX4 docs 风格
 * 标题带锚点 id 与 hover «#» 链接；段落 1.75 行高；
 * 表格卡片化；Callout 用于「说明」类导读，不与原文定义混淆。
 * ============================================================ */

/** 章级标题：I. / II. ... */
export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="theory-heading" style={h2Style}>
      <Anchor id={id} />
      {children}
    </h2>
  )
}

/** 节级标题：A. / B. ... */
export function H3({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="theory-heading" style={h3Style}>
      <Anchor id={id} />
      {children}
    </h3>
  )
}

/** 子标题：电池模型 / 电机模型 ... */
export function H4({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h4 id={id} className="theory-heading" style={h4Style}>
      {id && <Anchor id={id} />}
      {children}
    </h4>
  )
}

function Anchor({ id }: { id: string }) {
  return (
    <a href={`#/theory#${id}`} className="heading-anchor" aria-label="锚点链接" style={anchorStyle}>
      #
    </a>
  )
}

/** 五级子标题：推进器各子模型内部的细分（电池状态 / 开路电压 ...） */
export function H5({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h5 id={id} className="theory-heading" style={h5Style}>
      {id && <Anchor id={id} />}
      {children}
    </h5>
  )
}

/** 正文段落 */
export function P({ children }: { children: ReactNode }) {
  return <p style={pStyle}>{children}</p>
}

/** 章节导语（小节开头的承上启下文字，略强调） */
export function Lead({ children }: { children: ReactNode }) {
  return <p style={leadStyle}>{children}</p>
}

/** 参数/符号表 */
export function ParamTable({
  head,
  rows,
}: {
  head: string[]
  rows: ReactNode[][]
}) {
  return (
    <div className="param-table-wrap" style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} style={thStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={ci === 0 ? tdFirstStyle : tdStyle}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 导读提示框：标注为「说明」，与原文定义区分 */
export function Callout({ title = '说明', children }: { title?: string; children: ReactNode }) {
  return (
    <aside style={calloutStyle}>
      <div style={calloutTitleStyle}>{title}</div>
      <div style={calloutBodyStyle}>{children}</div>
    </aside>
  )
}

/* ---------------- 样式 ---------------- */

const h2Style: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 30,
  fontWeight: 800,
  color: 'var(--text-primary)',
  margin: '0 0 20px',
  paddingBottom: 14,
  borderBottom: '1px solid var(--border-default)',
  letterSpacing: '-0.01em',
}

const h3Style: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 21,
  fontWeight: 750,
  color: 'var(--text-primary)',
  margin: '40px 0 14px',
}

const h4Style: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: '28px 0 12px',
  textTransform: 'none',
}

const h5Style: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 14.5,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  margin: '22px 0 10px',
  paddingLeft: 10,
  borderLeft: '3px solid var(--border-default)',
}

const anchorStyle: CSSProperties = {
  position: 'absolute',
  marginLeft: -22,
  width: 22,
  color: 'var(--accent-primary)',
  textDecoration: 'none',
  fontWeight: 400,
  opacity: 0,
  transition: 'opacity 0.15s ease',
}

const pStyle: CSSProperties = {
  fontSize: 15.5,
  lineHeight: 1.78,
  color: 'var(--text-secondary)',
  margin: '0 0 16px',
}

const leadStyle: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.78,
  color: 'var(--text-primary)',
  margin: '0 0 18px',
}

const tableWrapStyle: CSSProperties = {
  margin: '20px 0 24px',
  overflowX: 'auto',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-surface)',
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14.5,
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  background: 'oklch(97% 0.005 250)',
  color: 'var(--text-primary)',
  fontWeight: 700,
  fontSize: 13.5,
  borderBottom: '1px solid var(--border-default)',
  whiteSpace: 'nowrap',
}

const tdStyle: CSSProperties = {
  padding: '10px 16px',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-default)',
  lineHeight: 1.6,
  verticalAlign: 'top',
}

const tdFirstStyle: CSSProperties = {
  ...tdStyle,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
}

const calloutStyle: CSSProperties = {
  margin: '20px 0 24px',
  padding: '14px 18px',
  background: 'var(--accent-subtle)',
  borderLeft: '3px solid var(--accent-primary)',
  borderRadius: 'var(--radius-sm)',
}

const calloutTitleStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 800,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--accent-primary)',
  marginBottom: 6,
}

const calloutBodyStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.72,
  color: 'var(--text-primary)',
}
