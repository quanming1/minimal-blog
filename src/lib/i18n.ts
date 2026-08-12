/** i18n 文案字典（zh 默认 / en）：导航、页脚、页面标题等界面文案 */
import type { Lang } from './utils'

const dictDef = {
  siteName: { zh: '明志', en: 'Mingzhi' },
  tagline: { zh: '非淡泊无以明志，非宁静无以致远', en: 'Without indifference there is no clear aspiration.' },
  navHome: { zh: '首页', en: 'Home' },
  navPosts: { zh: '文章', en: 'Posts' },
  navAbout: { zh: '关于', en: 'About' },
  switchLang: { zh: 'EN', en: '中文' },
  postsTitle: { zh: '文章', en: 'Posts' },
  aboutTitle: { zh: '关于', en: 'About' },
  firstWritten: { zh: '初写于', en: 'First written on' },
  minRead: { zh: '约 {n} 分钟', en: '{n} min. read' },
  allPosts: { zh: '全部文章', en: 'All posts' },
  backHome: { zh: '← 回首页', en: '← home' },
  footerNote: { zh: '写，是因为想明白了一些事，想把它留下来。', en: 'I write because I figured something out and want to keep it.' },
  emailLabel: { zh: '邮箱', en: 'Email' },
} as const

export type I18nKey = keyof typeof dictDef

/** 显式宽类型：值允许替换占位符后返回任意 string */
const dict: Record<I18nKey, Record<Lang, string>> = dictDef

/** 取当前语言文案；{n} 占位符替换 */
export function t(lang: Lang, key: I18nKey, vars?: Record<string, string | number>): string {
  let s = dict[key][lang]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v))
  }
  return s
}
