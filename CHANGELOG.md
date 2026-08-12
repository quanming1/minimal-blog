# Changelog

> 版本变更记录。**约定：`src/content/posts/` 下的文章增删改（写作）不进入本文件**——那是内容维护，不是项目版本变更。
> 仅记录工程层面（代码/结构/功能/构建/测试/部署）的变化。

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
