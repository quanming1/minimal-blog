# Changelog

> 版本变更记录。**约定：`src/content/posts/` 下的文章增删改（写作）不进入本文件**——那是内容维护，不是项目版本变更。
> 仅记录工程层面（代码/结构/功能/构建/测试/部署）的变化。

## [1.14.0] - 2026-08-13

### 变更
- **秒级发布（F2）**：部署从「Actions 全链路」改为「gh-pages 产物分支」——`mb publish` 本地 build 后直接把 dist 推到 gh-pages 分支（worktree + force push + `.nojekyll`），Pages 源切为 `legacy`（gh-pages 分支）直接 serve 静态产物，**无 CI 构建，线上秒级可见**（实测改 description → publish → <20s 命中）
- CI 改角色：`.github/workflows/deploy.yml` 由「lint→test→build→deploy」改为纯验证「lint+test」（main push 触发，非阻塞部署）
- 全局 shim 动态定位：`mb-bootstrap.mjs` 从 cwd 向上找 minimal-blog 仓库并**直接 import CLI 入口**（消除 shell 转义导致的参数截断 bug），任意仓库内目录可用

### 验证
- 秒级发布实证：meta 改 description → mb publish → 线上 <20s 命中；gh-pages 含 .nojekyll；Pages 源 legacy/gh-pages 确认；回退预案记录于 docs/prd/PRD-F2-fast-publish.md（gh api 切回 workflow）

## [1.13.0] - 2026-08-13

### 新增
- **mb CLI（F1）**：全局 `mb` 命令操作文章——CRUD（new/list/rm）+ 行号级编辑（lines/edit replace·insert·delete·append，1-based 闭区间）+ frontmatter 字段读写（meta get/set，date/title 自动补引号）+ publish 全流程（验证→commit→push→CI 等待→线上抽查）。源码 `scripts/mb/`（零依赖，Bun 内置 API），单测 21 个；Skill `.ftre/skills/blog-cli/SKILL.md`（其他 agent 的使用说明：命令面/工作流/并发规则）
- **并发安全三层**：① 乐观并发——`mb lines` 返回内容 hash，replace/insert/delete 必须带 `--hash`，文件被他人改过则 exit 2 拒绝（防覆盖）；② 文件锁——写操作互斥（`.mb-lock`：PID+时间戳，TTL 5 分钟超时回收 + pidAlive 检测，EPERM 视为存活），原子写（tmp+rename）；③ publish 串行——全程持锁 + push 前 `pull --rebase` 非 ff 自动重试一次
- 全局注册：package.json `bin` + `%APPDATA%\npm\mb.cmd` 包装（bun link 的 mb.exe 与 npm shim 装的 bun 不兼容，见 PRD-F1 变更记录）
- TODO.yaml 新增 F 阶段（CLI 与自动化：F1 done + F2 草稿/定时发布 todo）

### 变更
- **下线 /en/ 英文站点**：删除 `src/pages/en/**`（7 路由）与 `posts/en/`（2 文章），Base 移除语言切换按钮、hreflang 恒 zh-CN + x-default；构建 27→14 页；`langOfId`/`switchHref`/i18n en 字典等纯函数保留（未来恢复多语言的基建）；AGENTS.md 写作规范同步（只发中文）

### 验证
- 193 tests 全绿（172 + mb 21）、lint 0 errors、build 14 页；CLI 实战：new→lines→edit→hash 冲突 exit 2→活锁 exit 3→meta→rm→publish 全链路；dist 无 en 目录

## [1.12.0] - 2026-08-13

### 新增
- **Markdown 资产引用（`> [!asset]`）**：blockquote 引用 `public/assets/` 下文件 → `asset-card` 卡片（↓ 下载 + GitHub 跳转 + 图片预览），插件工厂 `remarkAsset({ base, repo })`（astro.config 单一事实源）；目录穿越防护（`..` 拒绝）、`<` 拆包安全退化；16 单测（docs/markdown-extensions.md §3.5）
- **专栏功能（frontmatter `column` / `columnOrder`）**：/columns/ 总览 + /columns/[column]/ 系列列表（zh/en 双语），详情页专栏链接、导航入口、搜索命中专栏名、RSS `<category>` 输出；数据层 getAllColumns / sortColumnPosts（13 单测）
- **Rondo 方法治理（D4）**：docs/TODO.yaml（5 阶段 20 步路线图，开发的唯一执行依据）+ docs/PROCESS.md（PRD 驱动六步闭环）+ docs/prd/PRD-E1-performance.md（首个 PRD 驱动阶段）；AGENTS.md 结构表同步

