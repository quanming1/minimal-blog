# SEO 优化说明（v1.6.0）

> 本文档记录 minimal-blog 的 SEO 架构与约定：head meta 清单、JSON-LD 结构化数据、hreflang 规则、sitemap/robots、frontmatter 元数据约定，以及验证方法。
> 改 SEO 相关代码（Base.astro head / src/lib/seo.ts / astro.config.mjs）前先读本文档。

## §1 现状与目标

静态站（GitHub Pages）SEO 的核心：让爬虫完整发现内容、理解中英翻译关系、输出结构化数据以获得富结果展示。

- **能做的**：head meta（canonical/OG/Twitter/theme-color）、JSON-LD（BlogPosting/WebSite）、hreflang、sitemap.xml、robots.txt
- **做不了的**：HTTP 响应头（GitHub Pages 平台头仅 HSTS + ACAO:*，见 docs/security.md §3.1）——不影响 SEO
- **刻意不做的**：og:image 分享大图（无品牌图资产，见 §6 待办）、robots meta（全站可索引，默认即 index,follow）、BreadcrumbList/Organization 等低价值 JSON-LD

## §2 head meta 清单（Base.astro 统一输出）

所有页面由 `src/layouts/Base.astro` 的 head 统一输出（页面只传语义 props，不直接写 meta）：

| 标签 | 值 | 说明 |
|------|-----|------|
| `<link rel="canonical">` | `SITE_URL + base + path` | 消除 /en 前缀与无前缀的重复内容歧义；path 来自 Base.astro 的 `path` prop |
| `meta name="description"` | 页面 description ?? siteTitle | 文章页传 frontmatter description |
| `og:site_name` | 明志 / Mingzhi | |
| `og:title` / `og:description` | pageTitle / description ?? siteTitle | |
| `og:type` | website（默认）/ article | 文章页传 `type="article"` |
| `og:url` | canonical | |
| `og:locale` | zh_CN / en_US | `localeOf(lang)`，zh-CN → zh_CN |
| `og:locale:alternate` | 另一语言 locale | |
| `article:published_time` | frontmatter date 原字符串 | 仅 article 页 |
| `twitter:card` | summary | 无 Twitter 账号，不做 site/creator |
| `theme-color` | 亮 #ffffff / 暗 #0d1117 | 双 media 查询，与 global.css `--bg` 一致 |
| `<link rel="alternate" hreflang>` | 见 §2.1 | 中英互译 + x-default |
| JSON-LD | 见 §2.2 | `is:inline set:html` 注入 |

### §2.1 hreflang 规则（`alternateUrls`，src/lib/seo.ts）

- 当前语言版本始终输出
- `hasTranslation=true`（文章有对应翻译）才输出另一语言版本——避免 hreflang 指向不存在的页面
- `x-default` 始终指向默认语言（zh）首页，给无语言偏好爬虫/用户兜底
- path 约定：Base.astro 的 `path` 不含语言前缀（`'/'`、`'/posts/x/'`、`'/about/'`），en 版 URL 由 `'/en' + path` 拼接

### §2.2 JSON-LD 结构化数据

| 页面 | 类型 | 关键字段 |
|------|------|---------|
| 文章页 | `BlogPosting` | headline（文章标题，非 pageTitle）、datePublished（frontmatter 原字符串）、author（Person）、inLanguage、publisher（Organization：明志/Mingzhi）、mainEntityOfPage、url |
| 首页/关于页 | `WebSite` | name、url、inLanguage |

**注入方式（关键约束）**：Astro 对非 JS 的 `<script type="application/ld+json">` 透传不求值（v1.3.0 搜索索引 Blocker 同源问题），必须写：

```astro
<script type="application/ld+json" is:inline set:html={serializeJsonLd(jsonLd)}></script>
```

**安全**：`serializeJsonLd` = `JSON.stringify(obj).replace(/</g, '\\u003c')`——`\u003c` 是合法 JSON 转义，防 `</script>` 与 `<!--` 逃逸（与 search.ts `serializeIndexForHtml` 同款，注意源码必须写 `'\\u003c'` 双重转义，单转义是字面 `<`）。JSON-LD 是数据块非可执行脚本，CSP script-src 不拦截。

**时区陷阱**：`datePublished` 直接使用 frontmatter 的 `YYYY-MM-DD` 字符串，**不要**经 `parseDateString()` 转 Date 再 `toISOString()`（本地时区会偏移一天）。schema.org 接受 date 格式。

## §3 sitemap + robots

- **sitemap**：`@astrojs/sitemap` 集成（astro.config.mjs `integrations: [sitemap()]`），构建期自动生成 `sitemap-index.xml` + `sitemap-0.xml`，URL 为 `site + base` 绝对地址。未启用 i18n 配置（本站中英路由是手写 /en 前缀，非 Astro i18n 集成；hreflang 由 Base.astro 输出）
- **robots.txt**：`public/robots.txt`（静态文件，随构建复制到产物根）：

```
User-agent: *
Allow: /

Sitemap: https://quanming1.github.io/minimal-blog/sitemap-index.xml
```

- 新增路由无需手动维护 sitemap（集成自动收集）；改 `site`/`base` 需同步改 robots.txt 的 Sitemap URL

## §4 frontmatter 元数据约定

frontmatter 字段（schema 见 src/content.config.ts）：

| 字段 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `title` | ✓ | - | 文章标题（列表/详情/headline） |
| `date` | ✓ | - | **创建日期** `YYYY-MM-DD`（即本项目的"创建日期"字段，schema 保持字符串，页面用 parseDateString 转本地时区） |
| `description` | ✗ | - | 摘要：meta description + JSON-LD description |
| `author` | ✗ | 按语言 hardcode | **作者**。缺省时按文章语言取 i18n `authorName`（zh → 蒋全明、en → Quanming Jiang，hardcode 本人）；frontmatter 写了 `author` 则两语言均显示写死的值 |
| `tags` | ✗ | `[]` | 标签 |

作者渲染（按文章语言，i18n `authorName` 键）：zh → 蒋全明、en → Quanming Jiang；frontmatter 写了 `author` 则优先显示写死的值（两语言均显示该值）。文章页 meta 行格式：`作者 · 初写于 日期`（i18n `authorMeta` 键）。

## §5 验证方法

1. **单测**：`bun test src/lib/seo.test.ts`——absoluteUrl、JSON-LD 结构、hreflang 规则（含无翻译分支）、serializeJsonLd 注入安全（`</script>` 逃逸 + JSON.parse 还原）
2. **产物断言**：`bun run build` 后检查 dist HTML——首页含 canonical/og:*/WebSite JSON-LD；文章页含 BlogPosting（author 蒋全明 + datePublished 原字符串）；en 页 og:locale=en_US；`robots.txt` 与 `sitemap-index.xml` 存在
3. **线上验证**：Playwright 访问线上站（`?v=N` 绕 GitHub Pages HTML 缓存），验证 head 完整、JSON-LD 可 JSON.parse、文章页作者显示、robots/sitemap 200

## §6 后续可扩展（待办）

- **og:image**：社交分享大图（1200×630 PNG）。需要品牌视觉资产，暂缺。添加后 Base.astro 输出 `og:image` + `twitter:card=summary_large_image`，并注意 CSP `img-src` 是否放行（同源 'self' 即可）
- **Dependabot**：GitHub Settings → Code security 启用（docs/security.md 待办同步）
- 若引入外链图：按图床域加 CSP img-src 白名单（docs/security.md §3.3 约定）
