/** 语言与文案字典：默认中文（/ 无前缀），英文走 /en/ 前缀路由 */

export type Lang = 'zh' | 'en'

export const LANGS: Lang[] = ['zh', 'en']

export interface PostMeta {
  /** 集合 id，形如 'zh/hello-mingzhi' */
  id: string
  title: string
  date: Date
  description?: string
  tags: string[]
}

/** 从集合 id 提取语言（id 首段） */
export function langOfId(id: string): Lang {
  return id.startsWith('en/') ? 'en' : 'zh'
}

/** 从集合 id 提取 slug（语言段之后的部分） */
export function slugOfId(id: string): string {
  return id.split('/').slice(1).join('/')
}

/** 按年份分组（倒序），返回 [{ year, posts }] */
export function groupByYear<T extends { date: Date }>(posts: T[]): { year: number; posts: T[] }[] {
  const map = new Map<number, T[]>()
  for (const p of posts) {
    const y = p.date.getFullYear()
    const arr = map.get(y)
    if (arr) arr.push(p)
    else map.set(y, [p])
  }
  return Array.from(map.entries())
    .map(([year, items]) => ({ year, posts: items }))
    .sort((a, b) => b.year - a.year)
}

/** 中文月日：1月5日 / 12月31日 */
export function formatMonthDay(d: Date, lang: Lang): string {
  if (lang === 'en') {
    const names = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    return `${names[d.getMonth()]} ${d.getDate()}`
  }
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 完整日期：2026年12月31日 / December 31, 2026 */
export function formatFullDate(d: Date, lang: Lang): string {
  if (lang === 'en') {
    const names = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    return `${names[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  }
  return `${d.getFullYear()}年${formatMonthDay(d, 'zh')}`
}

/** 阅读时长估算：中文 ~400 字/分，英文 ~180 wpm */
export function readingMinutes(text: string, lang: Lang): number {
  const words = lang === 'zh' ? text.length : text.split(/\s+/).filter(Boolean).length
  const wpm = lang === 'zh' ? 400 : 180
  return Math.max(1, Math.round(words / wpm))
}