### 优化
- **E1 性能优化**：@fontsource/lato 改用 latin 子集文件（移除无用 latin-ext 声明 + woff base64 内联），Base.css 原始 53.1KB → 31KB（-42%）；首屏字体 preload（400/700 woff2，基线传输 46KB/78KB 为最大资源）；基线 FCP 1296ms（线上实测）
- **Icon 系统丰富**：导航文本箭头（←/→）升级 lucide arrow-left/arrow-right 图标（7 模板 + i18n 文案），mb-toast 加自包含 check 图标（shadow DOM 内联 path，不依赖文档 sprite）

### 变更
- 页脚移除标语「写，是因为想明白了一些事，想把它留下来。」；邮箱 quanming1@gmail.com → 2991537373@qq.com（页脚 + about，zh/en）

### 验证
- 测试 172 全绿、lint 0 errors、构建成功（27 页面）；线上页面 200、图标渲染确认、性能指标复测

## [1.11.0] - 2026-08-13

### 新增
- **Icon 系统（astro-icon + lucide）**：导航搜索 / 主题切换（moon/sun）/ 文章页回顶（arrow-up）全部替换 emoji（🔍/🌙/☀️/↑）为 lucide 线性图标；astro-icon 构建期将图标渲染为**文档内联 sprite**（首实例 `<symbol>` + `<use href="#ai:...">`），零运行时 JS、零外部请求、`currentColor` 随亮暗主题变色；图标名白名单在 astro.config.mjs `icon({ include })`；主题图标由 `html[data-theme]` + CSS 显隐驱动（JS 不再改图标文本）；完整说明 docs/design-tokens.md §7
- 新增 dependencies：astro-icon / @iconify-json/lucide

### 变更
- **CSP `script-src` 加 `data:`**（修复线上报错）：Astro ClientRouter 每次 VT 导航后在 `runScripts()` 注入空 `data:application/javascript,` module script 作 inline module scripts 等待栅栏（astro/dist/transitions/router.js 实证），被 `script-src` 拦截 → console CSP 违规；`'unsafe-inline'` 已存在（VT/防闪烁必需），`data:` 不增加实际攻击面（空脚本非执行向量）——docs/security.md §3.1 + 边界表同步
- 删除 3 篇文章（hello-mingzhi / markdown-workflow / why-keep-blogging，zh+en 6 文件）：构建自动收敛——页面 32 → 14（含消失的 12 个标签页）、RSS/搜索索引剩 git-commit-convention 双语 2 条、首页列表剩 1 篇；无互链残留（grep 实证，源码引用仅注释示例与单测夹具虚构数据）
- **自定义 404 页面**（src/pages/404.astro，隐性需求——删除文章后旧链接访问体验）：复用 Base 布局（导航/主题/搜索/SEO/favicon），语言按 /en/ 前缀自适应，canonical/hreflang 指首页防索引垃圾；新增 i18n 键 notFoundTitle/notFoundDesc；顺带消除根路径 favicon.ico 探测 404（head 提供 rel=icon）
- global.css：主题图标显隐规则（.icon-moon/.icon-sun）+ astro-icon SVG 尺寸（1em，currentColor）+ `.back-to-top` 改 flex 居中 + .notfound-desc

### 验证
- 产物断言：四图标内联 SVG（symbol+use）在首页/文章页、grep 无 emoji 残留、CSP 含 `data:`、被删文章页面不生成、搜索索引 2 条、文章列表 1 篇、404.html 含 rel=icon
- 测试 144 全绿、lint 0 errors、构建成功（15 页面：14 + 404）
- 本地 preview + Playwright：VT 导航 console 0 errors（CSP 修复实证）、主题切换图标显隐正确、搜索/回顶回归正常、404 页完整布局（favicon.ico 探测消除）、四视口（375/768/1024/1280）无横向溢出

## [1.10.0] - 2026-08-13

