import { describe, expect, it } from 'bun:test'
import {
  formatFullDate,
  formatMonthDay,
  groupByYear,
  langOfId,
  readingMinutes,
  slugOfId,
} from './utils'

describe('formatMonthDay', () => {
  it('中文：8月12日（数字月日）', () => {
    expect(formatMonthDay(new Date(2026, 7, 12), 'zh')).toBe('8月12日')
  })

  it('英文：December 31', () => {
    expect(formatMonthDay(new Date(2023, 11, 31), 'en')).toBe('December 31')
  })

  it('英文：January 5', () => {
    expect(formatMonthDay(new Date(2026, 0, 5), 'en')).toBe('January 5')
  })
})

describe('formatFullDate', () => {
  it('中文：2026年8月12日', () => {
    expect(formatFullDate(new Date(2026, 7, 12), 'zh')).toBe('2026年8月12日')
  })

  it('英文：December 31, 2023', () => {
    expect(formatFullDate(new Date(2023, 11, 31), 'en')).toBe('December 31, 2023')
  })
})

describe('groupByYear', () => {
  const posts = [
    { date: new Date(2025, 0, 1), title: 'a' },
    { date: new Date(2024, 5, 15), title: 'b' },
    { date: new Date(2025, 6, 1), title: 'c' },
  ]

  it('按年份分组且倒序', () => {
    const groups = groupByYear(posts)
    expect(groups.map((g) => g.year)).toEqual([2025, 2024])
    expect(groups[0].posts.map((p) => p.title)).toEqual(['a', 'c'])
  })

  it('空数组返回空', () => {
    expect(groupByYear([])).toEqual([])
  })
})

describe('langOfId / slugOfId', () => {
  it('zh 前缀识别', () => {
    expect(langOfId('zh/hello')).toBe('zh')
    expect(langOfId('en/hello')).toBe('en')
  })

  it('slug 提取', () => {
    expect(slugOfId('zh/hello-mingzhi')).toBe('hello-mingzhi')
    expect(slugOfId('en/a/b-c')).toBe('a/b-c')
  })
})

describe('readingMinutes', () => {
  it('中文按 400 字/分估算', () => {
    const zhText = '字'.repeat(800)
    expect(readingMinutes(zhText, 'zh')).toBe(2)
  })

  it('英文按 180 wpm 估算', () => {
    const enText = Array.from({ length: 180 }, () => 'word').join(' ')
    expect(readingMinutes(enText, 'en')).toBe(1)
  })

  it('至少 1 分钟', () => {
    expect(readingMinutes('hi', 'en')).toBe(1)
    expect(readingMinutes('短', 'zh')).toBe(1)
  })
})
