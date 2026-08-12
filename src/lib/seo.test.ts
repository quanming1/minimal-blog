import { describe, expect, it } from 'bun:test'
import {
  absoluteUrl,
  alternateUrls,
  blogPostingJsonLd,
  inLanguageOf,
  localeOf,
  serializeJsonLd,
  webSiteJsonLd,
} from './seo'

const BASE = '/minimal-blog/'

describe('absoluteUrl', () => {
  it('首页：base 尾部斜杠 + path "/" 拼接', () => {
    expect(absoluteUrl(BASE, '/')).toBe('https://quanming1.github.io/minimal-blog/')
  })

  it('文章页：base + 路径段', () => {
    expect(absoluteUrl(BASE, '/posts/hello-mingzhi/')).toBe(
      'https://quanming1.github.io/minimal-blog/posts/hello-mingzhi/',
    )
  })

  it('en 版路径带语言前缀', () => {
    expect(absoluteUrl(BASE, '/en/posts/hello-mingzhi/')).toBe(
      'https://quanming1.github.io/minimal-blog/en/posts/hello-mingzhi/',
    )
  })
})

describe('localeOf / inLanguageOf', () => {
  it('zh → og:locale zh_CN / inLanguage zh-CN', () => {
    expect(localeOf('zh')).toBe('zh_CN')
    expect(inLanguageOf('zh')).toBe('zh-CN')
  })

  it('en → og:locale en_US / inLanguage en', () => {
    expect(localeOf('en')).toBe('en_US')
    expect(inLanguageOf('en')).toBe('en')
  })
})

describe('blogPostingJsonLd', () => {
  const baseInput = {
    title: '你好，明志',
    datePublished: '2026-08-12',
    author: '蒋全明',
    lang: 'zh' as const,
    url: 'https://quanming1.github.io/minimal-blog/posts/hello-mingzhi/',
  }

  it('结构：BlogPosting + headline + datePublished 原字符串（不转 Date 防时区偏移）', () => {
    const ld = blogPostingJsonLd(baseInput)
    expect(ld['@type']).toBe('BlogPosting')
    expect(ld.headline).toBe('你好，明志')
    expect(ld.datePublished).toBe('2026-08-12')
  })

  it('author 为 Person 结构', () => {
    const ld = blogPostingJsonLd(baseInput)
    expect(ld.author).toEqual({ '@type': 'Person', name: '蒋全明' })
  })

  it('inLanguage 与 publisher 按语言', () => {
    const zh = blogPostingJsonLd(baseInput)
    expect(zh.inLanguage).toBe('zh-CN')
    expect(zh.publisher).toEqual({ '@type': 'Organization', name: '明志' })
    const en = blogPostingJsonLd({ ...baseInput, lang: 'en', author: 'Quanming Jiang' })
    expect(en.inLanguage).toBe('en')
    expect(en.publisher).toEqual({ '@type': 'Organization', name: 'Mingzhi' })
  })

  it('description 存在时输出，缺省时不输出', () => {
    expect(blogPostingJsonLd({ ...baseInput, description: '摘要' }).description).toBe('摘要')
    expect('description' in blogPostingJsonLd(baseInput)).toBe(false)
  })

  it('mainEntityOfPage / url 指向 canonical', () => {
    const ld = blogPostingJsonLd(baseInput)
    expect(ld.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': 'https://quanming1.github.io/minimal-blog/posts/hello-mingzhi/',
    })
    expect(ld.url).toBe('https://quanming1.github.io/minimal-blog/posts/hello-mingzhi/')
  })
})

describe('webSiteJsonLd', () => {
  it('WebSite 结构', () => {
    expect(webSiteJsonLd('明志', 'https://quanming1.github.io/minimal-blog/', 'zh')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: '明志',
      url: 'https://quanming1.github.io/minimal-blog/',
      inLanguage: 'zh-CN',
    })
  })
})

describe('alternateUrls（hreflang 规则）', () => {
  it('zh 首页：当前 zh-CN + en 版本 + x-default 指 zh 首页', () => {
    expect(alternateUrls({ lang: 'zh', base: BASE, path: '/', hasTranslation: true })).toEqual([
      { hreflang: 'zh-CN', href: 'https://quanming1.github.io/minimal-blog/' },
      { hreflang: 'en', href: 'https://quanming1.github.io/minimal-blog/en/' },
      { hreflang: 'x-default', href: 'https://quanming1.github.io/minimal-blog/' },
    ])
  })

  it('zh 文章页（有翻译）：en 版指向 /en/posts/…', () => {
    const urls = alternateUrls({ lang: 'zh', base: BASE, path: '/posts/x/', hasTranslation: true })
    expect(urls[1]).toEqual({ hreflang: 'en', href: 'https://quanming1.github.io/minimal-blog/en/posts/x/' })
    expect(urls[2].hreflang).toBe('x-default')
  })

  it('en 文章页：当前 en + zh-CN 对应（去 en 前缀）', () => {
    const urls = alternateUrls({ lang: 'en', base: BASE, path: '/posts/x/', hasTranslation: true })
    expect(urls[0]).toEqual({ hreflang: 'en', href: 'https://quanming1.github.io/minimal-blog/en/posts/x/' })
    expect(urls[1]).toEqual({ hreflang: 'zh-CN', href: 'https://quanming1.github.io/minimal-blog/posts/x/' })
  })

  it('无翻译：只输出当前语言 + x-default（不指向不存在的页面）', () => {
    expect(alternateUrls({ lang: 'zh', base: BASE, path: '/posts/only-zh/', hasTranslation: false })).toEqual([
      { hreflang: 'zh-CN', href: 'https://quanming1.github.io/minimal-blog/posts/only-zh/' },
      { hreflang: 'x-default', href: 'https://quanming1.github.io/minimal-blog/' },
    ])
    expect(alternateUrls({ lang: 'en', base: BASE, path: '/posts/only-en/', hasTranslation: false })).toEqual([
      { hreflang: 'en', href: 'https://quanming1.github.io/minimal-blog/en/posts/only-en/' },
      { hreflang: 'x-default', href: 'https://quanming1.github.io/minimal-blog/' },
    ])
  })
})

describe('serializeJsonLd（注入安全）', () => {
  it('含 < 的内容转义为 \\u003c（防 </script> 逃逸）', () => {
    const s = serializeJsonLd({ headline: '</script><script>alert(1)</script>' })
    expect(s).not.toContain('</script>')
    // 只转义 <（闭合 script 的关键字符），> 原样（与 search.ts serializeIndexForHtml 同款）
    expect(s).toContain('\\u003c/script>')
  })

  it('转义后 JSON.parse 可还原（\\u003c 是合法 JSON 转义）', () => {
    const s = serializeJsonLd({ headline: 'a < b & "q"' })
    expect(JSON.parse(s).headline).toBe('a < b & "q"')
  })

  it('正常内容不含 <', () => {
    expect(serializeJsonLd({ headline: '你好，明志' })).toBe('{"headline":"你好，明志"}')
  })
})