### 新增
- **RSS 2.0 feed**（/rss.xml）：手写零依赖生成器 src/lib/rss.ts（escapeXml/toRfc822/buildRss 纯函数 + 8 单测）+ src/pages/rss.xml.ts endpoint；含全部文章（zh+en 各自语言标题，日期倒序），RFC 822 日期（Date.UTC 防时区偏移）、XML 全转义、atom:link self 引用
- **标签页系统**：/tags/（标签云 + 计数）+ /tags/<tag>/（该标签文章列表，日期倒序极简表格）+ en 双语对应页；前端 tag 链接 URL 编码（中文标签）；详情页标签从纯文本改为可点击链接
- **文章上下篇导航**：详情页底部 prev/next（按日期排序相邻，首尾自动缺省），双语文案「上一篇/下一篇」
- **相关文章推荐**：同标签优先（共享数降序再日期新优先，最多 2 篇），无共享标签不硬凑；当前 3 篇文章补充共享「写作」标签使推荐有真实展示
- **内容数据层**：src/lib/posts.ts 纯函数（sortPostsByDate/getAdjacentPosts/getRelatedPosts/getAllTags）+ 15 单测
- i18n 新键：tagsTitle/tagPostsTitle/allTags/prevPost/nextPost/relatedPosts
- 测试 121 → **144**

### 变更
- 详情页 [slug].astro（zh/en）：getStaticPaths 构建期计算 adjacent/related（light 视图 + 找回原 post）；post-tags 区改 <a> 链接
- 样式（@layer components 内）：.tags-cloud 标签云、.post-nav 上下篇（两列 flex 悬停）、.related-posts 相关列表

## [1.9.0] - 2026-08-13

### 新增
- **Style Token 系统（Tailwind v4.3.3）**（docs/design-tokens.md 完整文档）：三层架构——Primitive（global.css :root 双主题物理值）→ Semantic（@theme 块 `--color-*`/`--font-*`/`--text-*`/`--spacing-*`，var 引用随主题联动）→ Utility（Tailwind 原子类 `text-muted`/`bg-surface`/`text-xl` 等）；@tailwindcss/vite 集成（astro.config vite.plugins）
- **olivierlacan.com 深度美学实测**（docs/ui-analysis.md §12）：CSS 源文件 + computed style 像素级数据——配色（链接绿 #3C5011/#a0a871、下划线 rgba(60,80,17,.46) 不随主题）、字体（根 13.34px + .site 115%、标题 2.5em/900 vs 正文 1.4em/300、字重即层级）、间距（44em 容器、h2 负边距 -0.5em、段距=字号、全 em 体系）、移动端放大；映射表（实测值 → 本站 token）
- **试点应用**（token 链路验证）：Base.astro 站点标题 `text-xl italic font-normal text-text border-b-0`、PostList 年份标题 `text-xl font-bold` + 表格日期 `text-right whitespace-nowrap text-sm text-muted`；对应手写 CSS 规则移除
- 新增 devDependency：tailwindcss / @tailwindcss/vite（4.3.3）

### 变更
- global.css：顶部 `@import 'tailwindcss'`（含 preflight）+ `@theme` token 块；**`*` 之后全部自定义规则包进 `@layer components`**——CSS Cascade Layers 下无 layer 规则优先级高于 Tailwind utilities（v1.9.0 实证：token 类被全局 a/td 压过），进层后 Tailwind 类可覆盖
- 字号 token 显式配 `--text-*--line-height`（防 Tailwind 自动行高破坏体系）

### 验证
- 本地 preview 视觉回归：站点标题 #333/0 border、年份 1.7em/700、日期 right/muted/nowrap 全部生效；暗色 token 联动（muted #8b949e/text #e6edf3）；文章页 mark/callout/dl/sub 零回归；375 无溢出；preflight + 层化后响应式/打印规则正常
- 测试 121 全绿、lint 0 errors 0 warnings

## [1.8.0] - 2026-08-13

### 审计与清理（v1.0.0-v1.7.0 八版迭代代码审计，零行为变更）

### 清理
- **删死代码**（grep 实证零引用）：utils.ts 删 `LANGS` / `PostMeta`（v1.0.0 遗留数据结构）、callout.ts 删 `CalloutType` 导出、search.ts 删 `SearchSource` 导出（参数改 inline 类型）
- **删未使用 import**：SearchDialog.astro 的 `I18nKey` / `SearchEntry`（lint hint 实锤，v1.3.0 遗留）——lint 3 hints → 1（仅保留 execCommand fallback 功能代码）
- **CSS 冗余**：@media print 段 `.callout-warning/caution/important::before` 三条颜色规则冗余（`.callout::before` 已匹配全部 callout 类型，callout-* 同时含 callout 类）→ 合并为一条

