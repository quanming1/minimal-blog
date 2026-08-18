/** mb CLI 纯函数单测（行区间/frontmatter/hash/编辑/模板），见 PRD-F1 §6 */
import { describe, expect, test } from 'bun:test'
import {
  applyEdit, contentHash, fmStructureOk, newPostText, parsePost, parseRange, serializePost, validSlug,
} from './lib'

describe('validSlug', () => {
  test('合法 slug', () => {
    expect(validSlug('my-post')).toBe(true)
    expect(validSlug('rondo-method-2')).toBe(true)
  })
  test('非法 slug（大小写/路径逃逸/空）', () => {
    expect(validSlug('MyPost')).toBe(false)
    expect(validSlug('../etc')).toBe(false)
    expect(validSlug('a/b')).toBe(false)
    expect(validSlug('')).toBe(false)
  })
})

describe('parseRange', () => {
  test('单行 N', () => expect(parseRange('5', 100)).toEqual({ start: 5, end: 5 }))
  test('区间 N:M', () => expect(parseRange('10:18', 100)).toEqual({ start: 10, end: 18 }))
  test('start > end 拒绝', () => expect(() => parseRange('5:3', 100)).toThrow())
  test('越界拒绝', () => expect(() => parseRange('1:200', 100)).toThrow())
  test('格式错误拒绝', () => expect(() => parseRange('a:b', 100)).toThrow())
})

describe('applyEdit（1-based 闭区间）', () => {
  const lines = ['a', 'b', 'c', 'd', 'e']
  test('replace 单行', () => expect(applyEdit(lines, 'replace', { start: 2, end: 2 }, 'X')).toEqual(['a', 'X', 'c', 'd', 'e']))
  test('replace 区间（多行文本）', () =>
    expect(applyEdit(lines, 'replace', { start: 2, end: 4 }, 'X\nY')).toEqual(['a', 'X', 'Y', 'e']))
  test('insert 第 N 行前', () => expect(applyEdit(lines, 'insert', { start: 3, end: 3 }, 'Z')).toEqual(['a', 'b', 'Z', 'c', 'd', 'e']))
  test('delete 区间', () => expect(applyEdit(lines, 'delete', { start: 2, end: 3 })).toEqual(['a', 'd', 'e']))
  test('不修改原数组（纯函数）', () => {
    applyEdit(lines, 'delete', { start: 1, end: 5 })
    expect(lines).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('parsePost / serializePost', () => {
  const md = `---\ntitle: 测试\ndate: '2026-08-13'\ntags: [a, b]\n---\n\n正文。\n`
  test('解析 frontmatter 与正文', () => {
    const p = parsePost(md)
    expect(p.fm.title).toBe('测试')
    expect(p.fm.date).toBe("'2026-08-13'")
    expect(p.fm.tags).toBe('[a, b]')
    expect(p.bodyLines.join('\n')).toContain('正文。')
  })
  test('无 frontmatter 原样', () => {
    const p = parsePost('just text\n')
    expect(p.fmLines).toEqual([])
    expect(p.bodyLines.join('\n')).toBe('just text\n')
  })
  test('serialize 字段顺序（title/date/description/column/tags 优先）', () => {
    const out = serializePost({ tags: '[x]', title: 'T', date: "'2026-01-01'" }, '\nbody\n')
    expect(out.startsWith("---\ntitle: T\ndate: '2026-01-01'\ntags: [x]\n---\n")).toBe(true)
  })
})

describe('fmStructureOk（frontmatter 边界保护）', () => {
  test('完好结构', () => expect(fmStructureOk(['---', 'title: x', '---', 'body'])).toBe(true))
  test('首行缺 ---', () => expect(fmStructureOk(['title: x', '---', 'body'])).toBe(false))
  test('闭合缺 ---', () => expect(fmStructureOk(['---', 'title: x', 'body'])).toBe(false))
  test('空 frontmatter（两个 --- 相邻）视为不合法', () => expect(fmStructureOk(['---', '---', 'body'])).toBe(false))
})

describe('contentHash（乐观并发）', () => {
  test('内容变则 hash 变，稳定内容 hash 稳定', () => {
    const h1 = contentHash('abc')
    expect(contentHash('abc')).toBe(h1)
    expect(contentHash('abd')).not.toBe(h1)
    expect(h1).toHaveLength(12)
  })
})

describe('newPostText（模板防呆）', () => {
  test('date 自动带引号，title 含冒号自动引号', () => {
    const t = newPostText('标题: 带冒号', ['a'], '专栏')
    expect(t).toContain("date: '") // 引号（YAML 裸日期陷阱）
    expect(t).toContain("title: '标题: 带冒号'")
    expect(t).toContain('column: 专栏')
    expect(t).toContain('tags: [a]')
  })
})
