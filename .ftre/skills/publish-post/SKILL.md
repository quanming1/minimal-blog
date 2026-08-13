---
name: publish-post
description: 指导在 minimal-blog（明志博客，https://quanming1.github.io/minimal-blog/）发布与更新文章（中英双语，Astro + GitHub Pages）。当用户说"写篇文章"、"发文章"、"发布文章"、"发篇博客"、"新增一篇文章"、"更新那篇文章"、"把这篇文章发上去"，或要求写博客文章并推送部署时使用，即使他没明确说"发布"这个词。不要用于修改博客的样式/布局/组件/功能（那是普通开发任务，按 AGENTS.md 处理），也不要用于 rondo 等其他项目的写作。
---

# 发布文章（minimal-blog）

明志博客的完整发稿流程：本地写 Markdown → 验证 → 提交 → push 自动部署。目标是在不发散、不污染仓库的前提下，让一篇文章从草稿到上线可复现、可验证。

## 项目结构速览

```
src/content/posts/
├── zh/<slug>.md          # 中文文章（URL 无前缀：/posts/<slug>/）
└── en/<slug>.md          # 英文文章（URL 前缀：/en/posts/<slug>/）
```

- 文章就是 Markdown 文件：一个文件一篇草稿，一个文件夹一个归档
- 同 slug 的中英两篇视为**翻译对**（语言切换时互跳）；缺翻译时切换回退首页
- 站点 base 为 `/minimal-blog`，所有链接带此前缀

## 发布流程（六步）

### 1. 新建中文文章

```bash
touch src/content/posts/zh/<slug>.md
```

slug 用**小写短横线**（kebab-case），如 `git-commit-convention`、`why-keep-blogging`。

frontmatter（必读，`date` 必须带引号）：

```markdown
---
title: 文章标题
date: '2026-08-13'        # ⚠️ 必须带引号！裸日期会被 YAML 解析成日期对象导致构建失败
description: 一句话摘要（可选，列表页展示）
author: 蒋全明             # 可选，缺省默认「蒋全明」
tags: [标签, 标签2]        # 可选
---
```

### 2. 写正文

- 标准 Markdown，代码块自动高亮（shiki，CSS 变量主题跟随明暗）
- 可用博客拓展语法（完整清单见 [docs/markdown-extensions.md](https://github.com/quanming1/minimal-blog/blob/main/docs/markdown-extensions.md)）：
  - 提示框：`> [!NOTE]` / `> [!TIP]` / `> [!IMPORTANT]` / `> [!WARNING]` / `> [!CAUTION]`
  - 高亮：`==重点==` → `<mark>`
  - 定义列表：`术语` 下一行 `: 定义`
  - 上下标：`H_{2}O`、`E=mc^{2}`

### 3. 英文版（可选但推荐）

新建 `src/content/posts/en/<同slug>.md`，frontmatter 与正文翻译为英文（title 英文、date 保持同一日期语义、author 缺省自动为 Quanming Jiang）。

### 4. 本地验证（必须全过再提交）

```bash
bun run lint && bun run test && bun run build
```

- lint = `astro check`（0 errors；预存在的 execCommand 弃用 hint 可忽略）
- test = `bun test`（144 个用例，须 0 fail）
- build = 静态构建（须成功，文章生成对应路由）

### 5. 提交（Conventional Commits）

```bash
git add src/content/posts/zh/<slug>.md [src/content/posts/en/<slug>.md]
git commit -m "post(posts): 文章标题（中英双语）"
```

- 新文章 / 更新文章都用 `post(posts)` 类型（type 白名单与 scope 约定见 AGENTS.md）
- 中英两篇同一主题可一条提交（翻译对是一个交付物）
- **不要**提交 `dist/` / `node_modules` / `.astro`（已 gitignore，别 `git add -f`）

### 6. 推送部署 + 验证

```bash
git push origin main
```

push main 自动触发 GitHub Actions：`lint → test → build + smoke → deploy-pages`（约 2-4 分钟）。部署完成后验证：

```bash
curl -s -o NUL -w "%{http_code}\n" "https://quanming1.github.io/minimal-blog/posts/<slug>/"
# 期望 200；en 版同理 /en/posts/<slug>/
```

## 检查清单（提交前过一遍）

- [ ] `date` 带引号（'YYYY-MM-DD'）
- [ ] slug 小写短横线，中英同 slug
- [ ] 文件 UTF-8 无 BOM
- [ ] `bun run lint && bun run test && bun run build` 全过
- [ ] 未暂存 `dist/` / `node_modules` / `.astro`
- [ ] 提交信息 `post(posts): ...` 格式正确
- [ ] 部署完成后页面 200

## 常见错误

| 错误 | 后果 | 规避 |
|---|---|---|
| `date: 2026-08-13`（无引号） | YAML 解析成日期对象，构建失败 | 始终带引号 |
| 文件带 UTF-8 BOM | 正文渲染为空但 frontmatter 正常（隐性故障） | 编辑器保存时选无 BOM |
| 不跑验证直接提交 | CI 红 / 部署失败 | 先 `bun run lint && bun run test && bun run build` |
| 忘了英文版 | 语言切换回退首页（可用但体验降级） | 新文章同步建 en 翻译对 |
| `git add dist` | 构建产物入库污染 | 只 add `src/` 下文章文件 |
