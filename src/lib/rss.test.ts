import { describe, expect, test } from 'bun:test'
import { buildRss, escapeXml, toRfc822 } from './rss'

const baseOpts = {
  title: '明志',
  description: '测试 feed',
  siteUrl: 'https://quanming1.github.io/minimal-blog/',
  feedUrl: 'https://quanming1.github.io/minimal-blog/rss.xml',
  lang: 'zh' as const,
  posts: [
    { title: '第一篇文章', link: 'https://quanming1.github.io/minimal-blog/posts/a/', date: '2026-08-12' },
    { title: 'Second & <Post>', link: 'https://quanming1.github.io/minimal-blog/en/posts/b/', date: '2026-08-11', description: '描述 <tag> & 内容' },
  ],
}

describe('escapeXml', () => {
  test('五字符全转义且 & 最先', () => {
    expect(escapeXml(`a & b < c > d "e" 'f'`)).toBe('a &amp; b &lt; c &gt; d &quot;e&quot; &apos;f&apos;')
  })
})

describe('toRfc822', () => {
  test('YYYY-MM-DD → RFC 822（UTC，无时区偏移）', () => {
    expect(toRfc822('2026-08-12')).toBe('Wed, 12 Aug 2026 00:00:00 GMT')
  })

  test('跨年边界', () => {
    expect(toRfc822('2026-01-01')).toBe('Thu, 01 Jan 2026 00:00:00 GMT')
  })
})

describe('buildRss', () => {
  test('RSS 结构完整：channel + 2 个 item + 元信息', () => {
    const xml = buildRss(baseOpts)
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('<title>明志</title>')
    expect(xml).toContain('<link>https://quanming1.github.io/minimal-blog/</link>')
    expect(xml).toContain('<atom:link href="https://quanming1.github.io/minimal-blog/rss.xml" rel="self"')
    expect(xml).toContain('<language>zh-cn</language>')
    expect((xml.match(/<item>/g) || []).length).toBe(2)
    expect(xml).toContain('<pubDate>Wed, 12 Aug 2026 00:00:00 GMT</pubDate>')
  })

  test('标题/描述 XML 转义（& < 不破坏结构）', () => {
    const xml = buildRss(baseOpts)
    expect(xml).toContain('<title>Second &amp; &lt;Post&gt;</title>')
    expect(xml).toContain('<description>描述 &lt;tag&gt; &amp; 内容</description>')
  })

  test('item 有 description 才输出（无 description 不输出空标签）', () => {
    const xml = buildRss(baseOpts)
    expect(xml).not.toContain('<description></description>')
  })

  test('en 语言', () => {
    const xml = buildRss({ ...baseOpts, lang: 'en' })
    expect(xml).toContain('<language>en</language>')
  })

  test('categories 输出 <category>（每个一行，XML 转义）', () => {
    const xml = buildRss({
      ...baseOpts,
      posts: [
        { title: 'A', link: 'https://x/', date: '2026-08-12', categories: ['Rondo 方法', '博客 & 开发'] },
        { title: 'B', link: 'https://y/', date: '2026-08-11' },
      ],
    })
    expect(xml).toContain('<category>Rondo 方法</category>')
    expect(xml).toContain('<category>博客 &amp; 开发</category>')
    expect((xml.match(/<category>/g) || []).length).toBe(2)
  })

  test('无 categories 不输出空 <category> 标签', () => {
    const xml = buildRss(baseOpts)
    expect(xml).not.toContain('<category>')
  })

  test('空 posts 也输出合法 RSS（channel 无 item）', () => {
    const xml = buildRss({ ...baseOpts, posts: [] })
    expect(xml).toContain('<channel>')
    expect((xml.match(/<item>/g) || []).length).toBe(0)
  })
})