### 重构
- **抽公共模块 `src/markdown/remark/html.ts`**：`escapeHtml`（highlight.ts / supsub.ts 双份重复 → 单份，& < > " 顺序不变）
- **抽公共模块 `src/lib/html.ts`**：`serializeJsonForHtml`（search.ts `serializeIndexForHtml` 与 seo.ts `serializeJsonLd` 重复的 `<`→`\u003c` 转义 → 单份委托；公开函数名保留，调用方零改动）
- **i18n 测试全量化**：i18n.ts 导出 `I18N_KEYS` 常量；i18n.test.ts 键检查从抽样 13 键改为全量遍历 19 键（防新增键漏测）

### 不变（刻意保留）
- `execCommand('copy')`：clipboard API 的旧浏览器 fallback（功能代码，非死代码）
- `SITE_URL` / `inLanguageOf`：seo.ts 内部依赖 / 测试引用
- highlight/supsub 各自 processChildren：抽象收益 < 复杂度，插件模式保持直白（docs/markdown-extensions.md §5 模板基于此）
- 测试 121 全绿（行为零变更，无新增/删除用例）

## [1.7.0] - 2026-08-13

### 新增
- **定义列表 DefList**（src/markdown/remark/deflist.ts）：`Term\n: Definition`（PHP Markdown Extra 风格）→ `<dl><dt><dd>`（data.hName 方案）；支持一术语多定义、term/def 内 inline 语法；**实证 remark-parse 把无空行的连续行合并为单个 paragraph** → 插件按 `\n` 拆行重组（形态 A）+ 兄弟段落（形态 B）双处理；孤立 `: ` 行/混普通行原样保留
- **上标/下标 SupSub**（src/markdown/remark/supsub.ts）：`H_{2}O` → `<sub>`、`E=mc^{2}` → `<sup>`（LaTeX 风格）；**实证 remark-gfm 4.x 删除线默认 singleTilde——`~2~` 会被转 `<del>`**，故弃 Pandoc 风格 `~x~` 改用 `_{x}`/`^{x}`（CommonMark 不触发强调、GFM 脚注无花括号不匹配）；escapeHtml 全字符转义
- **Callout 补 IMPORTANT**：类型集 4 → 5（GitHub 完整子集），`--important` 主题变量（亮 #8250df / 暗 #d2a8ff，AA 对比）+ `.callout-important` 边条/标题样式；打印样式同步
- **样式**：dl/dt/dd（dt 加粗、dd 缩进+细边条印刷风）、sub/sup 0.8em；打印段 dl break-inside: avoid + dd 边条重置
- 测试 97 → **120**（deflist 10 + supsub 13 + callout +1）；演示文章 markdown-workflow（zh/en）新增 IMPORTANT/定义列表/上下标演示段

### 变更
- 插件注册顺序：callout → deflist（结构级）→ highlight → supsub（文本级）
- docs/markdown-extensions.md：总览表 5 种拓展、§3.3/§3.4 详解、§6 常见坑 +5（`Term\n: Def` 单 paragraph、singleTilde 冲突、GFM parse 阶段、CJK emphasis）、§7 测试基线

### 修复
- 单测捕获的语法冲突：`~x~` 下标被 GFM singleTilde 删除线抢占（真实管线会渲染 `<del>`）→ 改 `_{x}`/`^{x}` 语法

## [1.6.0] - 2026-08-13

### 新增
- **SEO 优化**（docs/seo.md 完整说明）：Base.astro head 统一输出 canonical / Open Graph（site_name/title/description/type/url/locale/locale:alternate/article:published_time）/ Twitter Card / theme-color（亮 #ffffff 暗 #0d1117）/ hreflang（中英互译 + x-default 指 zh 首页）
- **JSON-LD 结构化数据**：文章页 `BlogPosting`（headline/datePublished/author Person/inLanguage/publisher/mainEntityOfPage）+ 首页/关于页 `WebSite`；`is:inline set:html` 注入（Astro 对非 JS script 透传不求值）+ `serializeJsonLd` 全量转义 `<` 防 `</script>` 逃逸（与 search.ts 同款，源码 `'\\u003c'` 双重转义）
- **sitemap + robots**：`@astrojs/sitemap` 3.7.3 集成（构建期自动生成 sitemap-index.xml，URL 含 base）+ `public/robots.txt`（Allow all + Sitemap 指向）
- **frontmatter 作者字段**：schema 加 `author: z.string().optional()`；缺省按文章语言取 i18n `authorName`（zh 蒋全明 / en Quanming Jiang，hardcode 本人），frontmatter 写 `author` 可覆盖；i18n 加 `authorMeta`（作者 · 初写于 日期）键，文章页 meta 行显示作者
- **SEO 纯函数层**：src/lib/seo.ts（absoluteUrl / localeOf / inLanguageOf / blogPostingJsonLd / webSiteJsonLd / alternateUrls / serializeJsonLd），新增 18 个单测
- 测试 79 → **97**；新增 devDependency：@astrojs/sitemap

