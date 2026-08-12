# AGENTS.md — 本仓库的 AI Agent 维护指令

> 给 AI Agent（ftre / Cursor / Claude Code 等）维护此仓库时的行为规范。
> 目标：**明志博客** — Astro 7 静态站，Markdown 写作（中英双语），GitHub Pages 托管。

## 仓库结构与职责

| 路径 | 职责 | 谁改 |
|---|---|---|
| `src/content/posts/zh/*.md` | 中文文章 | 日常写作 |
| `src/content/posts/en/*.md` | 英文文章（同 slug = 翻译对） | 日常写作 |
| `src/content.config.ts` | 文章集合 schema（title/date/description/tags） | 协议变更 |
| `src/lib/*` | 纯函数（i18n 字典 / 日期/分组/slug/URL 构造） | 功能改动 |
| `src/layouts/Base.astro` | 全局布局（导航/语言切换/主题/页脚） | 布局改动 |
| `src/components/PostList.astro` | 首页年份分组列表 | 列表改动 |
| `src/pages/**` | 页面路由（zh 无前缀 / en 前缀） | 页面改动 |
| `src/styles/global.css` | 全部样式（olivierlacan 风格 + 双主题 + 响应式断点体系 §10） | 样式改动 |
| `docs/ui-analysis.md` | 设计规范来源（改样式前先读） | 设计决策 |
| `.github/workflows/deploy.yml` | lint → test → build(smoke) → deploy | 部署改动 |

## 写作规范（日常任务）

### 新增中文文章

1. 新建 `src/content/posts/zh/<slug>.md`，frontmatter：
   ```markdown
   ---
   title: 标题
   date: '2026-08-12'   # ⚠️ 必须带引号！YAML 会把裸日期解析成对象，导致构建失败
   description: 一句话摘要（可选）
   tags: [标签]          # 可选
   ---
   ```
2. 标准 Markdown 正文（代码块自动高亮）
3. 需要英文版 → 新建 `en/<同slug>.md`（不强制，缺翻译时语言切换自动回退首页）

### 约束

- **`date` 必须带引号**（`'YYYY-MM-DD'`）；`slug` 用小写短横线；同 slug 中英两篇必须同一日期语义（可不相同）
- **不要动** `src/layouts` / `src/pages` / `src/styles` 除非任务明确涉及样式或功能
- 改响应式规则（断点/媒体查询/触屏目标）→ 先读 `docs/ui-analysis.md §10` 断点矩阵，改完在 375/768/1024/1280 至少四个视口验证无横向溢出；设计决策变更必须同步文档
- 新增纯函数逻辑 → 放 `src/lib/` 并**必须配单测**（`src/lib/*.test.ts`，bun test）
- 提交信息：写作 `post: 标题`；工程 `feat/fix/ci:` 前缀

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
- 改样式前先读 `docs/ui-analysis.md`（保持与设计规范一致，新偏差要记录到文档）
