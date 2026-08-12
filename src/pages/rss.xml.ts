// RSS 2.0 feed（全部文章，zh+en 含各自语言标题；构建期静态生成）
// 生成器见 src/lib/rss.ts（零依赖纯函数，单测覆盖）
import { getCollection } from 'astro:content'
import { buildRss } from '../lib/rss'
import { sortPostsByDate } from '../lib/posts'
import { langOfId, parseDateString, postHref } from '../lib/utils'
import { SITE_URL } from '../lib/seo'

const base = import.meta.env.BASE_URL
const posts = await getCollection('posts')
// 排序键：post.date 在 data 层，映射出 { id, date } 排序后找回原对象
const order = sortPostsByDate(posts.map((p) => ({ id: p.id, date: parseDateString(p.data.date) })))

const items = order.map((s) => {
  const p = posts.find((x) => x.id === s.id)!
  return {
    title: p.data.title,
    link: `${SITE_URL}${postHref(base, langOfId(p.id), p.id)}`,
    description: p.data.description,
    date: p.data.date,
  }
})

const siteUrl = `${SITE_URL}${base}`
const xml = buildRss({
  title: '明志 · Mingzhi Notes',
  description: '技术笔记、阅读与思考。',
  siteUrl,
  feedUrl: `${siteUrl}rss.xml`,
  posts: items,
  lang: 'zh',
})

export const GET = () =>
  new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