### 变更
- 日期语义明确：frontmatter `date` 即**创建日期**（既有字段，JSON-LD datePublished 直接用原字符串避免本地时区 Date 偏移）
- `firstWritten` i18n 键被 `authorMeta` 组合键替代（i18n.test.ts 键清单同步）

### 修复
- 单测捕获两处实现 bug：`alternateUrls` en 版首页缺尾部斜杠（`/en${path}` 直接拼接）、`serializeJsonLd` 单引号 `'\u003c'` 被解释为字面 `<` 导致转义失效（改 `'\\u003c'`）

## [1.5.0] - 2026-08-12

### 新增
- **Markdown 语法拓展架构**（src/markdown/）：插件注册表单一入口（index.ts）+ remark 层插件目录 + Astro 7 新 API `markdown.processor = unified({remarkPlugins})`（弃用 legacy remarkPlugins 配置）；完整开发文档 **docs/markdown-extensions.md**（语法总览 / 如何新增拓展 6 步模板 / 测试约定 / XSS 约束 / 常见坑）
- **Callout 提示框**（> [!NOTE|TIP|WARNING|CAUTION]，GitHub 风格子集）：`data.hName` 方案产出 `<div class="callout callout-{type}" role="note" data-callout aria-label>`；标题由 CSS ::before 生成 + aria-label 读屏可感知；warning/caution 用 `--warning` 主题变量（亮 #7a5c10 / 暗 #c9a227，WCAG AA 对比）；支持多段落与 inline 语法；不支持嵌套
- **==高亮==**：text 节点拆分产出 `<mark>`（手动 escapeHtml 防 XSS，& < > " 全转义单测覆盖）；未闭合/含 `=`/raw HTML 行为均有测试固化
- **GFM 基线确认**（实证）：Astro 7 默认支持表格/任务列表/删除线/自动链接/脚注，无需额外插件
- 测试 61 → **79**（插件单测 18：callout 8 + highlight 10）；新 devDependencies：@astrojs/markdown-remark / unified / remark-parse / @types/mdast

### 变更
- astro.config.mjs：`markdown.remarkPlugins`（deprecated）→ `markdown.processor = unified(...)`（含 gfm:true / smartypants:false 显式声明）；shiki css-variables 高亮与自定义 processor 共存验证通过
- global.css：新增 `.post-body .callout` / `::before` / `mark` 样式 + `--warning` 变量 + 打印样式（去底色/纯黑）；callout 加 overflow-wrap 防窄屏溢出
- markdown-workflow（zh/en 双语）：新增「拓展语法」演示段（TIP/WARNING callout + 高亮），链接指向 GitHub 仓库 docs（线上站点无 docs 目录）

### 修复
- 三人审查 2 Blocker + 2 Major + 15 Minor 全部处理：文档测试模板缺 `unified()` 工厂调用（B1）、data-callout 文档与实现对齐（B1）、warning 亮色对比度 2.96:1 不达标 → `--warning` 变量（Major）、callout 类型读屏不可达 → aria-label（Major）、重复测试删除、escapeHtml 断言补 & "、相邻 ==/含 = 行为固化测试、callout XSS 用例、文档模板/命令路径/import 注释/transform 示例、security.md 审计表补两行、index.ts 注释修正

## [1.4.0] - 2026-08-12

### 新增
- **安全审查与加固**（docs/security.md 安全基线）：威胁模型（静态站、内容可信）+ 攻击面审计 + 加固项 + 已知边界
- **meta CSP 纵深防御**（Base.astro head，GitHub Pages 无法自定义 HTTP 头）：`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; worker-src 'none'; base-uri 'self'; form-action 'self'`——即使内容被注入脚本，无法加载外部脚本 / iframe/object/Worker 副载 / XHR 数据外传 / base 篡改 / 表单外提
- **meta referrer `no-referrer`**：外链不泄露 Referer（隐私）
- **CI/CD 供应链加固**（deploy.yml）：actions 全部 pin commit SHA（checkout v4.4.0 / setup-bun v2.2.0 / upload-pages-artifact v3.0.1 / deploy-pages v4.0.5）+ job 级最小权限（test 仅 contents:read；build 加 pages:write；deploy 继承 OIDC）+ checkout persist-credentials: false + workflow_dispatch 限 main 分支
- **bunfig.toml**：显式声明 registry = npmmirror（lockfile tarball URL 来源，消除隐式供应链依赖）
- **npm audit：0 vulnerabilities**（临时 lockfile 方式验证）

