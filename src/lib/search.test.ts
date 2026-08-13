import '../test/setup-dom' // jsdom：端到端 script 注入上下文测试需要（见 docs/security.md §2）
import { describe, expect, test } from 'bun:test'
import { buildSearchIndex, filterPosts, serializeIndexForHtml, type SearchEntry } from './search'

const index: SearchEntry[] = buildSearchIndex([
  { id: 'zh/hello-mingzhi', title: '你好，明志', description: '博客开篇', tags: ['开场'], href: '/minimal-blog/posts/hello-mingzhi/', date: '2026-08-12' },
  { id: 'zh/markdown-workflow', title: '用 Markdown 维护一个博客的快乐', description: '写作工作流', tags: ['markdown', '写作'], href: '/minimal-blog/posts/markdown-workflow/', date: '2026-08-12' },
  { id: 'zh/why-keep-blogging', title: '为什么要坚持写作', description: '长期主义', tags: ['随笔', '写作'], href: '/minimal-blog/posts/why-keep-blogging/', date: '2026-08-11' },
  { id: 'en/hello-mingzhi', title: 'Hello, Mingzhi', description: 'First post', tags: ['intro'], href: '/minimal-blog/en/posts/hello-mingzhi/', date: '2026-08-12' },
  { id: 'en/markdown-workflow', title: 'The Joy of Maintaining a Blog with Markdown', description: 'Writing workflow', tags: ['markdown', 'writing'], href: '/minimal-blog/en/posts/markdown-workflow/', date: '2026-08-12' },
  { id: 'en/why-keep-blogging', title: 'Why I Keep Blogging', description: 'Long-term thinking', tags: ['essay', 'writing'], href: '/minimal-blog/en/posts/why-keep-blogging/', date: '2026-08-11' },
])

describe('buildSearchIndex', () => {
  test('从文章源构建索引，语言按 id 前缀识别', () => {
    expect(index).toHaveLength(6)
    expect(index[0]).toMatchObject({ id: 'zh/hello-mingzhi', lang: 'zh' })
    expect(index[3]).toMatchObject({ id: 'en/hello-mingzhi', lang: 'en' })
    expect(index[0].href).toBe('/minimal-blog/posts/hello-mingzhi/')
  })

  test('标签与描述完整保留', () => {
    const md = index.find((e) => e.id === 'zh/markdown-workflow')
    expect(md?.tags).toEqual(['markdown', '写作'])
    expect(md?.description).toBe('写作工作流')
  })
})

describe('filterPosts', () => {
  test('空查询返回空数组（不展示全部）', () => {
    expect(filterPosts(index, '')).toEqual([])
    expect(filterPosts(index, '   ')).toEqual([])
  })

  test('按标题匹配，大小写不敏感', () => {
    const r = filterPosts(index, 'markdown')
    expect(r.map((e) => e.id)).toEqual(['zh/markdown-workflow', 'en/markdown-workflow'])
    // 大小写不敏感：MINGZHI → Hello, Mingzhi
    expect(filterPosts(index, 'MINGZHI').map((e) => e.id)).toEqual(['en/hello-mingzhi'])
    // 中文标题直接匹配
    expect(filterPosts(index, '明志').map((e) => e.id)).toEqual(['zh/hello-mingzhi'])
  })

  test('按描述匹配', () => {
    const r = filterPosts(index, 'workflow')
    expect(r.map((e) => e.id)).toEqual(['en/markdown-workflow'])
  })

  test('按标签匹配（中英文）', () => {
    expect(filterPosts(index, '写作').map((e) => e.id)).toEqual(['zh/markdown-workflow', 'zh/why-keep-blogging'])
    expect(filterPosts(index, 'writing').map((e) => e.id)).toEqual(['en/markdown-workflow', 'en/why-keep-blogging'])
    expect(filterPosts(index, 'intro').map((e) => e.id)).toEqual(['en/hello-mingzhi'])
  })

  test('按专栏匹配（大小写不敏感，中文名直接命中）', () => {
    const withCol = buildSearchIndex([
      { id: 'zh/a', title: '系列第一篇', description: '', tags: [], column: 'Rondo 方法', href: '#', date: '2026-08-12' },
      { id: 'zh/b', title: '系列第二篇', description: '', tags: [], column: '博客开发', href: '#', date: '2026-08-12' },
    ])
    expect(filterPosts(withCol, 'Rondo').map((e) => e.id)).toEqual(['zh/a'])
    expect(filterPosts(withCol, 'rondo').map((e) => e.id)).toEqual(['zh/a']) // 大小写不敏感
    expect(filterPosts(withCol, '博客开发').map((e) => e.id)).toEqual(['zh/b'])
  })

  test('无匹配返回空数组', () => {
    expect(filterPosts(index, '不存在的关键词xyz')).toEqual([])
  })

  test('limit 截断结果', () => {
    const many = buildSearchIndex([
      { id: 'zh/a', title: 'same word', description: '', tags: [], href: '#', date: '2026-01-01' },
      { id: 'zh/b', title: 'same word two', description: '', tags: [], href: '#', date: '2026-01-01' },
      { id: 'zh/c', title: 'same word three', description: '', tags: [], href: '#', date: '2026-01-01' },
      { id: 'zh/d', title: 'same word four', description: '', tags: [], href: '#', date: '2026-01-01' },
    ])
    expect(filterPosts(many, 'same', 2)).toHaveLength(2)
    expect(filterPosts(many, 'same', 8)).toHaveLength(4)
  })

  test('query 首尾空格裁剪', () => {
    expect(filterPosts(index, '  markdown  ').map((e) => e.id)).toEqual(['zh/markdown-workflow', 'en/markdown-workflow'])
  })
})

