# olivierlacan.com UI / UX 分析文档

> 分析对象：https://olivierlacan.com/（Olivier Lacan 个人博客）
> 分析方式：Playwright 抓取 DOM 结构 + CSS 规则表 + computed style 实测（2026-08-12）
> 用途：作为本项目 minimal-blog 的视觉与体验设计规范来源。**学其精神，不逐字照抄。**

---

## 0. 结论摘要

这是典型的**极简内容型博客**：单一内容列、极细字重（Light 300）、超大标题、表格化文章索引、无卡片无图片无侧边栏无装饰。视觉个性来自**反差**——正文极细、标题极粗（900）、橄榄绿链接点缀。UX 核心是**信息密度 + 扫读效率**：一年一表、一目十行。

值得全盘借鉴：布局骨架、字体层级策略、表格索引、链接下划线、移动端底部导航。需要调整：正文行高与阅读宽度（对中文更宽松）、纯系统跟随主题（改手动切换）、暗色纯黑（改更柔和的深色）。

---

## 1. 视觉设计分析

### 1.1 色彩体系（CSS 变量等价物）

| Token | 亮色（prefers-color-scheme: light） | 暗色（dark） | 用途 |
|---|---|---|---|
| `--bg` | `#ffffff` 纯白 | `#000000` 纯黑 | 页面背景 |
| `--text` | `#333333` | `#eeeeee` | 正文 |
| `--accent` | `#3c5011` 橄榄绿 | 同（暗色下保持绿系） | 全部链接 |
| `--accent-line` | `rgba(60,80,17,.46)` | `rgba(60,80,17,.46)` | 链接下划线 |
| `--muted` | `#777777` | `#eeeeee` | 页脚/次要文字 |
| `--divider` | `rgba(0,0,0,.3)`（header）/ `#eee`（footer 上边线） | `#333333` | 分隔线 |

要点：
- **唯一的彩色是橄榄绿**，且只用于链接（含下划线）。标题、正文、表格全黑灰。
- 暗色不是反色那么简单：链接绿保持不变，正文 `#eee`，分隔线 `#333`——比纯反相更耐看。
- 无阴影、无渐变、无圆角卡片——颜色就是全部装饰。

### 1.2 字体体系（Google Fonts: Lato 300/300i/400/400i/700/900/900i）

| 角色 | 字重 | 大小（实测） | 说明 |
|---|---|---|---|
| 站点名 h1 | **italic 300**（细斜体） | 1.7em ≈ 26px | 斜体细字重的 logo 感 |
| 导航 nav | 400 | 1.2em ≈ 18.4px | 行高 2.5 撑高 |
| 区块标题 h2 | **900**（最粗） | 2.5em ≈ 38px | 与正文形成极端反差 |
| 三级标题 h3 | 默认 | 1.7em | 次级 |
| 正文 p | **300**（最细） | 1.4em ≈ 21.5px | 细字重 + 大字号的阅读组合 |
| 表格列表 td | 400 | 1.3em ≈ 19.9px | 比正文略小 |
| 页脚 | 300 | 1em ≈ 15.3px | 灰色弱化 |

要点：
- **字重即层级**：标题靠 900 而不是字号爆炸（h2 仅 2.5em），正文靠 300 营造"轻阅读"感。
- `font-size: 115%` 整体放大根字号，配合 `font-weight: 300` 是站点气质源头。
- 字体加载用 `.wf-loading` 类隐藏标题防 FOUT（未加载完成时标题不可见）。

### 1.3 排版节奏

- 正文行高 `1.4`（p）到 `1.5`（.site 容器），**偏紧凑**（西方语言特性）。
- 段距 = 字号本身（`p { margin: 1.4em 0 }` 即 21px 上下），段落之间无额外空隙。
- blockquote 引文：`margin: 21px 40px`（左右各缩进 40px，**无左侧竖线**，纯缩进表达引用）。
- 负边距细节：h2 `margin-left: -0.5em`——标题视觉左对齐超出内容区，制造"标题顶着左边缘"的编辑感。

### 1.4 留白

- 容器 `.site { width: 44em; margin: 3em auto 2em }`：顶部 3em 大留白，左右自动居中。
- header 底部 1px 细线分隔导航区。
- 无卡片内边距、无 grid 间距——留白全部来自容器 margin 与元素 margin，克制的极简。

---

## 2. 布局系统分析

### 2.1 容器

- 单栏，`44em` 固定宽（≈ 700px，约 55-60 字符阅读行宽），`margin: 0 auto` 居中。
- `text-align: left`（body 是 center，容器内强制 left）——保证阅读左对齐。

### 2.2 Header（品牌 + 导航一体）

```
[Olivier Lacan (italic 300)]        [posts work talks about (nav, float right)]
─────────────────────────────────────── ← border-bottom 1px
```

