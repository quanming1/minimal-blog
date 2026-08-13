/** 站内搜索：索引构建（SSG 构建期）与前端过滤（纯函数，单测友好）
 * 见 docs/ui-analysis.md §11.3
 */
import { serializeJsonForHtml } from './html'

export interface SearchEntry {
  /** 文章 id（含语言前缀，如 zh/hello-mingzhi） */
  id: string
  title: string
  description?: string
  tags: string[]
  /** 专栏（可选，与 frontmatter column 对应；可被搜索命中） */
  column?: string
  /** 完整链接（含 base 前缀） */
  href: string
  /** 语言：en/ 前缀为英文，否则中文 */
  lang: 'zh' | 'en'
  /** YYYY-MM-DD */
  date: string
}

/** 构建期生成索引（Astro frontmatter 中调用 getCollection 后传入） */
export function buildSearchIndex(posts: {
  id: string
  title: string
  description?: string
  tags: string[]
  column?: string
  href: string
  date: string
}[]): SearchEntry[] {
  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    tags: p.tags,
    column: p.column,
    href: p.href,
    lang: p.id.startsWith('en/') ? 'en' : 'zh',
    date: p.date,
  }))
}

/** 前端过滤：query 大小写不敏感匹配 title/description/tags/column；空 query 返回空数组（不展示全部） */
export function filterPosts(index: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results = index.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      (e.description ?? '').toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q)) ||
      (e.column ?? '').toLowerCase().includes(q),
  )
  return results.slice(0, limit)
}

/** 索引序列化为 HTML 内联 JSON（安全）：委托 src/lib/html.ts serializeJsonForHtml（全量转义 `<`，
 * `\u003c` 是 JSON 合法转义，JSON.parse 可还原）。见 docs/security.md §2 */
export function serializeIndexForHtml(index: SearchEntry[]): string {
  return serializeJsonForHtml(index)
}
