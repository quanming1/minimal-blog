/** i18n 文案字典（zh 默认 / en）：导航、页脚、页面标题等界面文案 */
import type { Lang } from './utils'

const dictDef = {
  siteName: { zh: '明志', en: 'Mingzhi' },
  tagline: { zh: '非淡泊无以明志，非宁静无以致远', en: 'Without indifference there is no clear aspiration.' },
  navPosts: { zh: '文章', en: 'Posts' },
  navAbout: { zh: '关于', en: 'About' },
  switchLang: { zh: 'EN', en: '中文' },
  postsTitle: { zh: '文章', en: 'Posts' },
  aboutTitle: { zh: '关于', en: 'About' },
  firstWritten: { zh: '初写于', en: 'First written on' },
  minRead: { zh: '约 {n} 分钟', en: '{n} min. read' },
  backHome: { zh: '← 回首页', en: '← home' },
  footerNote: { zh: '写，是因为想明白了一些事，想把它留下来。', en: 'I write because I figured something out and want to keep it.' },
  navAria: { zh: '主导航', en: 'Primary navigation' },
  searchAria: { zh: '打开搜索', en: 'Open search' },
  searchTitle: { zh: '站内搜索', en: 'Search' },
  searchPlaceholder: { zh: '搜索文章标题或标签…', en: 'Search by title or tag…' },
  searchResults: { zh: '搜索结果', en: 'Search results' },
  searchEmpty: { zh: '没有找到匹配的文章', en: 'No matching posts' },
} as const

export type I18nKey = keyof typeof dictDef

/** 显式宽类型：值允许替换占位符后返回任意 string */
const dict: Record<I18nKey, Record<Lang, string>> = dictDef

/** 取当前语言文案；{n} 占位符替换（replaceAll）；缺失 key 时原样返回 key 兜底 */
export function t(lang: Lang, key: I18nKey, vars?: Record<string, string | number>): string {
  const entry = dict[key]
  if (!entry) return key
  let s = entry[lang] ?? ''
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  }
  return s
}
