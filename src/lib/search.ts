/** 站内搜索：索引构建（SSG 构建期）与前端过滤（纯函数，单测友好）
 * 见 docs/ui-analysis.md §11.3
 */

export interface SearchEntry {
  /** 文章 id（含语言前缀，如 zh/hello-mingzhi） */
  id: string
  title: string
  description?: string
  tags: string[]
  /** 完整链接（含 base 前缀） */
  href: string
  /** 语言：en/ 前缀为英文，否则中文 */
  lang: 'zh' | 'en'
  /** YYYY-MM-DD */
  date: string
}

export interface SearchSource {
  id: string
  title: string
  description?: string
  tags: string[]
  href: string
  date: string
}

/** 构建期生成索引（Astro frontmatter 中调用 getCollection 后传入） */
export function buildSearchIndex(posts: SearchSource[]): SearchEntry[] {
  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    tags: p.tags,
    href: p.href,
    lang: p.id.startsWith('en/') ? 'en' : 'zh',
    date: p.date,
  }))
}

/** 前端过滤：query 大小写不敏感匹配 title/description/tags；空 query 返回空数组（不展示全部） */
export function filterPosts(index: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results = index.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      (e.description ?? '').toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q)),
  )
  return results.slice(0, limit)
}