- h1 站点名 = 首页链接，`display: inline-block`，hover 时伪元素追加 ` ← home` 提示可回首页。
- nav `float: right`，`line-height: 2.5` 让导航垂直居中于头行；list-style none，li 间距 `margin-left: .5em`。
- **品牌与导航同行**——极简站点的标准做法，无独立导航栏。

### 2.3 页脚

- `.footer`：居中、灰色 300 字重；上边框 1px 分隔。
- `.contact` 左浮动（email / Mastodon 链接），旁边是 RSS 订阅。
- 页脚是"联系方式"而不是版权声明堆砌——个人品牌出口。

### 2.4 首页文章列表（核心组件）

- 区块标题 `h1 "Posts"` + 按年份 `h2`（`2025` `2024` `2023`…倒序）。
- 每年一个**无边框纯文本 table**：左列标题（链接）、右列日期（"December 31"格式）。
- 年份 h2 右侧有一个 **`¶` 锚点链接**（`href="#2025-ref"`）——每节可分享直达。
- 信息密度极高：一年最多 20 篇仍一目了然，标题是唯一链接，日期右对齐第二列。

### 2.5 文章详情页

```
[Header 同上]
h2 文章标题（900 粗）
"First written on December 31, 2023"（元信息，灰色）  "4 min. read"（阅读时长）
正文（p / blockquote / a / h3…）
"Enjoyed this post? Subscribe to hear when new ones are posted."（文末订阅提示）
[Footer]
```

- 文章标题用 **h2 而非 h1**（h1 保留给站点名，SEO 与文档结构上站点即"书"、文章即"章"）。
- 元信息：初写日期（`First written on`——允许文章被修订但保留初稿时间）+ 阅读时长（按 180wpm 估算）。
- 文末订阅 CTA，页脚联系方式兜底。

---

## 3. 交互与动效分析

- **链接 hover**：正文/列表链接只加 `border-bottom` 下划线（常态即有）；hover 无颜色变化、无放大——保持静态感。
- **站点名 hover**：伪元素 `::after { content: " ← home" }` 追加文字提示（桌面端），是唯一"动效"。
- **¶ 锚点**：静态锚点跳转，无平滑滚动。
- 动效哲学：**几乎为零**。这是"印刷感"的刻意选择——不打断阅读。

---

## 4. 响应式分析

断点（媒体查询实测）：

| 视口 | 处理 |
|---|---|
| 桌面（>1020px） | 标准布局：44em 容器、顶部导航 |
| 平板竖屏 760-1020px | **导航固定到底部**（`position: fixed; bottom: 0`）、字号放大（nav 2em、h2 350%）、li 加 padding 成触控目标 |
| 手机竖屏 320-568px | 导航固定底部、字号更大（nav 2.2em、h2 3.5em、p 1.5em）；h1 变 block 居中；容器 padding 1.5-2em |

要点：
- **移动端导航从顶部移到底部**——拇指可达区设计（同 iOS 标签栏习惯）。
- 移动端不是缩小而是**放大字号**（h2 3.5em）——内容优先，不塞更多。
- 容器窄屏 `margin: 0 auto` + 左右 padding。

---

## 5. 主题（prefers-color-scheme）

- **纯系统跟随**：`@media (prefers-color-scheme: light/dark)` 两组规则，无手动切换按钮、无 localStorage。
- 亮色 `bg #fff / text #333`；暗色 `bg #000 / text #eee`；链接绿两态保持。
- 缺憾（我们的改进点）：无法手动切换、无记忆；暗色纯黑 #000 对比过强。

---

## 6. 可访问性与 UX 模式

| 模式 | 评价 |
|---|---|
| 链接下划线常显 | ✅ 强（不依赖颜色区分链接，色盲友好） |
| 细字重 300 正文 | ⚠️ 桌面大屏 OK；21px 大字号缓解了细字重可读性；但低 PPI 屏/弱视用户偏吃力 |
| 阅读宽度 44em | ✅ 约 55-60 字符，符合可读性研究区间 |
| 表格化文章列表 | ✅ 信息密度 + 扫读效率双高，日期列固定右对齐 |
| ¶ 锚点可分享 | ✅ 长页导航友好 |
| 阅读时长提示 | ✅ 帮助读者决策 |
| 移动端底部导航 | ✅ 拇指可达 |
| hover 依赖的提示（← home） | ⚠️ 触屏不可用（有 href=/ 兜底，可接受） |
| 语义结构 | ✅ h1 站点名 / h2 文章标题 / 原生 table / nav 标签齐全 |
| 对比度 | ⚠️ 橄榄绿 #3c5011 在白底上对比约 6:1 达标；正文 #333 达标 |

---

## 7. 借鉴清单（本项目要学的）