### 变更
- 移除 `<meta name="generator">`（防框架精确版本指纹泄露）
- 搜索索引转义抽为 `serializeIndexForHtml`（src/lib/search.ts，可单测）+ JSON.parse try/catch 兜底（索引损坏时搜索安全退化，不影响其余交互）
- 新增安全单测 5 个（转义无裸 `<` / JSON.parse 还原 / filterPosts 纯文本匹配 / **jsdom 端到端 script 注入上下文不可逃逸** / href 特殊字符）→ 共 61 个

### 审计结论（docs/security.md §2）
- frontmatter（title/description/tags）：Astro 模板表达式自动转义 ✅（实证）
- 搜索索引：textContent 渲染 + 全量 `<` 转义 ✅
- Markdown raw HTML（`<script>`/`img onerror`/`iframe`）：**原样透传 = Astro 设计特性**，威胁模型"内容可信"（文档化；引入不可信内容源必须加 sanitize）
- Markdown `javascript:` 链接：内容可信范围（CSP 管不到事件属性/javascript: 执行，文档已明示边界）

### 修复
- 无代码级 Blocker/Major（三人安全审查结论）；修复 8 项 Minor：img-src 收紧（当前零外链图）、worker-src 'none' 补齐、JSON.parse 兜底、端到端注入测试、deploy.yml job 权限细化、SHA 注释精确版本、workflow_dispatch 分支限制、generator 指纹移除
- **CSP font-src 误伤（线上验证发现）**：@fontsource/lato 被 Vite 构建为 data: URI 内联字体，`font-src 'self'` 阻止 4 个字体加载（Lato 字重丢失）→ `font-src 'self' data:`

## [1.3.0] - 2026-08-12

### 新增
- **自研 mb-\* 组件库**（Web Components，零依赖）：`mb-dialog`（通用模态弹层：focus trap / Escape / 遮罩点击 / 滚动锁定 / aria-modal）+ `mb-toast`（通知：aria-live / 队列 / 自动消失）；选型经 3 路并行实测调研：Shoelace 2.20.1（官方已 sunset）与 React+Mantine（~123KB gzip 增量 ≈ 现状 22 倍）均否决，原生方案 0 依赖契合『默认零 JS』哲学（见 docs/ui-analysis.md §11）
- **站内搜索**（Cmd+K / Ctrl+K / 导航 🔍 按钮）：SSG 构建期生成文章索引（zh+en，内联 JSON），标题/描述/标签实时过滤，双语，空态提示，↑↓/Enter/Escape 键盘可达（APG listbox + aria-activedescendant 模式，焦点驻留输入框）
- **Toast 复制反馈**：代码块复制成功从按钮文字变化改为 mb-toast 通知（视觉近端提示 + aria-label 读屏同步，修复 v1.2.0 复制反馈无 live 区域的可访问性短板）
- **测试基座**：`src/test/setup-dom.ts`（jsdom 30 globals 注入，处理 Bun 自带 Event 冲突与 jsdom timer 在 Bun 下递归爆栈两个坑）；新增 23 个单测（搜索过滤 12 + mb-dialog 10 + mb-toast 4 → 共 56 个）
- 产物体积：JS 增量约 +6KB raw（Base 5.5→7.1KB 含组件注册 + 内联搜索脚本 ~1.8KB + 索引 ~2KB/页），对比 React 路线 123KB gzip 优势显著

### 变更
- 导航从 4 项增至 5 项（文章/关于/语言/🔍/🌙）；🔍 与 🌙 按钮同款视觉，触屏 40×40 / 桌面 min 24×24（WCAG 2.5.8）
- 复制反馈：按钮文字保持『复制』（原 textContent 临时替换移除），Toast 承担视觉反馈；aria-label 防连续复制 timer 竞态
- 全局样式新增 `--overlay` 变量（模态遮罩，亮 rgba(0,0,0,.35) / 暗 rgba(0,0,0,.55)）

