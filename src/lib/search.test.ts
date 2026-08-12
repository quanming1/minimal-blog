import { describe, expect, test } from 'bun:test'
import { buildSearchIndex, filterPosts, type SearchEntry } from './search'

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