1. **布局骨架**：44em 单栏居中 + header 品牌导航同行 + 灰色页脚
2. **字体层级策略**：正文细（300）+ 标题极粗（900）+ 站名细斜体——字重制造层级
3. **表格化文章索引**：按年份 h2 分组 + 两列表格（标题 | 日期）+ ¶ 锚点
4. **链接下划线常显**：`border-bottom` 非 text-decoration（可控制颜色透明度）
5. **文章页元信息**：标题 h2 + 日期 + 阅读时长
6. **blockquote 纯缩进**：无竖线，左右 40px
7. **移动端底部导航**：固定底部 + 放大触控目标
8. **零装饰**：无阴影无渐变无圆角卡片
9. **防 FOUT**：字体加载期间隐藏关键文本
10. **h2 负边距左对齐**：标题略超出内容区

## 8. 差异决策（我们的调整，不照搬）

| 原站 | 本项目调整 | 理由 |
|---|---|---|
| 纯系统跟随主题 | **手动切换 + localStorage 记忆 + 默认亮色** | 用户明确要求皮肤切换（沿 awesome-repos 模式） |
| 暗色纯黑 #000 | 柔和深色 `#0d1117` 系 | 纯黑对比过强，长时间阅读刺眼 |
| Lato 西方字体 | **中英字体栈**：英文 Lato + 中文思源宋体/系统宋体 | 中文衬线正文更耐读；`font-family: Lato, "Noto Serif SC", serif` |
| 正文行高 1.4 | 中文放宽到 **1.75-1.8** | 中文字形密集，需要更高行高 |
| 字号 115% + p 1.4em | 保持相近（约 17-18px 基准） | 中文可略小（汉字信息密度高） |
| h2 900 / 正文 300 | 保留（中文字重 700 已够粗） | 中文无 900 字重字体，用 700 表现"极粗" |
| 无搜索/标签 | 保持无（极简）；可选 tags 展示在文章页 | 不引入复杂系统 |
| 语言 | 仅英文 | **中英双语 + 切换器**（用户核心需求） |
| 日期格式 | "December 31" | 中文 `12月31日`、英文 `December 31` |
| 阅读时长 | "4 min. read" | 中文 `约 4 分钟`、英文 `4 min. read` |

---

## 9. 设计 Token 汇总（本项目 CSS 变量草案）

```css
:root {
  /* 亮色 */
  --bg: #ffffff;
  --text: #333333;
  --muted: #777777;
  --accent: #3c5011;            /* 橄榄绿 */
  --accent-line: rgba(60,80,17,.46);
  --divider: rgba(0,0,0,.3);
  /* 字体 */
  --font-body: Lato, "Noto Serif SC", "Songti SC", "SimSun", serif;
  --font-weight-body: 400;      /* 中文用 400（无 300 字重），英文标题可 300 */
  /* 布局 */
  --container: 44em;
  --space-top: 3em;
  /* 字号（相对 16px 基准） */
  --fs-base: 115%;
  --fs-post-title: 2.5em;       /* 文章标题 h2 */
  --fs-post-body: 1.4em;
  --fs-table: 1.3em;
  --fs-nav: 1.2em;
}
```

---

## 10. 响应式断点体系（v1.2.0 实现决策）

> 本章是本项目自己的实现决策（非原站分析），基于第 4 章原站响应式分析 + 中文适配差异（第 8 章）推导。

### 10.1 断点矩阵（基于内容折返点，非设备清单）

| 断点 | 视口 | 布局形态 | 要点 |
|---|---|---|---|
| A | ≥1201px | 大屏桌面 | TOC 右侧 sticky 侧栏（210px）+ 44em 内容单栏 + 顶部导航 |
| B | 901-1200px | 小屏桌面 / 平板横 | TOC 折叠到文章顶部（details）；44em 内容（92vw 约束）；顶部导航 |
| C | ≤900px | 平板竖 / 手机 | **底部固定导航**（拇指可达，沿原站 760-1020 决策）；TOC 折叠顶部；正文 1.1em/1.8；回顶避让 4.6em |
| D | 触屏设备 | 手机/平板（pointer: coarse，无宽度断点） | 触屏目标放大（导航项 ≥44px 高、theme-toggle ≥40px、TOC summary 44px、code-copy ≥32px、¶ 锚点 24px、回顶 44px）；标题 clamp 在 ≤767px 达 1.9em 下限（自动） |
| E | ≤480px | 超小屏 | 首页表格日期列收缩、导航项间距收紧、.site 左右 padding 0.8em |
| F | 横屏矮屏 | landscape + max-height 500px | 底部导航紧凑化（高约 48px）、回顶 bottom 避让至 3.2em、safe-area 左右适配 |
| G | 打印 | @media print | 隐藏 fixed/底部导航/进度条/回顶/TOC；纯黑白去底色；代码块 break-inside avoid + pre-wrap；@page 2cm |

