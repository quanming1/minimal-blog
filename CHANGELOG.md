# Changelog

> 版本变更记录。**约定：`src/content/posts/` 下的文章增删改（写作）不进入本文件**——那是内容维护，不是项目版本变更。
> 仅记录工程层面（代码/结构/功能/构建/测试/部署）的变化。

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
