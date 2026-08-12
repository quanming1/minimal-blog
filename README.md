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
date: '2026-08-12'        # ⚠️ 必须带引号（YAML 会把裸日期解析成对象导致构建失败）
description: 一句话摘要（可选，用于页面 description）
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
- **@fontsource/lato**（自托管 Lato 300/400/700/900，中文回退系统宋体）
- **bun test**（纯函数单测）
- **GitHub Actions** 自动构建部署 Pages

## 页面与功能

- 首页：按年份分组的极简表格文章列表（标题 + 月日 + ¶ 锚点）
- 文章页：标题、初写日期、阅读时长、正文排版（代码高亮/引用/标签）
- 关于页
- 语言切换（中/英）+ 亮暗主题（localStorage 记忆，默认亮色）
- 移动端：导航固定底部（olivierlacan 风格）

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
│   ├── content.config.ts   # 文章集合 schema（title/date/description/tags）
│   ├── layouts/Base.astro  # 全局布局：导航/语言切换/主题/页脚
│   ├── components/         # PostList（年份分组列表）
│   ├── pages/              # 首页/关于/文章详情（zh 无前缀，en 前缀）
│   ├── lib/                # 纯函数：i18n 字典 / 日期/分组/slug（可单测）
│   └── styles/global.css   # 全局样式（olivierlacan 风格，亮暗双主题）
├── docs/ui-analysis.md     # olivierlacan.com UI/UX 设计分析文档（设计规范来源）
├── .github/workflows/deploy.yml  # lint → test → build(smoke) → deploy
├── CHANGELOG.md
└── AGENTS.md               # AI Agent 维护本仓库的指令
```

## 设计规范

UI 风格源自对 [olivierlacan.com](https://olivierlacan.com) 的完整分析（CSS/UI/UX），见 **[docs/ui-analysis.md](./docs/ui-analysis.md)**：色彩体系、字体层级、排版节奏、布局、响应式、借鉴清单与中文适配差异决策。

## 版本管理

- 版本号：`package.json`（语义化）
- 变更记录：`CHANGELOG.md`（仅工程变更；**文章内容/新增 MD 不入此文件**）
- 发版：更新版本号 + CHANGELOG 后 `git tag vX.Y.Z && git push --tags`