### 修复
- **生产构建搜索索引失效（Blocker）**：`type="application/json"` 的 script 被 Astro 透传不求值（产物为字面量 `{indexJson}`）→ 改 `is:inline set:html` 显式注入，构建产物已确认真实 JSON
- **focus trap 对 slot 内容失效（Major）**：`_panel.querySelectorAll` 查 shadow tree 查不到 light DOM → 改从 host 收集 + 可见性判断（offsetParent 布局级 / hidden+display DOM 级兜底）
- **点击面板误触发关闭（Major）**：shadow retargeting 使 `e.target === this` 误判 → 改 `e.composedPath()[0] === this`
- **Cmd+K 跨 VT 导航监听累积（Major）**：window keydown 每次 page-load 重复绑定不清理 → 模块级单例 + cleanup
- **↑↓ 键盘导航一次后失效（Major）**：焦点移入结果 `<a>` 后 input 监听失效 → 重构为焦点驻留 + aria-activedescendant 模式
- **搜索输入框无焦点环（Major，WCAG 2.4.7）**：`outline:none` 移除焦点指示 → 改 `.search-head:focus-within` accent 下划线 + 全局 :focus-visible 兜底
- **Toast 与回到顶部按钮重叠（Major）**：同锚右下角必遮挡 → toast bottom 避让 `calc(1.2em + 48px)` / 移动端 `calc(4.6em + 48px)`
- 其余：Enter 硬导航改 `a.click()`（走 VT）、索引转义全量 `<`、空态未输入不显示、对话框可访问名改『站内搜索』、toast 边条 3px→2px 克制、打印隐藏 mb-toast、注释 4→5 项、jsdom rAF mock 防爆栈
- **Enter 未导航时无法打开第一条（线上验证发现）**：`activeIdx=-1` 时 `items[-1]` undefined → 兜底 `items[activeIdx] ?? items[0]`

## [1.2.0] - 2026-08-12

### 新增
- **响应式断点体系**（docs/ui-analysis.md §10）：A ≥1201px TOC 侧栏 / B 901-1200px TOC 折叠 / C ≤900px 底部导航 / D 触屏设备（pointer: coarse）/ E ≤480px 超小屏 / F 横屏矮屏 / G 打印——断点按内容折返点划分，B 档 44em 行宽约束保持
- **标题流式字号**：`.posts-title/.post-title` 改 `clamp(1.9em, calc(1.4em + 1.2vw), 2.5em)`，消除 900px 处 1.9em→2.5em 突变；≤767px 保持 1.9em 中文适配下限，1687px 封顶 2.5em。**已知视觉变化**：901-1200px（B 档）标题约 36-40px，比 v1.1.0 固定 46px 小 12-20%（平滑流式的有意取舍）
- **触屏目标放大**（`@media (pointer: coarse)`，不依赖宽度）：底部导航项 ≥44px、theme-toggle 40×40、TOC summary 44px、code-copy ≥32px、¶ 锚点 24px、回顶 44px（WCAG 2.5.5）
- **正文表格响应式**：`.post-body table` 极简边框（th 用 `--divider-strong`，非文本对比 ≥3:1）+ `display:block; overflow-x:auto` 横向滚动 + `border-spacing:0` 兜底
- **超小屏适配**（≤480px）：首页表格日期列收缩 0.9em、标题列 word-break、导航间距收紧、`.site` 左右 padding 0.8em；标题 `overflow-wrap: break-word` 防超长单词溢出
- **横屏矮屏适配**（landscape + max-height 500px）：底部导航紧凑化（项 36px、总高约 48px）、回顶 bottom 3.2em、safe-area-inset-left/right（iPhone 横屏 home indicator）
- **打印样式**（`@media print`）：隐藏底部导航/进度条/回顶/TOC/代码操作头；白底黑字（含 Shiki token 全量重置 #000 + `color-scheme: light`，修复暗色主题打印代码不可读）；分隔线纯黑；代码块 `break-inside: avoid` + pre-wrap；正文表格恢复 table 布局防列裁剪；`@page` 2cm

### 变更
- 嵌套 `@media` 全部扁平合并（`@media (pointer: coarse) and (max-width: 1200px)` 等），不依赖浏览器 CSS Nesting 支持
- clamp 显式 `calc()` 写法（旧浏览器兼容）
- 底部导航 li/a 显式 `min-height: 44px` + flex 居中（总高由 ~47px 增至 ~72px，触屏目标代价，回顶/页脚间距已充足避让）

