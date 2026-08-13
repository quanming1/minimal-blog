/** 文章数据层纯函数（排序/相邻/相关/标签收集），构建期调用，单测友好。
 * 输入统一用 getCollection 后的条目映射（id 含语言前缀 + parseDateString 本地时区日期）。
 */

/** 按日期倒序（新 → 旧） */
export function sortPostsByDate<T extends { date: Date }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.date.valueOf() - a.date.valueOf())
}

/**
 * 相邻文章（详情页上下篇导航）。
 * 输入按日期倒序的数组；prev = 列表前一位（日期更新），next = 后一位（日期更旧）。
 * 边界：当前在首/尾/不存在时对应字段缺省（undefined，模板条件渲染）。
 */
export function getAdjacentPosts<T extends { id: string; date: Date }>(
  posts: T[],
  currentId: string,
): { prev?: T; next?: T } {
  const sorted = sortPostsByDate(posts)
  const idx = sorted.findIndex((p) => p.id === currentId)
  if (idx === -1) return {}
  return {
    prev: idx > 0 ? sorted[idx - 1] : undefined,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : undefined,
  }
}

/** 相关文章：同标签优先（共享标签数降序），再按日期新优先；排除自身；最多 limit 篇。
 * 无任何共享标签时返回空数组（不硬凑推荐，保持诚实）。 */
export function getRelatedPosts<T extends { id: string; tags: string[]; date: Date }>(
  posts: T[],
  currentId: string,
  limit = 2,
): T[] {
  const current = posts.find((p) => p.id === currentId)
  if (!current) return []
  const currentTags = new Set(current.tags)
  return posts
    .filter((p) => p.id !== currentId)
    .map((p) => ({ post: p, shared: p.tags.filter((t) => currentTags.has(t)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || b.post.date.valueOf() - a.post.date.valueOf())
    .slice(0, limit)
    .map((x) => x.post)
}

/** 全部标签：去重 + 计数，按计数倒序（相同按 tag 名升序）。 */
export function getAllTags(posts: { tags: string[] }[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const p of posts) {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh'))
}

/** 全部专栏：去重 + 计数，按计数倒序（相同按专栏名升序）；无专栏的文章不计入。 */
export function getAllColumns(posts: { column?: string }[]): { column: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const p of posts) {
    if (!p.column) continue
    counts.set(p.column, (counts.get(p.column) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([column, count]) => ({ column, count }))
    .sort((a, b) => b.count - a.count || a.column.localeCompare(b.column, 'zh'))
}

/** 专栏内排序（阅读顺序）：columnOrder 升序（小在前）；无 columnOrder 的按日期倒序排最后。
 * 返回新数组不修改入参。 */
export function sortColumnPosts<T extends { columnOrder?: number; date: Date }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const ao = a.columnOrder ?? Number.MAX_SAFE_INTEGER
    const bo = b.columnOrder ?? Number.MAX_SAFE_INTEGER
    return ao - bo || b.date.valueOf() - a.date.valueOf()
  })
}
