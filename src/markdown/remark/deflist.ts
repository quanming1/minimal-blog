/** remarkDeflist：定义列表（Markdown 语法拓展，见 docs/markdown-extensions.md）
 *
 * 语法（PHP Markdown Extra 风格）：术语行 + `: ` 开头的定义行（可多个定义）：
 *   Term
 *   : Definition one
 *   : Definition two
 *   term 与 def 之间可有可无空行。
 *
 * 解析事实（实证）：remark-parse 把无空行的连续行合并为【同一个 paragraph】——
 *   `Term\n: Def` 是一个 paragraph（text 含 \n）；有空行时才是两个兄弟 paragraph。
 * 因此本插件同时处理两种形态：
 *   形态 A：单 paragraph 内按 \n 拆行，第 1 行起都是 `: ` 开头 → 重组 deflist
 *   形态 B：`: ` 开头的兄弟 paragraph 紧跟 term/def → 构建/续接 deflist
 * 不满足条件（孤立 `: ` 行、混入普通行）→ 整段原样保留为普通段落。
 *
 * 转换：`data.hName` 方案（mdast-util-to-hast 内建支持，天然转义）——
 *   deflist → <dl>，children 直接交替 deflist-term(<dt>) / deflist-def(<dd>)（HTML5 合法）。
 * 安全：term/def 保留原 mdast 子树（inline 语法可用），由 rehype 统一转义——无 XSS 面。
 */
import type { Plugin } from 'unified'
import type { Root, RootContent } from 'mdast'

interface DeflistNode {
  type: 'deflist'
  children: (DeflistTermNode | DeflistDefNode)[]
  data: { hName: 'dl' }
}
interface DeflistTermNode {
  type: 'deflist-term'
  children: RootContent[]
  data: { hName: 'dt' }
}
interface DeflistDefNode {
  type: 'deflist-def'
  children: RootContent[]
  data: { hName: 'dd' }
}

/** 按 \n 把 paragraph 的 children 拆成"行"（每行是节点列表；空行剔除；inline 节点归属当前行） */
function splitLines(children: RootContent[]): RootContent[][] {
  const lines: RootContent[][] = [[]]
  for (const child of children) {
    if (child.type === 'text' && typeof child.value === 'string' && child.value.includes('\n')) {
      const parts = child.value.split('\n')
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) lines.push([])
        if (parts[i] !== '') lines[lines.length - 1].push({ ...child, value: parts[i] })
      }
    } else {
      lines[lines.length - 1].push(child)
    }
  }
  return lines
}

/** 行是否为 `: ` 开头的定义行（行内首个 text 以 ': ' 开头）；空/非数组安全返回 false */
function isDefLine(nodes: RootContent[] | undefined): boolean {
  const first = nodes?.[0]
  return (
    !!first &&
    first.type === 'text' &&
    typeof first.value === 'string' &&
    first.value.startsWith(': ')
  )
}

/** 构建 def 节点：剔除行首 text 的 ': ' 前缀（空则删 text 节点，保留后续 inline 语法） */
function makeDef(nodes: RootContent[]): DeflistDefNode {
  const children = [...nodes]
  const first = children[0]
  if (first && first.type === 'text' && typeof first.value === 'string' && first.value.startsWith(': ')) {
    const rest = first.value.slice(2)
    if (rest === '') children.shift()
    else first.value = rest
  }
  return { type: 'deflist-def', children, data: { hName: 'dd' } }
}

/** 构建 deflist：term 行 + 连续 def 行 */
function makeDeflist(termNodes: RootContent[], defs: DeflistDefNode[]): DeflistNode {
  return {
    type: 'deflist',
    children: [{ type: 'deflist-term', children: termNodes, data: { hName: 'dt' } }, ...defs],
    data: { hName: 'dl' },
  }
}

export const remarkDeflist: Plugin<[], Root> = () => (tree) => {
  tree.children = process(tree.children) as RootContent[]
}

function process(children: RootContent[]): RootContent[] {
  const out: (RootContent | DeflistNode)[] = []
  let i = 0
  while (i < children.length) {
    const c = children[i]
    if (c.type === 'paragraph') {
      const paraChildren = (c as { children: RootContent[] }).children

      // 形态 A：同段拆行——第 1 行起全部是 def 行才转换（混入普通行则整段原样）
      const lines = splitLines(paraChildren)
      if (lines.length > 1 && lines.slice(1).every(isDefLine)) {
        out.push(makeDeflist(lines[0], lines.slice(1).map(makeDef)))
        i++
        continue
      }

      // 形态 B：兄弟 paragraph——def 行续接上一 deflist；term+defs 构建新 deflist
      if (isDefLine(paraChildren)) {
        const last = out[out.length - 1]
        if (last && last.type === 'deflist') {
          last.children.push(makeDef(paraChildren))
        } else {
          out.push(c)
        }
        i++
        continue
      }
      if (i + 1 < children.length && isDefLine((children[i + 1] as { children: RootContent[] }).children)) {
        const defs: DeflistDefNode[] = []
        let j = i + 1
        while (j < children.length && isDefLine((children[j] as { children: RootContent[] }).children)) {
          defs.push(makeDef((children[j] as { children: RootContent[] }).children))
          j++
        }
        out.push(makeDeflist(paraChildren, defs))
        i = j
        continue
      }
    }

    // 递归处理子容器（list item / blockquote 内部也可能有定义列表）
    if ('children' in c && Array.isArray((c as { children?: unknown }).children)) {
      ;(c as { children: RootContent[] }).children = process((c as { children: RootContent[] }).children)
    }
    out.push(c)
    i++
  }
  // DeflistNode 是 RootContent 超集（自定义节点），对外保持 RootContent[] 接口
  return out as RootContent[]
}
