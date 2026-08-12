import { describe, expect, test } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkHighlight } from './highlight'

function processMd(md: string): any {
  // unified 11：必须 unified() 调用工厂（unified 是预冻结 Processor）
  const tree = (unified as any)().use(remarkParse).parse(md)
  return (unified as any)().use(remarkHighlight).runSync(tree)
}

describe('remarkHighlight', () => {
  test('基础：==text== 转 html(<mark>)', () => {
    const tree = processMd('==高亮内容==')
    const children = tree.children[0].children
    expect(children).toHaveLength(1)
    expect(children[0].type).toBe('html')
    expect(children[0].value).toBe('<mark>高亮内容</mark>')
  })

  test('混合：前文与后文保留为 text', () => {
    const tree = processMd('前文 ==高亮== 后文')
    const children = tree.children[0].children
    expect(children.map((c: any) => c.type)).toEqual(['text', 'html', 'text'])
    expect(children[0].value).toBe('前文 ')
    expect(children[1].value).toBe('<mark>高亮</mark>')
    expect(children[2].value).toBe(' 后文')
  })

  test('同段多个高亮', () => {
    const tree = processMd('==a== 和 ==b==')
    const children = tree.children[0].children
    expect(children.filter((c: any) => c.type === 'html')).toHaveLength(2)
    expect(children[0].value).toBe('<mark>a</mark>')
    expect(children[2].value).toBe('<mark>b</mark>')
  })

  test('未闭合 == 原样保留（不产生 mark）', () => {
    const tree = processMd('==未闭合文本')
    const children = tree.children[0].children
    expect(children).toHaveLength(1)
    expect(children[0].type).toBe('text')
    expect(children[0].value).toBe('==未闭合文本')
  })

  test('HTML 转义：mark 内容不可注入（escapeHtml 全字符）', () => {
    // text 中非标签的 < > & " 字符（如 '1 < 2'、'A & B'）会留在 text 节点，必须转义
    const tree = processMd('==1 < 2 与 > 0 与 A & B 与 "q"==')
    const html = tree.children[0].children[0].value as string
    expect(html).toBe('<mark>1 &lt; 2 与 &gt; 0 与 A &amp; B 与 &quot;q&quot;</mark>')
    expect(html.includes('<mark>1 < 2')).toBe(false)
    expect(html.includes('&lt;')).toBe(true)
    expect(html.includes('&amp;')).toBe(true)
    expect(html.includes('&quot;')).toBe(true)
  })

  test('raw HTML 不受影响（remark 原生解析的 html 节点原样保留）', () => {
    const tree = processMd('==<script>alert(1)</script>==')
    // '<script>' / '</script>' 被 remark-parse 拆为 html 节点，'==' 与 'alert(1)' 是独立 text → 无 mark 产生
    const children = tree.children[0].children
    expect(children.map((c: any) => c.type)).toEqual(['text', 'html', 'text', 'html', 'text'])
    expect(children[1].value).toBe('<script>')
    expect(children[3].value).toBe('</script>')
  })

  test('空 == 不产生 mark（保留原文）', () => {
    const tree = processMd('====')
    expect(tree.children[0].children).toHaveLength(1)
    expect(tree.children[0].children[0].value).toBe('====')
  })

  test('标题（heading）内的高亮也处理', () => {
    const tree = processMd('# 标题 ==高亮==')
    const heading = tree.children[0]
    expect(heading.type).toBe('heading')
    const children = heading.children
    expect(children.map((c: any) => c.type)).toEqual(['text', 'html'])
    expect(children[1].value).toBe('<mark>高亮</mark>')
  })

  test('相邻 == 对：`==a==b==` 首个配对进 mark，其余按未闭合保留', () => {
    const tree = processMd('==a==b==')
    const children = tree.children[0].children
    // split(/==([^=]+)==/g) 对 '==a==b==' → ['', 'a', 'b==']：a 进 mark，'b==' 是普通 text（未闭合原样）
    expect(children.map((c: any) => c.type)).toEqual(['html', 'text'])
    expect(children[0].value).toBe('<mark>a</mark>')
    expect(children[1].value).toBe('b==')
  })

  test('内容含 = 时不匹配（==a=b== 原样保留）', () => {
    const tree = processMd('==a=b==')
    const children = tree.children[0].children
    expect(children).toHaveLength(1)
    expect(children[0].value).toBe('==a=b==')
  })
})
