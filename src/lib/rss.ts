/** RSS 2.0 生成器（零依赖纯函数，单测友好），供 /rss.xml 页面（src/pages/rss.xml.ts）调用。
 * 手写而非 @astrojs/rss：零依赖符合项目自研气质、双语/链接/转义完全可控。
 */

export interface RssPost {
  title: string
  /** 绝对 URL（含 base），如 https://quanming1.github.io/minimal-blog/posts/x/ */
  link: string
  description?: string
  /** YYYY-MM-DD（frontmatter 原字符串，勿转 Date 避免时区偏移） */
  date: string
  /** 分类（可选，对应 frontmatter column；输出 RSS <category>） */
  categories?: string[]
}

export interface RssOptions {
  title: string
  description: string
  /** 站点根（含 base 尾部斜杠） */
  siteUrl: string
  /** feed 自身绝对 URL */
  feedUrl: string
  posts: RssPost[]
  lang: 'zh' | 'en'
}

/** XML 转义（& 最先防二次转义） */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** YYYY-MM-DD → RFC 822（RSS pubDate 标准）：用 Date.UTC 构造避免本地时区偏移 */
export function toRfc822(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toUTCString()
}

export function buildRss(opts: RssOptions): string {
  const items = opts.posts
    .map(
      (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(p.link)}</link>
      <guid isPermaLink="false">${escapeXml(p.link)}</guid>
      <pubDate>${toRfc822(p.date)}</pubDate>${p.categories?.length ? `\n${p.categories.map((c) => `      <category>${escapeXml(c)}</category>`).join('\n')}` : ''}${p.description ? `\n      <description>${escapeXml(p.description)}</description>` : ''}
    </item>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(opts.title)}</title>
    <link>${escapeXml(opts.siteUrl)}</link>
    <description>${escapeXml(opts.description)}</description>
    <atom:link href="${escapeXml(opts.feedUrl)}" rel="self" type="application/rss+xml"/>
    <language>${opts.lang === 'zh' ? 'zh-cn' : 'en'}</language>
${items}
  </channel>
</rss>
`
}
