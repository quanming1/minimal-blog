/** remarkSupSub：上标/下标（Markdown 语法拓展，见 docs/markdown-extensions.md）
 *
 * 语法（LaTeX 风格）：`_{text}` 下标 / `^{text}` 上标（内容非空且不含花括号）：
 *   H_{2}O → H<sub>2</sub>O；E=mc^{2} → E=mc<sup>2</sup>
 *
 * 为什么不选 `~text~` / `^text^`（Pandoc/markdown-it 风格）：实证 remark-gfm 4.x 的删除线
 * 默认支持 singleTilde——`~2~` 在 parse 阶段就被转成 `<del>`，与下标语法直接冲突。
 * `_{` 在 CommonMark 里不触发强调（`_` 后跟 `{` 非字母数字，不开启 emphasis），GFM 脚注
 * `[^x]` 无花括号不匹配，因此 `_{x}` / `^{x}` 是安全的。
 *
 * 转换：text 节点拆分 → 交替产出 text 与 html(`<sub>`/`<sup>`) 节点（同 highlight 模式）。
 *
 * 安全：mdast 的 html 节点【原样输出不转义】——内容必须 escapeHtml。
 */
import type { Plugin } from 'unified'
import type { Root, RootContent } from 'mdast'

const SUBSUP_RE = /(_\{[^{}]+\}|\^\{[^{}]+\})/g

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export const remarkSupSub: Plugin<[], Root> = () => (tree) => {
  tree.children = processChildren(tree.children)
}

function processChildren(children: RootContent[]): RootContent[] {
  const out: RootContent[] = []
  for (const child of children) {
    if (child.type === 'text' && typeof child.value === 'string' && /[_{^]/.test(child.value)) {
      const parts = child.value.split(SUBSUP_RE)
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (part === '') continue
        if (i % 2 === 1) {
          const inner = escapeHtml(part.slice(2, -1))
          out.push({ type: 'html', value: part.startsWith('_') ? `<sub>${inner}</sub>` : `<sup>${inner}</sup>` } as RootContent)
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
