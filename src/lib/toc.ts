/** 文章目录（TOC）：从 Astro 渲染的 headings 生成目录项（纯函数，可单测） */

export interface HeadingLike {
  depth: number
  slug: string
  text: string
}

export interface TocItem {
  id: string
  text: string
  depth: number
}

/**
 * 生成目录：过滤掉 h1（文章标题页内已有）与过深标题（> h4），
 * 按文档顺序输出。id 直接使用 Astro 生成的 slug（与标题锚点一致）。
 */
export function buildToc(headings: HeadingLike[]): TocItem[] {
  return headings
    .filter((h) => h.depth >= 2 && h.depth <= 4)
    .map((h) => ({ id: h.slug, text: h.text, depth: h.depth }))
}
