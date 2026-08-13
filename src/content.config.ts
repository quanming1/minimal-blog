import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

/**
 * 文章集合（Astro Content Layer：glob loader）。
 * 目录：src/content/posts/ 下按语言分子目录
 *   posts/zh/<slug>.md  → 中文（默认语言，URL 无前缀 /posts/<slug>/）
 *   posts/en/<slug>.md  → 英文（URL 前缀 /en/posts/<slug>/）
 * 同 slug 的中英两篇视为翻译关系（语言切换时互跳）。
 * 条目 id = 相对 base 的路径（去扩展名），如 'zh/hello-mingzhi'。
 */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    /** 文章标题（列表与详情页展示） */
    title: z.string(),
    /** 初写日期：YYYY-MM-DD（schema 保持字符串，页面/工具用 parseDateString 转本地时区日期） */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    /** 摘要：列表页可展示，建议 1-2 句 */
    description: z.string().optional(),
    /** 作者：缺省时按文章语言取 i18n authorName（zh 蒋全明 / en Quanming Jiang，hardcode 本人）；frontmatter 可写 author 覆盖 */
    author: z.string().optional(),
    /** 标签（可选，详情页展示） */
    tags: z.array(z.string()).default([]),
    /** 专栏（可选）：系列文章分类。语言相关的原始字符串（zh 写中文名 / en 写英文名，与 tag 同机制）；
     * 专栏页 /columns/<column>/ 按语言聚合，中英专栏页相互独立 */
    column: z.string().optional(),
    /** 专栏内排序（可选）：数值升序（小在前）；缺省按日期倒序。仅 column 存在时有意义 */
    columnOrder: z.number().int().optional(),
  }),
})

export const collections = { posts }
