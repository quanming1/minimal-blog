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

const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

/**
 * 解析 'YYYY-MM-DD' 为【本地时区】日期。
 * 不用 new Date('2026-08-12')（按 UTC 午夜解析，UTC- 时区会倒退一天）。
 */
export function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 从集合 id 提取语言（id 首段必须是 zh/ 或 en/，否则视为 zh 并警告） */
export function langOfId(id: string): Lang {
  if (id.startsWith('en/')) return 'en'
  return 'zh'
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
  if (lang === 'en') return `${EN_MONTHS[d.getMonth()]} ${d.getDate()}`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 完整日期：2026年12月31日 / December 31, 2026 */
export function formatFullDate(d: Date, lang: Lang): string {
  if (lang === 'en') return `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  return `${d.getFullYear()}年${formatMonthDay(d, 'zh')}`
}

/** 阅读时长估算：中文 ~400 字/分，英文 ~180 wpm */
export function readingMinutes(text: string, lang: Lang): number {
  const words = lang === 'zh' ? text.length : text.split(/\s+/).filter(Boolean).length
  const wpm = lang === 'zh' ? 400 : 180
  return Math.max(1, Math.round(words / wpm))
}

/** 构造文章链接（含 base 与语言前缀），如 '/minimal-blog/posts/hello-mingzhi/' */
export function postHref(base: string, lang: Lang, id: string): string {
  return `${base}${lang === 'en' ? 'en/' : ''}posts/${slugOfId(id)}/`
}

/**
 * 语言切换目标。path 为当前路径（不含语言前缀，如 '/posts/x/'、'/about/'、'/'）。
 * 无对应语言版本（hasTranslation=false）时切到该语言首页，避免 404。
 */
export function switchHref(
  base: string,
  lang: Lang,
  path: string,
  hasTranslation = true,
): string {
  if (!hasTranslation) return lang === 'zh' ? `${base}en/` : `${base}`
  return lang === 'zh'
    ? `${base}en${path}`
    : `${base}${path.replace(/^\//, '')}`
}
