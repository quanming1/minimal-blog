/** 站内搜索：索引构建（SSG 构建期）与前端过滤（纯函数，单测友好）
 * 见 docs/ui-analysis.md §11.3
 */
import { serializeJsonForHtml } from './html'

/** markdown 正文 → 纯文本（搜索索引用）：去掉语法符号，保留可搜索文本。
 *  仅处理确定语法（标题/加粗/行内代码/链接/图片/引用/列表/callout/高亮/上下标/代码块/HTML/分隔线），
 *  不处理单 * 单 _ 斜体（避免误伤乘法、下划线变量）。见 PRD-B6。 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (b) => b.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '')) // 围栏代码块
    .replace(/`([^`]+)`/g, '$1') // 行内代码
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // 图片 → alt
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 → 文字
    .replace(/<[^>]+>/g, '') // HTML 标签
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // 标题 #
    .replace(/^\s*>+\s?/gm, '') // 引用 >（含 callout/asset）
    .replace(/\[![A-Z]+\]\s*/g, '') // callout 类型 [!NOTE] 等
    .replace(/\[!asset\]\s*/g, '') // asset 标记
    .replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/gm, '') // 列表 - * + 1.
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 加粗 **
    .replace(/__([^_]+)__/g, '$1') // 加粗 __
    .replace(/==([^=]+)==/g, '$1') // 高亮 ==
    .replace(/[_^]\{([^}]+)\}/g, '$1') // 上下标 _{...} ^{...}
    .replace(/^\s*:\s+/gm, '') // 定义列表 : 定义
    .replace(/^\s*[-*_]{3,}\s*$/gm, '') // 分隔线 ---
    .replace(/[ \t]+/g, ' ') // 合并水平空白
    .replace(/\n{3,}/g, '\n\n') // 合并空行
    .trim()
}

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
  /** 正文纯文本（stripMarkdown 后，可被搜索命中；构建期注入） */
  body?: string
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
  body?: string
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
    body: p.body === undefined ? undefined : stripMarkdown(p.body),
  }))
}

/** 前端过滤：query 大小写不敏感匹配 title/description/tags/column/body；空 query 返回空数组（不展示全部） */
export function filterPosts(index: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results = index.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      (e.description ?? '').toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q)) ||
      (e.column ?? '').toLowerCase().includes(q) ||
      (e.body ?? '').toLowerCase().includes(q),
  )
  return results.slice(0, limit)
}

/** 索引序列化为 HTML 内联 JSON（安全）：委托 src/lib/html.ts serializeJsonForHtml（全量转义 `<`，
 * `\u003c` 是 JSON 合法转义，JSON.parse 可还原）。见 docs/security.md §2 */
export function serializeIndexForHtml(index: SearchEntry[]): string {
  return serializeJsonForHtml(index)
}
