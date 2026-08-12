# 明志 · Mingzhi Notes

> 非淡泊无以明志，非宁静无以致远。

个人技术博客与思考随笔。**纯静态站点**：用 Markdown 写作，push 到 GitHub 自动构建部署到 Pages，中英双语、亮暗皮肤、极简排版（风格参考 [olivierlacan.com](https://olivierlacan.com)）。

在线地址：https://quanming1.github.io/minimal-blog/

## 写作工作流（日常唯一需要做的事）

```bash
# 1. 新建文章（中文放 zh/，英文放 en/）
#    中文：src/content/posts/zh/<slug>.md
#    英文：src/content/posts/en/<slug>.md（同 slug 视为翻译，语言切换互跳）
touch src/content/posts/zh/my-new-post.md

# 2. 写 Markdown（frontmatter 见下方模板）

# 3. 提交推送 → Actions 自动 lint + test + build + deploy（约 1 分钟）
git add . && git commit -m "post: 文章标题" && git push

# 4. 刷新 https://quanming1.github.io/minimal-blog/ 即可看到
```

### 文章 frontmatter 模板

```markdown
---
title: 文章标题
date: '2026-08-12'        # ⚠️ 创建日期，必须带引号（YAML 会把裸日期解析成对象导致构建失败）
description: 一句话摘要（可选，用于页面 description）
author: 蒋全明              # 可选，缺省默认「蒋全明」（中文页显示蒋全明 / 英文页 Quanming Jiang）
tags: [标签1, 标签2]        # 可选
---

正文用标准 Markdown：`# 标题`、代码块、引用、列表、表格都支持，代码块自动高亮。
```

### 双语约定

- 同一篇文章的中英版本用**相同 slug**（文件名），如 `zh/hello-mingzhi.md` 与 `en/hello-mingzhi.md`
- 页面右上角「EN / 中文」切换语言；某篇文章缺翻译时自动切到该语言首页（不会 404）
- 中文默认（URL 无前缀），英文在 `/en/` 前缀下

## 技术栈

- **Astro 7**（内容优先 SSG：MD 原生、构建时静态导出、零 JS 默认）
- **Bun**（包管理 / 测试运行器，workspace 单包）
- **TypeScript 6**（astro check 类型检查）
- **Tailwind CSS v4**（Style Token 系统：@theme 语义 token → 原子类，见 [docs/design-tokens.md](./docs/design-tokens.md)）
- **@fontsource/lato**（自托管 Lato 300/400/700/900，中文回退系统宋体）
- **自研 mb-\* 组件库**（原生 Web Components，零依赖：mb-dialog 弹层 / mb-toast 通知）
- **bun test**（纯函数单测 + jsdom 组件测试）
- **GitHub Actions** 自动构建部署 Pages

## 页面与功能

- 首页：按年份分组的极简表格文章列表（标题 + 月日 + ¶ 锚点）
- **标签系统**：/tags/ 标签云 + /tags/`<tag>`/ 按标签筛选（双语）——文章页标签可点击
- 文章页：标题、作者 · 初写日期、阅读时长、正文排版（代码高亮 + 语言标签 + 一键复制）、**右侧目录 TOC**（滚动高亮，小屏折叠）、**阅读进度条**、**回到顶部**、**上下篇导航**、**相关文章推荐**（同标签）
- **RSS 订阅**：/rss.xml（全部文章，标准 RSS 2.0）
- **Markdown 拓展语法**：Callout 提示框（`> [!TIP]`，含 IMPORTANT）、`==高亮==`、定义列表（`Term` + `: 定义`）、上标/下标（`H_{2}O` / `E=mc^{2}`）、GFM 全量（表格/任务/删除线/自动链接/脚注）——语法清单与开发指南见 [docs/markdown-extensions.md](./docs/markdown-extensions.md)
- 关于页
- 语言切换（中/英）+ 亮暗主题（localStorage 记忆，默认亮色）
- **站内搜索**（Cmd+K / Ctrl+K / 导航 🔍）：按标题/描述/标签实时过滤全部文章，键盘可达，双语
- **Toast 通知**：代码复制成功提示（mb-toast，aria-live）
- **View Transitions**：站内导航平滑过渡，无整页刷新
- **微交互**：导航下划线滑入、列表行 hover、链接底色反馈（克制的印刷感动效）
- 可访问性：`focus-visible` 焦点环、`prefers-reduced-motion` 全站降级
- **安全**：meta CSP 纵深防御 + no-referrer 隐私头 + CI actions SHA pin + 依赖审计 0 漏洞（详见 [docs/security.md](./docs/security.md) 安全基线）
- **SEO**：canonical + Open Graph / Twitter Card / theme-color + JSON-LD 结构化数据（文章页 BlogPosting / 首页 WebSite）+ 中英 hreflang + sitemap.xml + robots.txt（详见 [docs/seo.md](./docs/seo.md)）
- **响应式**（断点体系见 docs/ui-analysis.md §10）：≤900px 导航固定底部（olivierlacan 风格）；触屏设备（pointer: coarse）交互目标放大至 44px；≤480px 超小屏表格收缩；横屏矮屏导航紧凑；支持打印样式（黑白、无导航、代码不跨页）

## 开发

```bash
bun install          # 安装依赖
bun run dev          # 本地开发 http://localhost:4321
bun run build        # 构建静态站点（产物 dist/）
bun run preview      # 预览构建产物
bun run lint         # astro check（类型检查）
bun run test         # 单元测试（bun test）
```

## 项目结构

```
minimal-blog/
├── src/
│   ├── content/
│   │   └── posts/          # 文章（MD）
│   │       ├── zh/         # 中文文章
│   │       └── en/         # 英文文章
│   ├── content.config.ts   # 文章集合 schema（title/date/author/description/tags）
│   ├── layouts/Base.astro  # 全局布局：导航/语言切换/主题/页脚 + SEO head（canonical/OG/JSON-LD/hreflang）
│   ├── components/         # PostList（年份分组列表）、SearchDialog（站内搜索）、wc/（mb-* 组件库）
│   ├── markdown/           # Markdown 语法拓展（index.ts 注册表 + remark/ 插件，见 docs/markdown-extensions.md）
│   ├── pages/              # 首页/关于/文章详情（zh 无前缀，en 前缀）
│   ├── lib/                # 纯函数：i18n 字典 / 日期/分组/slug / search（搜索索引与过滤）/ seo（URL/JSON-LD/hreflang）/ html（内联 JSON 序列化）
│   ├── test/setup-dom.ts   # jsdom 测试基座（组件测试 preload）
│   └── styles/global.css   # 全局样式 + Tailwind @theme token 层 + @layer components（见 docs/design-tokens.md）
├── docs/ui-analysis.md     # olivierlacan.com UI/UX 设计分析文档（设计规范来源）
├── docs/design-tokens.md   # Style Token 体系（token 表 + Tailwind 使用指南 + 新增流程）
├── docs/security.md        # 安全基线（威胁模型/加固项/维护约定——改安全代码前先读）
├── docs/seo.md             # SEO 架构（meta 清单/JSON-LD/hreflang/sitemap/frontmatter 元数据约定）
├── .github/workflows/deploy.yml  # lint → test → build(smoke) → deploy
├── CHANGELOG.md
└── AGENTS.md               # AI Agent 维护本仓库的指令
```

## 设计规范

UI 风格源自对 [olivierlacan.com](https://olivierlacan.com) 的完整分析（CSS/UI/UX），见 **[docs/ui-analysis.md](./docs/ui-analysis.md)**：色彩体系、字体层级、排版节奏、布局、响应式断点体系、借鉴清单与中文适配差异决策。

## 版本管理

- 版本号：`package.json`（语义化）
- 变更记录：`CHANGELOG.md`（仅工程变更；**文章内容/新增 MD 不入此文件**）
- 发版：更新版本号 + CHANGELOG 后 `git tag vX.Y.Z && git push --tags`
