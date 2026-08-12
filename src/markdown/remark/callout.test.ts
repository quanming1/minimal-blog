import { describe, expect, test } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkCallout } from './callout'

/** 跑 remark 管线（parse + callout 转换），返回 mdast 根节点（runSync 只跑 transformer，无需 compiler）
 * 注意：unified 11 的 `unified` 是预冻结 Processor，必须 `unified()` 调用工厂创建新实例 */
function processMd(md: string): any {
  const tree = (unified as any)().use(remarkParse).parse(md)
  return (unified as any)().use(remarkCallout).runSync(tree)
}

describe('remarkCallout', () => {
  test('基础：> [!NOTE] 转 callout 节点（data.hName 方案）', () => {
    const tree = processMd('> [!NOTE]\n> 提示内容')
    const node = tree.children[0]
    expect(node.type).toBe('callout')
    expect(node.calloutType).toBe('note')
    expect(node.data.hName).toBe('div')
    expect(node.data.hProperties.className).toEqual(['callout', 'callout-note'])
    expect(node.data.hProperties.role).toBe('note')
    expect(node.data.hProperties['data-callout']).toBe('NOTE') // CSS ::before 标题
    expect(node.data.hProperties['aria-label']).toBe('NOTE') // 读屏可感知类型
    // 类型行已移除，内容保留
    const text = node.children[0]?.children?.[0]?.value
    expect(text).toBe('提示内容')
  })

  test('五种类型 + 大小写不敏感', () => {
    const cases = [
      ['> [!TIP]\n> x', 'tip'],
      ['> [!IMPORTANT]\n> x', 'important'],
      ['> [!WARNING]\n> x', 'warning'],
      ['> [!CAUTION]\n> x', 'caution'],
      ['> [!note]\n> x', 'note'],
      ['> [!Important]\n> x', 'important'],
      ['> [!Warning]\n> x', 'warning'],
    ] as const
    for (const [md, type] of cases) {
      const node = processMd(md).children[0]
      expect(node.type).toBe('callout')
      expect(node.calloutType).toBe(type)
    }
  })

  test('多段内容全部保留', () => {
    const tree = processMd('> [!TIP]\n>\n> 第一段\n>\n> 第二段')
    const node = tree.children[0]
    expect(node.type).toBe('callout')
    const texts = node.children.map((p: any) => p.children?.[0]?.value)
    expect(texts).toEqual(['第一段', '第二段'])
  })

  test('类型行同段后续文本：不匹配整行则保持普通引用', () => {
    // '[!NOTE] 标题' 不是独立类型行 → 不转换
    const tree = processMd('> [!NOTE] 标题\n> 内容')
    const node = tree.children[0]
    expect(node.type).toBe('blockquote')
  })

  test('普通引用不误伤', () => {
    const tree = processMd('> 普通引用内容')
    const node = tree.children[0]
    expect(node.type).toBe('blockquote')
    expect(node.children[0].children[0].value).toBe('普通引用内容')
  })

  test('类型行后无内容（空 callout）也正常', () => {
    const tree = processMd('> [!CAUTION]')
    const node = tree.children[0]
    expect(node.type).toBe('callout')
    expect(node.calloutType).toBe('caution')
    expect(node.children.length).toBe(0)
  })

  test('XSS：callout 内容子树由 rehype 统一转义（mdast 树保留原始文本）', () => {
    const tree = processMd('> [!WARNING]\n> 危险 <script>alert(1)</script>')
    const node = tree.children[0]
    expect(node.type).toBe('callout')
    // mdast 层：内容按 remark 原生解析（<script> 拆为 html 节点，与普通 blockquote 一致）
    const children = node.children[0].children
    expect(children.some((c: any) => c.type === 'html' && c.value === '<script>')).toBe(true)
    // callout 自身不引入任何额外 HTML 解释——子树交给 rehype 统一管线（与普通正文相同路径）
    expect(node.data.hName).toBe('div')
  })

  test('callout 内容支持 inline 语法（strong/emphasis 已拆节点，类型行移除不破坏）', () => {
    const tree = processMd('> [!NOTE]\n> **加粗**与*斜体*')
    const node = tree.children[0]
    expect(node.type).toBe('callout')
    const firstP = node.children[0]
    expect(firstP.children[0].type).toBe('strong')
    expect(firstP.children[0].children[0].value).toBe('加粗')
  })
})
