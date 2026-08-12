/** remarkHighlight：==高亮==（Markdown 语法拓展，见 docs/markdown-extensions.md）
 *
 * 语法：`==text==`（不支持嵌套、不跨段、未闭合的 `==` 原样保留）
 * 转换：text 节点拆分 → 交替产出 text 与 html(`<mark>`) 节点
 *
 * 安全（重要）：mdast 的 html 节点【原样输出不转义】——mark 内容必须 escapeHtml。
 * 优先用 `data.hName` 方案（见 callout.ts）可完全避免手动转义；本插件因 text 节点无法
 * 携带 data.hName（非元素节点），只能产出 html 节点，故手动转义兜底。
 */
import type { Plugin } from 'unified'
import type { Root, RootContent } from 'mdast'

const HIGHLIGHT_RE = /==([^=]+)==/g

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const remarkHighlight: Plugin<[], Root> = () => (tree) => {
  tree.children = processChildren(tree.children)
}

function processChildren(children: RootContent[]): RootContent[] {
  const out: RootContent[] = []
  for (const child of children) {
    if (child.type === 'text' && typeof child.value === 'string' && child.value.includes('==')) {
      const parts = child.value.split(HIGHLIGHT_RE)
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (part === '') continue
        if (i % 2 === 1) {
          out.push({ type: 'html', value: `<mark>${escapeHtml(part)}</mark>` } as RootContent)
        } else {
          out.push({ type: 'text', value: part } as RootContent)
        }
      }
    } else if ('children' in child && Array.isArray(child.children)) {
      ;(child as { children: RootContent[] }).children = processChildren(child.children)
      out.push(child)
    } else {
      out.push(child)
    }
  }
  return out
}
