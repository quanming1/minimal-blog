/**
 * SEO 工具层（纯函数，构建期调用）：绝对 URL、JSON-LD 结构化数据、hreflang 替代链接。
 * 设计见 docs/seo.md（v1.6.0）：
 *  - 所有 canonical/OG/JSON-LD URL 必须是绝对 URL = SITE_URL + base + path
 *  - datePublished 用 frontmatter 原字符串（YYYY-MM-DD），避免 parseDateString 本地时区 Date 转 ISO 偏移
 *  - JSON-LD 由 Base.astro 用 is:inline set:html 注入（Astro 对非 JS script 透传不求值）
 */
import type { Lang } from './utils'
import { serializeJsonForHtml } from './html'

/** 站点原始地址（不含 base）。GitHub Pages 域名，与 astro.config.mjs site 一致 */
export const SITE_URL = 'https://quanming1.github.io'

/** 拼接页面绝对 URL：base 形如 '/minimal-blog/'（尾部斜杠），path 形如 '/posts/x/' 或 '/' */
export function absoluteUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, '')
  return `${SITE_URL}${b}${path.startsWith('/') ? path : `/${path}`}`
}

/** Open Graph locale：zh-CN → zh_CN、en → en_US */
export function localeOf(lang: Lang): string {
  return lang === 'zh' ? 'zh_CN' : 'en_US'
}

/** schema.org inLanguage 值 */
export function inLanguageOf(lang: Lang): string {
  return lang === 'zh' ? 'zh-CN' : 'en'
}

/** BlogPosting JSON-LD（文章页）入参 */
export interface BlogPostingInput {
  title: string
  description?: string
  /** 创建日期：frontmatter 原字符串 YYYY-MM-DD（不转 Date） */
  datePublished: string
  author: string
  lang: Lang
  /** 页面绝对 URL（canonical） */
  url: string
}

/** BlogPosting 结构化数据：文章页让 Google 展示作者/日期/语言的富结果 */
export function blogPostingJsonLd(i: BlogPostingInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: i.title,
    ...(i.description ? { description: i.description } : {}),
    inLanguage: inLanguageOf(i.lang),
    datePublished: i.datePublished,
    author: { '@type': 'Person', name: i.author },
    publisher: { '@type': 'Organization', name: i.lang === 'zh' ? '明志' : 'Mingzhi' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': i.url },
    url: i.url,
  }
}

/** WebSite JSON-LD（首页/关于页）：站点身份信息 */
export function webSiteJsonLd(name: string, url: string, lang: Lang): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    inLanguage: inLanguageOf(lang),
  }
}

/**
 * JSON-LD 序列化（注入 HTML 前调用）：委托 src/lib/html.ts serializeJsonForHtml（全量转义 `<` 防
 * `</script>` 与 `<!--` 逃逸）。由 Base.astro 以 `is:inline set:html` 注入（Astro 对非 JS script 透传不求值）。
 */
export function serializeJsonLd(obj: Record<string, unknown>): string {
  return serializeJsonForHtml(obj)
}

/** hreflang 替代链接（<link rel="alternate" hreflang="...">） */
export interface AlternateUrl {
  hreflang: string
  href: string
}

/**
 * 中英互译 hreflang 规则：
 *  - 当前语言版本始终输出；hasTranslation=true 时输出另一语言版本（避免指向不存在的页面）
 *  - x-default 始终指向默认语言（zh）首页
 * path 不含语言前缀（Base.astro 约定）：'/'、'/posts/x/'、'/about/'
 */
export function alternateUrls(opts: {
  lang: Lang
  base: string
  path: string
  hasTranslation: boolean
}): AlternateUrl[] {
  const { lang, base, path, hasTranslation } = opts
  const zhUrl = absoluteUrl(base, path)
  const enUrl = absoluteUrl(base, `/en${path}`)
  const urls: AlternateUrl[] = []
  if (lang === 'zh') {
    urls.push({ hreflang: 'zh-CN', href: zhUrl })
    if (hasTranslation) urls.push({ hreflang: 'en', href: enUrl })
  } else {
    urls.push({ hreflang: 'en', href: enUrl })
    if (hasTranslation) urls.push({ hreflang: 'zh-CN', href: zhUrl })
  }
  urls.push({ hreflang: 'x-default', href: absoluteUrl(base, '/') })
  return urls
}
