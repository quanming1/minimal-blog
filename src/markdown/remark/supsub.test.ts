import { describe, expect, test } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { remarkSupSub } from './supsub'

/** 跑真实管线顺序（parse 阶段挂 GFM + supsub 转换），返回 mdast 根节点
 * 语法事实：remark-gfm 4.x 删除线支持 singleTilde（`~x~` 会被转 delete），
 *           因此下标/上标用 `_{x}` / `^{x}`（LaTeX 风格，与 GFM 无冲突） */
function processMd(md: string): any {
  const tree = (unified as any)().use(remarkParse).use(remarkGfm).parse(md)
  return (unified as any)().use(remarkSupSub).runSync(tree)
}

/** 取段落内所有 html 节点且以 <sub>/<sup> 开头的 value（排除 raw HTML 标签） */
function htmlValues(node: any): string[] {
  return node.children
    .filter((c: any) => c.type === 'html' && (c.value.startsWith('<sub>') || c.value.startsWith('<sup>')))
    .map((c: any) => c.value)
}

/** 取整段重组文本（text + html 交替，便于断言顺序） */
function inlineText(node: any): string {
  return node.children.map((c: any) => (c.type === 'html' ? c.value : c.value ?? '')).join('')
}

describe('remarkSupSub', () => {
  test('基础：H_{2}O → H<sub>2</sub>O（text/html/text 交替）', () => {
    const tree = processMd('H_{2}O')
    const p = tree.children[0]
    expect(p.children.map((c: any) => c.type)).toEqual(['text', 'html', 'text'])
    expect(p.children[1].value).toBe('<sub>2</sub>')
    expect(p.children[0].value).toBe('H')
    expect(p.children[2].value).toBe('O')
  })

  test('上标：E=mc^{2} → <sup>2</sup>', () => {
    const tree = processMd('E=mc^{2}')
    expect(htmlValues(tree.children[0])).toEqual(['<sup>2</sup>'])
  })

  test('同段多个 sub/sup 混合', () => {
    const tree = processMd('H_{2}O 与 x^{2} 和 C_{6}H_{12}O_{6}')
    const p = tree.children[0]
    expect(htmlValues(p)).toEqual(['<sub>2</sub>', '<sup>2</sup>', '<sub>6</sub>', '<sub>12</sub>', '<sub>6</sub>'])
  })

  test('相邻 sub/sup：x_{a}^{b}y 顺序正确', () => {
    const tree = processMd('x_{a}^{b}y')
    expect(inlineText(tree.children[0])).toBe('x<sub>a</sub><sup>b</sup>y')
  })

  test('空花括号不匹配（_{} 与 ^{}）', () => {
    const tree = processMd('a_{}b 和 c^{}d')
    expect(htmlValues(tree.children[0])).toEqual([])
    expect(inlineText(tree.children[0])).toBe('a_{}b 和 c^{}d')
  })

  test('~~删除线~~ 由 GFM 先处理，不被 supsub 破坏', () => {
    const tree = processMd('这是~~删除~~内容')
    const p = tree.children[0]
    expect(p.children.some((c: any) => c.type === 'delete')).toBe(true)
    expect(htmlValues(p)).toEqual([])
  })

  test('HTML 转义：sub/sup 内容不可注入（escapeHtml 全字符）', () => {
    const tree = processMd('x_{a < b & "q"}y')
    expect(htmlValues(tree.children[0])).toEqual(['<sub>a &lt; b &amp; &quot;q&quot;</sub>'])
  })

  test('heading 内也处理', () => {
    const tree = processMd('## H_{2}O 公式')
    const heading = tree.children[0]
    expect(heading.type).toBe('heading')
    expect(htmlValues(heading)).toEqual(['<sub>2</sub>'])
  })

  test('inline code 不处理；raw HTML 标签原样（标签间内容是 text，按 CommonMark 语义仍处理）', () => {
    const tree = processMd('`H_{2}O` 和 <code>x^{2}</code>')
    const p = tree.children[0]
    expect(p.children[0].type).toBe('inlineCode')
    expect(p.children[0].value).toBe('H_{2}O')
    expect(p.children[2].type).toBe('html')
    expect(p.children[2].value).toBe('<code>')
    expect(htmlValues(p)).toEqual(['<sup>2</sup>'])
  })

  test('脚注标记 [^1] 不匹配（无花括号）', () => {
    const tree = processMd('见脚注[^1]')
    expect(htmlValues(tree.children[0])).toEqual([])
    expect(tree.children[0].children[0].value).toBe('见脚注[^1]')
  })

  test('普通 emphasis 不受影响（_x_ 无花括号不匹配）', () => {
    // 注意：CJK 文本 _汉字_ 是 intraword emphasis（CommonMark 规则）不生效；用英文前后空格验证
    const tree = processMd('This is _emphasis_ text')
    const p = tree.children[0]
    expect(htmlValues(p)).toEqual([])
    expect(p.children.some((c: any) => c.type === 'emphasis')).toBe(true)
  })

  test('未闭合花括号原样保留（_{x 无右括号）', () => {
    const tree = processMd('a_{b 和 c^{d')
    expect(htmlValues(tree.children[0])).toEqual([])
    expect(tree.children[0].children[0].value).toBe('a_{b 和 c^{d')
  })

  test('内容含花括号不匹配（_{a{b}}）', () => {
    const tree = processMd('x_{a{b}}y')
    expect(htmlValues(tree.children[0])).toEqual([])
    expect(tree.children[0].children[0].value).toBe('x_{a{b}}y')
  })
})
