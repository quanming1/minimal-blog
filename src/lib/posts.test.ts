import { describe, expect, test } from 'bun:test'
import { getAllColumns, getAllTags, getAdjacentPosts, getRelatedPosts, sortColumnPosts, sortPostsByDate } from './posts'

// 辅助：构造条目（date 用本地时区，与页面 parseDateString 一致）
const d = (s: string) => new Date(s)
const mk = (id: string, date: string, tags: string[] = []) => ({ id, date: d(date), tags })

describe('sortPostsByDate', () => {
  test('乱序 → 日期倒序（新 → 旧）', () => {
    const posts = [mk('a', '2026-08-10'), mk('b', '2026-08-12'), mk('c', '2026-08-11')]
    expect(sortPostsByDate(posts).map((p) => p.id)).toEqual(['b', 'c', 'a'])
  })

  test('原数组不被修改（纯函数）', () => {
    const posts = [mk('a', '2026-08-10'), mk('b', '2026-08-12')]
    sortPostsByDate(posts)
    expect(posts.map((p) => p.id)).toEqual(['a', 'b'])
  })
})

describe('getAdjacentPosts', () => {
  const posts = [
    mk('p1', '2026-08-12'),
    mk('p2', '2026-08-11'),
    mk('p3', '2026-08-10'),
  ]

  test('中间：prev=更新一篇，next=更旧一篇', () => {
    expect(getAdjacentPosts(posts, 'p2')).toEqual({ prev: posts[0], next: posts[2] })
  })

  test('最新一篇：无 prev，next=下一篇', () => {
    expect(getAdjacentPosts(posts, 'p1')).toEqual({ next: posts[1] })
  })

  test('最旧一篇：prev=上一篇，无 next', () => {
    expect(getAdjacentPosts(posts, 'p3')).toEqual({ prev: posts[1] })
  })

  test('单篇：两者皆无', () => {
    expect(getAdjacentPosts([posts[0]], 'p1')).toEqual({})
  })

  test('id 不存在：返回空', () => {
    expect(getAdjacentPosts(posts, 'nope')).toEqual({})
  })
})

describe('getRelatedPosts', () => {
  const posts = [
    mk('a', '2026-08-12', ['ts', 'astro']),
    mk('b', '2026-08-11', ['astro']),
    mk('c', '2026-08-10', ['ts']),
    mk('d', '2026-08-09', ['rust']),
  ]

  test('同标签优先：共享标签数降序', () => {
    // a 的标签 [ts, astro]：b 共享 1（astro），c 共享 1（ts）——共享数相同按日期新优先
    const related = getRelatedPosts(posts, 'a', 2)
    expect(related.map((p) => p.id)).toEqual(['b', 'c'])
  })

  test('limit 截断', () => {
    expect(getRelatedPosts(posts, 'a', 1).map((p) => p.id)).toEqual(['b'])
  })

  test('排除自身', () => {
    expect(getRelatedPosts(posts, 'a').some((p) => p.id === 'a')).toBe(false)
  })

  test('无共享标签返回空（不硬凑）', () => {
    expect(getRelatedPosts(posts, 'd')).toEqual([])
  })

  test('当前文章不存在返回空', () => {
    expect(getRelatedPosts(posts, 'nope')).toEqual([])
  })
})

describe('getAllTags', () => {
  test('去重 + 计数，按计数倒序', () => {
    const tags = getAllTags([
      { tags: ['a', 'b'] },
      { tags: ['a'] },
      { tags: ['c', 'b'] },
    ])
    expect(tags).toEqual([
      { tag: 'a', count: 2 },
      { tag: 'b', count: 2 },
      { tag: 'c', count: 1 },
    ])
  })

  test('计数相同按 tag 名升序（中文 localeCompare）', () => {
    const tags = getAllTags([{ tags: ['关于', 'Astro'] }, { tags: ['关于'] }])
    // 计数：关于 2、Astro 1 → 关于在前
    expect(tags[0].tag).toBe('关于')
  })

  test('空输入返回空', () => {
    expect(getAllTags([])).toEqual([])
  })
})

describe('getAllColumns', () => {
  test('去重 + 计数，按计数倒序', () => {
    const columns = getAllColumns([
      { column: 'Rondo 方法' },
      { column: '博客开发' },
      { column: 'Rondo 方法' },
      {},
    ])
    expect(columns).toEqual([
      { column: 'Rondo 方法', count: 2 },
      { column: '博客开发', count: 1 },
    ])
  })

  test('无 column 的文章跳过（不计入也不报错）', () => {
    expect(getAllColumns([{}, { column: 'x' }])).toEqual([{ column: 'x', count: 1 }])
  })

  test('计数相同按专栏名升序（中文 localeCompare）', () => {
    const columns = getAllColumns([{ column: '乙' }, { column: '甲' }])
    expect(columns.map((c) => c.column)).toEqual(['甲', '乙'])
  })

  test('空输入返回空', () => {
    expect(getAllColumns([])).toEqual([])
  })
})

describe('sortColumnPosts', () => {
  const d = (s: string) => new Date(s)
  const mk = (id: string, date: string, columnOrder?: number) => ({ id, date: d(date), columnOrder })

  test('columnOrder 升序（小在前，阅读顺序）', () => {
    const posts = [mk('c', '2026-08-10', 3), mk('a', '2026-08-12', 1), mk('b', '2026-08-11', 2)]
    expect(sortColumnPosts(posts).map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  test('无 columnOrder 的按日期倒序（新 → 旧）', () => {
    const posts = [mk('old', '2026-08-10'), mk('new', '2026-08-12')]
    expect(sortColumnPosts(posts).map((p) => p.id)).toEqual(['new', 'old'])
  })

  test('混合：有 columnOrder 在前（按序），无的排最后（按日期）', () => {
    const posts = [mk('no', '2026-08-12'), mk('b', '2026-08-10', 2), mk('a', '2026-08-11', 1)]
    expect(sortColumnPosts(posts).map((p) => p.id)).toEqual(['a', 'b', 'no'])
  })

  test('原数组不被修改（纯函数）', () => {
    const posts = [mk('b', '2026-08-10', 2), mk('a', '2026-08-11', 1)]
    sortColumnPosts(posts)
    expect(posts.map((p) => p.id)).toEqual(['b', 'a'])
  })
})