### 修复
- 打印路径 3 项：暗色主题 Shiki token 浅色印白底不可读（Major）、`color-scheme` 未重置（Major，`!important` 压过 `:root[data-theme='dark']` 特异性）、`.has-actions` 顶部 2em 空白残留
- **文章页移动端横向溢出（v1.1.0 遗留）**：`.post-layout` 折叠态 `align-items: flex-start` 使 `.post-article` 取内容 max-content 宽（Shiki 长行不换行撑出容器），补 `.post-article { max-width: 100% }` 让 pre 内部滚动
- 文档-实现偏差对齐：§10.1 D 档（pointer: coarse 非 ≤767px）、§10.3 触屏表（TOC 44px/¶ 锚点）、§10.4（0.9em/--divider-strong）、§10.5（padding 0.3em + 36px）、§10.6（打印字号收缩 11-12pt）

## [1.1.0] - 2026-08-12

### 新增
- **View Transitions 页面过渡**（Astro `ClientRouter`）：站内导航 SPA 化平滑切换，无整页刷新；过渡动画遵循 `prefers-reduced-motion` 自动降级
- **阅读进度条**：文章页顶部 3px 渐变细线随滚动推进（rAF 节流）
- **文章目录 TOC**：大屏（≥1201px）右侧 sticky 侧栏 + 小屏顶部折叠（details/summary）；滚动高亮当前章节（IntersectionObserver + aria-current）；跨断点自动展开
- **代码块增强**：语言标签（无语言围栏不显示）+ 复制按钮（navigator.clipboard + execCommand fallback，成功/失败反馈同步 aria-label）
- **回到顶部按钮**：滚动超 600px 出现，平滑回顶（尊重 reduced-motion）；隐藏态移出 Tab 顺序
- **微交互**：导航下划线滑入动画（含 aria-current 当前页指示）、文章列表行 hover（背景 + 标题 2px 位移）、正文链接 hover 底色、主题图标旋转
- **可访问性**：全局 `:focus-visible` 焦点环、`prefers-reduced-motion` 全站降级（CSS + JS）
- **Shiki 代码高亮改 css-variables 主题**：token 颜色映射 `--astro-code-*` CSS 变量，暗色下代码块正确跟随（修复 1.0 暗色白底问题）

### 修复
- **关键：View Transitions 导航后交互脚本失效**——Astro 7 对字节相同的 module script 去重（`data-astro-exec`），1.0 的脚本在 VT 导航后不重跑导致主题被重置为亮色、切换按钮/进度条/复制按钮失灵；1.1 重构为 `astro:page-load` 事件驱动 + 清理函数（防 window 监听/IntersectionObserver 累积泄漏），主题在每次导航后重放恢复

### 变更
- 主题切换脚本从 `is:inline` 改为 `astro:page-load` 模式（VT 兼容）
- `toc.ts` 精简（删除未被生产使用的 `tocDepth` 死代码）
- CI smoke 页面数阈值收紧（`-eq 10`）
- TOC 布局：`.toc-wrap`（nav）承载 sticky 定位，`.toc`（details）承载折叠交互

## [1.0.0] - 2026-08-12

### 新增
- **明志 · Mingzhi Notes** 博客站首版：Astro 7 内容驱动静态博客（SSG），Markdown 写作 → push → Actions 自动部署 GitHub Pages（`/minimal-blog/` 子路径）
- **olivierlacan.com 极简风格**：44em 单栏、年份分组表格文章列表（¶ 锚点）、字重层级（Lato 300/400/700/900 自托管 + 中文系统宋体回退）、橄榄绿链接下划线、blockquote 纯缩进、零装饰
- **中英双语**：中文默认（URL 无前缀）+ 英文 `/en/` 前缀；同 slug 视为翻译对，语言切换互跳；缺翻译自动回退语言首页（防 404）
- **亮暗皮肤**：手动切换 + localStorage 记忆 + 首帧防闪烁，默认亮色；暗色柔和深色（`#0d1117`）
- **移动端适配**：≤900px 导航固定底部（safe-area 避让），中文阅读字号/行高适配
- 内容模型：content collections（glob loader + zod schema 校验：title/date/description/tags；date 必须 `'YYYY-MM-DD'` 带引号防 YAML 误解析）
- 测试：27 个单测（日期格式化/年份分组/slug/URL 构造/语言切换/阅读时长/i18n 字典），行覆盖 100%
- CI：lint（astro check）→ test → build（含产物 smoke 校验）→ deploy-pages

### 变更
- 无（首版）

### 修复
- 无（首版）