**断点决策理由：**
- 底部导航保持 ≤900px（不照搬原站 1020px）：768-900px 竖屏平板实测顶部导航空间充足（站名 ~62px + 导航 ~300px < 706px 内容宽），且 ≤900 底部导航已线上验证，降低回归风险。
- TOC 侧栏折返点 1201px 保持：210px 侧栏 + 3em gap + 44em 内容的最小宽度约束。
- 新增 D/E 两档是纯增量细分：原 900px 一档把 375px 手机与 820px 平板混在一起，触屏目标与字号诉求不同。

### 10.2 字号决策：标题流式 clamp（消除 900px 突变）

现状问题：900px 处标题从 1.9em 阶跃到 2.5em（突变 ~11px）。改为流式：

```css
.posts-title, .post-title {
  font-size: clamp(1.9em, calc(1.4em + 1.2vw), 2.5em);
}
```

- 375px → 1.9em（中文适配下限，保持不放大到 3.5em 的决策）；
- 767px 起随视口线性增长，901px ≈ 36.6px、1200px ≈ 40.2px，**1687px 封顶 2.5em（46px）**——注意 B 档（901-1200px）标题比 v1.1.0 的固定 46px 小约 12-20%，这是消除 900px 突变的有意取舍（13-15 寸笔记本窗口化场景 36-40px 的 700 粗体标题仍够醒目），已记入 CHANGELOG；
- 正文/行高保持断点式（1.2em/1.75 桌面 → 1.1em/1.8 移动），差异小无需流式。

### 10.3 触屏目标（触屏设备 `@media (pointer: coarse)` 生效，不依赖宽度断点）

| 元素 | 桌面（fine pointer） | 触屏（coarse pointer） |
|---|---|---|
| 底部导航 li | — | 高度 ≥44px（≤900px 底部导航内显式 min-height + flex 居中） |
| theme-toggle | 3px 7px | min 40×40px |
| TOC summary | 仅文字 | min-height 44px + flex 居中（折叠态 ≤1200px 内，全宽触屏区） |
| code-copy | 0.15em 0.7em | min-height 32px + padding 0.3em 0.8em |
| back-to-top | 40px | 44px |
| 年份 ¶ 锚点 | 行内文字 | min-height 24px（inline-block） |

> 注：theme-toggle 40px、code-copy 32px 满足 WCAG 2.5.5 AA（≥24px），低于推荐值 44px——极简风格下的已知权衡。

### 10.4 溢出处理

- **正文表格**（.post-body table，未来文章可能用）：`display: block; max-width: 100%; overflow-x: auto;` + `border-spacing: 0` 兜底（display:block 后匿名 table box 可能回退 separate 出现缝隙）；th/td 极简边框（border-bottom divider），表头 th 用 `--divider-strong`（非文本对比 ≥3:1，WCAG 1.4.11）。
- **首页 posts-table**（≤480px）：日期列字号 0.9em + 标题列 `word-break: break-word`，防止 320px 溢出；`.site` padding 0 0.8em 保证最小边距。
- **标题防溢出**：`.posts-title/.post-title` 均加 `overflow-wrap: break-word`（超长英文单词/URL 不溢出）。
- pre 横向滚动（overflow-x auto）与图片 max-width 100% 已有，复查保持。

### 10.5 横屏与安全区

- 横屏矮屏（max-height 500px + landscape）：底部导航 padding 收紧至 0.3em、字号 0.95em、导航项 min-height 收至 36px（总高约 48px，WCAG AA 达标）；回顶 bottom 3.2em（导航矮了不浪费 4.6em）；底部导航补 padding-left/right `env(safe-area-inset-left/right)`（iPhone 横屏 home indicator 在左右）。
- 竖屏底部导航已有 `padding-bottom: env(safe-area-inset-bottom)`（v1.1.0）。

### 10.6 打印样式

- 隐藏：`.header nav`（含移动端底部导航）、`.reading-progress`、`.back-to-top`、`.toc-wrap`（TOC 不打印）、`.code-actions`（操作头，并还原 pre 顶部 padding）。
- 黑白：body/code/table/blockquote 背景清空（#fff）、文字纯黑；**Shiki token 变量全部重置 #000**（暗色主题下浅色 token 印白底不可读）+ `html { color-scheme: light }`；分隔线（header/hr/表格线）`border-color: #000`；链接保留下划线不打印 URL（极简哲学）。
- 代码块：`break-inside: avoid`（整块不跨页）+ `white-space: pre-wrap; word-break: break-word`（长行打印不截断）。
- 正文表格：打印恢复 `display: table; width: 100%; overflow: visible`（display:block 在分页媒体会裁剪列）。
- `@page { margin: 2cm }`；打印统一收缩字号（正文 11pt / 代码 9pt）。

---

*分析完稿：2026-08-12。实现偏差以代码与线上效果为准，本文档为设计意图记录。*
