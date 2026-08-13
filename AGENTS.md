# AGENTS.md — 本仓库的 AI Agent 维护指令

> 给 AI Agent（ftre / Cursor / Claude Code 等）维护此仓库时的行为规范。
> 目标：**明志博客** — Astro 7 静态站，Markdown 写作（中英双语），GitHub Pages 托管。

## 仓库结构与职责

| 路径 | 职责 | 谁改 |
|---|---|---|
| `src/content/posts/zh/*.md` | 中文文章 | 日常写作 |
| `src/content/posts/en/*.md` | 英文文章（同 slug = 翻译对） | 日常写作 |
| `src/content.config.ts` | 文章集合 schema（title/date/author/description/tags；author 缺省按语言 hardcode：zh 蒋全明 / en Quanming Jiang） | 协议变更 |
| `src/lib/*` | 纯函数（i18n 字典 / 日期/分组/slug/URL 构造 / seo：URL/JSON-LD/hreflang） | 功能改动 |
| `src/layouts/Base.astro` | 全局布局（导航/语言切换/主题/页脚）+ SEO head（canonical/OG/JSON-LD/hreflang） | 布局改动 |
| `src/components/PostList.astro` | 首页年份分组列表 | 列表改动 |
| `src/components/SearchDialog.astro` | 站内搜索（Cmd+K，mb-dialog 容器 + 过滤 + 键盘导航） | 搜索改动 |
| `src/components/wc/*.ts` | mb-\* 组件库（mb-dialog / mb-toast，零依赖 Web Components） | 组件库改动 |
| `src/markdown/**` | Markdown 语法拓展（index.ts 注册表 + remark/ 插件 + 单测） | 语法拓展 |
| `docs/markdown-extensions.md` | 语法清单 + 新增拓展开发指南（**新增语法前先读**） | 语法拓展 |
| `src/lib/search.ts` | 搜索索引构建 / 过滤纯函数 | 功能改动 |
| `src/lib/posts.ts` | 文章数据层纯函数（排序/相邻/相关/标签收集） | 功能改动 |
| `src/lib/rss.ts` | RSS 2.0 生成器（escapeXml/toRfc822/buildRss） | 功能改动 |
| `src/pages/tags/**` | 标签页路由（/tags/ 云 + /tags/[tag]/ 筛选，zh/en 双语） | 页面改动 |
| `src/test/setup-dom.ts` | jsdom 测试基座（组件测试注入全局） | 测试基建 |
| `src/pages/**` | 页面路由（zh 无前缀 / en 前缀） | 页面改动 |
| `src/styles/global.css` | 全部样式（olivierlacan 风格 + 双主题 + 响应式断点体系 §10） | 样式改动 |
| `docs/ui-analysis.md` | 设计规范来源（改样式前先读） | 设计决策 |
| `docs/security.md` | 安全基线（威胁模型/加固项/维护约定——**改安全代码前先读**） | 安全改动 |
| `docs/design-tokens.md` | Style Token 体系（三层架构/token 表/Tailwind 使用——**改样式前先读**） | 样式改动 |
| `docs/seo.md` | SEO 架构（meta 清单/JSON-LD/hreflang 规则/sitemap/frontmatter 元数据约定——**改 SEO 代码前先读**） | SEO 改动 |
| `src/lib/seo.ts` | SEO 纯函数（absoluteUrl/JSON-LD/alternateUrls/serializeJsonLd） | SEO 改动 |
| `astro.config.mjs` | Astro + Tailwind(vite) + sitemap + markdown.processor 配置 | 构建配置 |
| `bunfig.toml` | registry 显式声明（npmmirror，lockfile 来源） | 依赖配置 |
| `.github/workflows/deploy.yml` | lint → test → build(smoke) → deploy | 部署改动 |

## 写作规范（日常任务）

### 新增中文文章

1. 新建 `src/content/posts/zh/<slug>.md`，frontmatter：
   ```markdown
   ---
   title: 标题
   date: '2026-08-12'   # ⚠️ 必须带引号！YAML 会把裸日期解析成对象，导致构建失败；此为创建日期
   description: 一句话摘要（可选）
   author: 蒋全明         # 可选，缺省默认「蒋全明」（见 docs/seo.md §4）
   tags: [标签]          # 可选
   ---
   ```
2. 标准 Markdown 正文（代码块自动高亮）
3. 需要英文版 → 新建 `en/<同slug>.md`（不强制，缺翻译时语言切换自动回退首页）