describe('serializeIndexForHtml（安全：script 注入防护）', () => {
  const evil: SearchEntry[] = [
    {
      id: 'zh/evil',
      title: '标题 <script>alert(1)</script>',
      description: '描述 <!-- 注释注入 --> </script><script>alert(2)</script>',
      tags: ['<img src=x onerror=alert(3)>'],
      href: '/minimal-blog/posts/evil/',
      lang: 'zh',
      date: '2026-08-12',
    },
  ]

  test('全量转义 <（无任何可闭合 script 的字符）', () => {
    const s = serializeIndexForHtml(evil)
    expect(s.includes('<')).toBe(false) // 无裸 <
    expect(s.includes('</script>')).toBe(false)
    expect(s.includes('<!--')).toBe(false)
    expect(s.includes('<script>')).toBe(false)
  })

  test('转义后 JSON.parse 可还原（\u003c 是合法 JSON 转义）', () => {
    const s = serializeIndexForHtml(evil)
    const back = JSON.parse(s) as SearchEntry[]
    expect(back[0].title).toBe('标题 <script>alert(1)</script>')
    expect(back[0].tags[0]).toBe('<img src=x onerror=alert(3)>')
  })

  test('filterPosts 对含 HTML 注入字段的条目按关键词正常匹配（纯文本子串匹配，无 HTML 解释）', () => {
    const evil2 = buildSearchIndex([
      { id: 'zh/evil', title: '安全探针 <script>x</script>', description: '', tags: ['测试'], href: '#', date: '2026-08-12' },
    ])
    expect(filterPosts(evil2, '安全探针').map((e) => e.id)).toEqual(['zh/evil'])
    // 查询词含 HTML 标签文本：仅作子串匹配（标题含该文本故命中），filterPosts 不解析/不执行 HTML
    expect(filterPosts(evil2, '<script>').map((e) => e.id)).toEqual(['zh/evil'])
    expect(filterPosts(evil2, 'onerror')).toEqual([]) // 未出现在字段中的文本不命中
  })

  test('端到端：序列化结果写入 script 标签上下文不可逃逸（jsdom 集成点）', () => {
    // 模拟 SearchDialog 的 <script type="application/json" set:html> 注入链路
    const evil: SearchEntry[] = [
      {
        id: 'zh/evil',
        title: '</script><script>alert(1)</script>',
        description: '<!-- 注释 -->',
        tags: ['<img src=x onerror=alert(2)>'],
        href: '/minimal-blog/posts/evil/',
        lang: 'zh',
        date: '2026-08-12',
      },
    ]
    const script = document.createElement('script')
    script.type = 'application/json'
    script.innerHTML = serializeIndexForHtml(evil)
    // 注入内容不可逃逸 script 元素（< 全转义 → 无法提前闭合）
    expect(script.querySelector('script')).toBeNull()
    // textContent 读回可 JSON.parse 还原（与 SearchDialog 的 indexScript.textContent 消费一致）
    const back = JSON.parse(script.textContent ?? '[]') as SearchEntry[]
    expect(back[0].title).toBe('</script><script>alert(1)</script>')
  })

  test('href 含特殊字符（< "）时序列化转义且还原一致', () => {
    const evil: SearchEntry[] = [
      {
        id: 'zh/a<b"c',
        title: 'T',
        description: undefined,
        tags: [],
        href: '/minimal-blog/posts/a<b"c/',
        lang: 'zh',
        date: '2026-08-12',
      },
    ]
    const s = serializeIndexForHtml(evil)
    expect(s.includes('<')).toBe(false)
    const back = JSON.parse(s) as SearchEntry[]
    expect(back[0].href).toBe('/minimal-blog/posts/a<b"c/')
    expect(back[0].id).toBe('zh/a<b"c')
  })
})
