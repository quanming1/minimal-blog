import { describe, expect, it } from 'bun:test'
import { buildToc, type HeadingLike } from './toc'

const headings: HeadingLike[] = [
  { depth: 1, slug: 'article-title', text: '文章标题' },
  { depth: 2, slug: 'section-a', text: '第一节' },
  { depth: 3, slug: 'subsection-a1', text: '子节 A1' },
  { depth: 2, slug: 'section-b', text: '第二节' },
  { depth: 4, slug: 'deep-1', text: '四层标题' },
  { depth: 5, slug: 'too-deep', text: '五层标题（应被过滤）' },
]

describe('buildToc', () => {
  it('过滤 h1 与 h5+，保留 2-4 级', () => {
    const toc = buildToc(headings)
    expect(toc.map((i) => i.id)).toEqual(['section-a', 'subsection-a1', 'section-b', 'deep-1'])
  })

  it('保留 depth 与 text', () => {
    const toc = buildToc(headings)
    expect(toc[0]).toEqual({ id: 'section-a', text: '第一节', depth: 2 })
  })

  it('空输入返回空', () => {
    expect(buildToc([])).toEqual([])
  })

  it('只有 h1 时返回空', () => {
    expect(buildToc([{ depth: 1, slug: 'x', text: '标题' }])).toEqual([])
  })

  it('仅 h2 输入正常', () => {
    const toc = buildToc([
      { depth: 2, slug: 'a', text: 'A' },
      { depth: 2, slug: 'b', text: 'B' },
    ])
    expect(toc).toHaveLength(2)
    expect(toc[0].depth).toBe(2)
  })

  it('单个 heading 正常', () => {
    expect(buildToc([{ depth: 2, slug: 'only', text: '唯一' }])).toHaveLength(1)
  })
})
