import { describe, expect, test } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkDeflist } from './deflist'

/** 跑 remark 管线（parse + deflist 转换），返回 mdast 根节点
 * 注意：unified 11 的 `unified` 是预冻结 Processor，必须 `unified()` 工厂调用 */
function processMd(md: string): any {
  const tree = (unified as any)().use(remarkParse).parse(md)
  return (unified as any)().use(remarkDeflist).runSync(tree)
}

describe('remarkDeflist', () => {
  test('基础：Term + : Definition → deflist（dl/dt/dd 结构）', () => {
    const tree = processMd('明志\n: 非淡泊无以明志')
    const node = tree.children[0]
    expect(node.type).toBe('deflist')
    expect(node.data.hName).toBe('dl')
    expect(node.children.length).toBe(2)
    const [term, def] = node.children
    expect(term.type).toBe('deflist-term')
    expect(term.data.hName).toBe('dt')
    expect(term.children[0].value).toBe('明志')
    expect(def.type).toBe('deflist-def')
    expect(def.data.hName).toBe('dd')
    expect(def.children[0].value).toBe('非淡泊无以明志') // ': ' 前缀已剔除
  })

  test('一个术语多个定义 → dt + 多个 dd', () => {
    const tree = processMd('AI\n: 人工智能\n: Artificial Intelligence')
    const node = tree.children[0]
    expect(node.type).toBe('deflist')
    expect(node.children.map((c: any) => c.type)).toEqual(['deflist-term', 'deflist-def', 'deflist-def'])
    expect(node.children[1].children[0].value).toBe('人工智能')
    expect(node.children[2].children[0].value).toBe('Artificial Intelligence')
  })

  test('多个术语 → 多个独立 deflist', () => {
    const tree = processMd('术语A\n: 定义A\n\n术语B\n: 定义B')
    expect(tree.children.length).toBe(2)
    expect(tree.children[0].type).toBe('deflist')
    expect(tree.children[0].children[0].children[0].value).toBe('术语A')
    expect(tree.children[1].children[0].children[0].value).toBe('术语B')
  })

  test('term 与 def 之间隔普通段落：普通段落不被 def 抢走（各自按行重组）', () => {
    // 形态 A 验证：紧跟 ': ' 行的段落即构成 deflist（语法固有行为）；普通段落在前则独立保留
    const tree = processMd('正文段落\n\n术语\n: 定义')
    expect(tree.children.length).toBe(2)
    expect(tree.children[0].type).toBe('paragraph') // 正文段落独立
    expect(tree.children[1].type).toBe('deflist') // 术语 + 定义
    expect(tree.children[1].children[0].children[0].value).toBe('术语')
  })

  test('孤立 : 行（文档开头，无 term）原样保留', () => {
    const tree = processMd(': 孤儿定义')
    expect(tree.children[0].type).toBe('paragraph')
    expect(tree.children[0].children[0].value).toBe(': 孤儿定义')
  })

  test('def 内容支持 inline 语法（strong 保留，仅剔除前缀）', () => {
    const tree = processMd('术语\n: **加粗**定义')
    const def = tree.children[0].children[1]
    expect(def.children[0].type).toBe('strong')
    expect(def.children[0].children[0].value).toBe('加粗')
    expect(def.children[1].value).toBe('定义')
  })

  test('XSS：def 内容 <script> 由 rehype 统一转义（mdast 树保留原文，插件不引入 HTML 解释）', () => {
    const tree = processMd('术语\n: 危险 <script>alert(1)</script>')
    const def = tree.children[0].children[1]
    // remark 原生把 <script> 拆为 html 节点（与普通段落同路径），deflist 不做任何额外解释
    const htmlNodes = def.children.filter((c: any) => c.type === 'html')
    expect(htmlNodes.length).toBeGreaterThan(0)
    expect(htmlNodes[0].value).toBe('<script>')
  })

  test('list item 内部也支持定义列表（递归处理子容器）', () => {
    const tree = processMd('- 术语\n  : 定义')
    const list = tree.children[0]
    const itemChildren = list.children[0].children
    expect(itemChildren[0].type).toBe('deflist')
    expect(itemChildren[0].children[0].children[0].value).toBe('术语')
    expect(itemChildren[0].children[1].children[0].value).toBe('定义')
  })

  test('普通段落（无 : 行）不受影响', () => {
    const tree = processMd('这是普通段落。\n\n这是另一个段落。')
    expect(tree.children.length).toBe(2)
    expect(tree.children[0].type).toBe('paragraph')
  })

  test('冒号无空格（:定义）不匹配，保持普通段落', () => {
    // ':定义' 无冒号+空格 → 不是 def 行；无空行时与术语合并为同一 paragraph（mdast 事实），整段原样
    const tree = processMd('术语\n:定义')
    expect(tree.children.length).toBe(1)
    expect(tree.children[0].type).toBe('paragraph')
    expect(tree.children[0].children[0].value).toBe('术语\n:定义')
  })

  test('paragraph 后跟无 children 节点（code/thematicBreak）不崩溃，且后续 deflist 正常', () => {
    // 回归：形态 B 判断下一个兄弟时，若其无 children（code/--- 等）会崩溃（v1.7.0 产物正文为空根因）
    const tree = processMd('普通段落\n\n```\ncode\n```\n\n术语\n: 定义')
    // 不抛异常；code 原样，术语+定义转 deflist
    expect(tree.children.some((c: any) => c.type === 'code')).toBe(true)
    const last = tree.children[tree.children.length - 1]
    expect(last.type).toBe('deflist')
    expect(last.children[1].children[0].value).toBe('定义')
  })
})
