/** remarkCallout：GitHub 风格提示框（Markdown 语法拓展，见 docs/markdown-extensions.md）
 *
 * 语法：blockquote 首行 `[!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]`（大小写不敏感），
 *       后续行/段为内容：
 *   > [!NOTE]
 *   > 提示内容
 *
 * 转换：blockquote → 自定义 callout 节点（`data.hName` 方案——mdast-util-to-hast 内建支持，
 *       自动生成 `<div class="callout callout-{type}" role="note">`，无需自定义 rehype handler）
 *
 * 安全：children 保留原始 mdast 子树，由 rehype 统一转 HTML（text 自动转义）——无 XSS 面。
 * 约束：不支持嵌套 callout（walk 不深入已转换节点）。
 */
import type { Plugin } from 'unified'
import type { Root } from 'mdast'

const CALLOUT_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:\n|$)/i

export type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution'

export const remarkCallout: Plugin<[], Root> = () => (tree) => {
  walk(tree, null, -1)
}

function walk(node: unknown, parent: { children: unknown[] } | null, index: number): void {
  if (!node || typeof node !== 'object') return
  const n = node as { type?: string; children?: unknown[] }
  if (n.type === 'blockquote') {
    const converted = transformBlockquote(n as never)
    if (converted && parent && index >= 0) parent.children[index] = converted
    return // 不深入 callout 内部（不支持嵌套）
  }
  if (n.children) {
    for (let i = 0; i < n.children.length; i++) walk(n.children[i], n as { children: unknown[] }, i)
  }
}

function transformBlockquote(node: {
  type: string
  children: { type?: string; children?: { type?: string; value?: string }[] }[]
}): unknown | null {
  const firstP = node.children[0]
  if (!firstP || firstP.type !== 'paragraph') return null
  const firstText = firstP.children?.[0]
  if (!firstText || firstText.type !== 'text') return null
  const m = firstText.value?.match(CALLOUT_RE)
  if (!m) return null
  const type = m[1].toLowerCase()

  // 移除类型行：text 可能是 '[!NOTE]'（独占段落）或 '[!NOTE]\n内容'（同段后续内容）
  // m[0] 覆盖 '[!TYPE]' + 尾部空白/换行
  firstText.value = (firstText.value ?? '').slice(m[0].length)
  if (firstText.value === '') {
    firstP.children!.shift()
    if (firstP.children!.length === 0) {
      node.children.shift()
    }
  }

  return {
    ...node,
    type: 'callout',
    calloutType: type,
    data: {
      hName: 'div',
      hProperties: {
        className: ['callout', `callout-${type}`],
        role: 'note',
        'data-callout': m[1].toUpperCase(), // 类型标题（CSS ::before 显示 + aria-label 读屏，见 global.css）
        'aria-label': m[1].toUpperCase(), // 读屏可感知类型（::before 是生成内容，不保证被朗读）
      },
    },
  }
}