### 约束

- **`date` 必须带引号**（`'YYYY-MM-DD'`）；`slug` 用小写短横线；同 slug 中英两篇必须同一日期语义（可不相同）
- **md 文件必须 UTF-8 无 BOM**（BOM 会导致 Astro 正文渲染为空但 frontmatter 正常——见 docs/markdown-extensions.md §6）
- **不要动** `src/layouts` / `src/pages` / `src/styles` 除非任务明确涉及样式或功能
- 改响应式规则（断点/媒体查询/触屏目标）→ 先读 `docs/ui-analysis.md §10` 断点矩阵，改完在 375/768/1024/1280 至少四个视口验证无横向溢出；设计决策变更必须同步文档
- 新增纯函数逻辑 → 放 `src/lib/` 并**必须配单测**（`src/lib/*.test.ts`，bun test）
- 新增 mb-\* 组件 → 放 `src/components/wc/`，需 `customElements.get()` 守卫注册 + 组件测试（`src/components/wc/*.test.ts`，首行 `import '../../test/setup-dom'` 注入 jsdom；主题一律走 CSS 变量继承，不硬编码颜色）
- 改安全相关代码（CSP/头/CI 权限/依赖/注入点）→ 先读 `docs/security.md`（威胁模型与维护约定），改完跑 `npm audit`（临时 lockfile 方式）并同步文档
- 新增 Markdown 语法拓展 → 先读 `docs/markdown-extensions.md`（6 步流程：插件放 `src/markdown/remark/` + index.ts 注册 + 单测 + CSS + 文档 + 验证）；遵守 XSS 约束（优先 data.hName，html 节点必须 escapeHtml）与插件顺序（结构级在前）
- 改 SEO 相关代码（Base.astro head / src/lib/seo.ts / astro.config.mjs / robots.txt）→ 先读 `docs/seo.md`；JSON-LD 必须 `is:inline set:html` + `serializeJsonLd`（Astro 对非 JS script 透传不求值）；datePublished 用 frontmatter 原字符串不转 Date；hreflang 遵循 `alternateUrls` 规则（hasTranslation 才输出互译）
 - 提交信息（Conventional Commits）：`<type>(<scope>): <subject>`，subject 中文
   - type 白名单：`post`（文章）/ `feat`（功能）/ `fix`（修复）/ `docs`（文档）/ `style`（样式）/ `refactor`（重构）/ `chore`（杂项）/ `ci`（CI 与部署）/ `test`（测试）/ `perf`（优化）
   - scope 用模块名（见上方路径表）：`posts` / `theme` / `layout` / `lib` / `components` / `styles` / `markdown` / `seo` / `rss` / `tags` / `search` / `ci` / `docs`
   - 例：`post(posts): 新增 git 提交规范文章`、`fix(styles): 加宽文章正文`、`ci(deploy): smoke 测试动态页数`
   - 单 main 分支 + GitHub Pages 部署，无 develop/main 之分，故不适用 develop↔main 走 PR 约束

## 构建与部署

- 包管理器：**Bun**（`package.json` 的 `packageManager` 字段，CI 自动读取）
- 本地验证：`bun run lint && bun run test && bun run build` 全过再提交
- lint = `astro check`（TypeScript 6，**不要升级到 TS 7**——Astro 的 language-server 需要 TS 6.x 的程序化 API）
- 部署：push 到 `main` 自动触发 Actions（lint → test → build + smoke → deploy-pages）
- 站点路径：`https://quanming1.github.io/minimal-blog/`（base = `/minimal-blog`，所有链接带此前缀）

## 禁止事项

- 不把 `date` 写成裸日期（不带引号）；不升级 TypeScript 到 7.x；不改部署方式（Actions + Pages 已配置）
- 不提交 `dist` / `node_modules` / `.astro`（.gitignore 已排除，别 `git add -f`）
- 不把文章内容写进 `CHANGELOG.md`（仅工程变更）
- 不引入跟踪脚本/外链字体 CDN（字体已自托管，隐私优先；参考 about 页"无跟踪脚本"声明）
- 改样式前先读 `docs/ui-analysis.md`（保持与设计规范一致，新偏差要记录到文档）+ `docs/design-tokens.md`（token 体系：新样式优先用 token 类；自定义规则必须放 `@layer components`，否则压不过 Tailwind utilities）
- 新增 token：`:root` 变量（双主题）→ `@theme` 语义引用 → 模板使用（未使用的 token 不生成，需实际引用）
