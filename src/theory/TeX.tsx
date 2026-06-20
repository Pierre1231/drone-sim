import katex from 'katex'

/**
 * 轻量 KaTeX 包装组件。
 * - 行内公式：<TeX>{String.raw`x^2`}</TeX>
 * - 块级公式：<TeX block>{String.raw`\begin{bmatrix}...\end{bmatrix}`}</TeX>
 *
 * 直接调用 katex.renderToString 并以 dangerouslySetInnerHTML 注入，
 * 避开 react-katex 对 React 19 的 peerDeps 限制。
 */
export function TeX({ children, block = false }: { children: string; block?: boolean }) {
  const html = katex.renderToString(children, {
    throwOnError: false,
    displayMode: block,
    strict: false,
  })

  if (block) {
    return <div className="tex-block" dangerouslySetInnerHTML={{ __html: html }} />
  }
  return <span className="tex-inline" dangerouslySetInnerHTML={{ __html: html }} />
}
