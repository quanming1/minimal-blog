import { describe, expect, it } from 'bun:test'
import {
  formatFullDate,
  formatMonthDay,
  groupByYear,
  langOfId,
  parseDateString,
  postHref,
  readingMinutes,
  slugOfId,
  switchHref,
} from './utils'

describe('parseDateString', () => {
  it('按本地时区解析 YYYY-MM-DD（避免 UTC 偏移）', () => {
    const d = parseDateString('2026-08-12')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(12)
  })

  it('跨年 1 月 1 日归属正确', () => {
    const d = parseDateString('2026-01-01')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(0)
  })
})

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

  it('中文：12月31日 与 1月1日', () => {
    expect(formatMonthDay(new Date(2026, 11, 31), 'zh')).toBe('12月31日')
    expect(formatMonthDay(new Date(2026, 0, 1), 'zh')).toBe('1月1日')
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
  it('zh/en 前缀识别', () => {
    expect(langOfId('zh/hello')).toBe('zh')
    expect(langOfId('en/hello')).toBe('en')
  })

  it('slug 提取', () => {
    expect(slugOfId('zh/hello-mingzhi')).toBe('hello-mingzhi')
    expect(slugOfId('en/a/b-c')).toBe('a/b-c')
  })
})

describe('postHref', () => {
  it('zh 无语言前缀', () => {
    expect(postHref('/minimal-blog/', 'zh', 'zh/hello-mingzhi')).toBe(
      '/minimal-blog/posts/hello-mingzhi/',
    )
  })

  it('en 带语言前缀', () => {
    expect(postHref('/minimal-blog/', 'en', 'en/hello-mingzhi')).toBe(
      '/minimal-blog/en/posts/hello-mingzhi/',
    )
  })
})

describe('switchHref', () => {
  it('zh → en 切换当前路径', () => {
    expect(switchHref('/minimal-blog/', 'zh', '/posts/hello/')).toBe(
      '/minimal-blog/en/posts/hello/',
    )
  })

  it('en → zh 去掉语言前缀', () => {
    expect(switchHref('/minimal-blog/', 'en', '/posts/hello/')).toBe(
      '/minimal-blog/posts/hello/',
    )
  })

  it('首页切换', () => {
    expect(switchHref('/minimal-blog/', 'zh', '/')).toBe('/minimal-blog/en/')
    expect(switchHref('/minimal-blog/', 'en', '/')).toBe('/minimal-blog/')
  })

  it('无翻译时切到目标语言首页（防 404）', () => {
    expect(switchHref('/minimal-blog/', 'zh', '/posts/only-zh/', false)).toBe(
      '/minimal-blog/en/',
    )
    expect(switchHref('/minimal-blog/', 'en', '/posts/only-en/', false)).toBe(
      '/minimal-blog/',
    )
  })
})

describe('readingMinutes', () => {
  it('中文按 400 字/分估算', () => {
    expect(readingMinutes('字'.repeat(800), 'zh')).toBe(2)
  })

  it('中文舍入边界：599 字 → 1 分，600 字 → 2 分', () => {
    expect(readingMinutes('字'.repeat(599), 'zh')).toBe(1)
    expect(readingMinutes('字'.repeat(600), 'zh')).toBe(2)
  })

  it('英文按 180 wpm 估算', () => {
    const enText = Array.from({ length: 180 }, () => 'word').join(' ')
    expect(readingMinutes(enText, 'en')).toBe(1)
  })

  it('英文舍入边界：270 词 → 2 分', () => {
    const enText = Array.from({ length: 270 }, () => 'word').join(' ')
    expect(readingMinutes(enText, 'en')).toBe(2)
  })

  it('至少 1 分钟', () => {
    expect(readingMinutes('hi', 'en')).toBe(1)
    expect(readingMinutes('短', 'zh')).toBe(1)
  })
})
