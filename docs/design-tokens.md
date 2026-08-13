# Style Token 系统（Design Tokens）

> 明志博客（minimal-blog）的设计 token 体系与 Tailwind 使用指南（v1.9.0）。
> 目的：把设计决策（配色/字体/间距/字号）**单点定义、全站复用、主题联动**。
> 改样式前先读本文档 + docs/ui-analysis.md §12（token 取值的实测来源）。

## §1 架构：三层

```
┌─────────────────────────────────────────────┐
│ 1. Primitive（原始值）  global.css :root     │  ← --bg / --text / --accent / --warning …
│    物理值：#fff / #333 / #3c5011 …          │
├─────────────────────────────────────────────┤
│ 2. Semantic（语义层）   global.css @theme    │  ← --color-bg / --color-text / --color-accent …
│    引用 primitive，随主题切换（var 引用）     │
├─────────────────────────────────────────────┤
│ 3. Utility（消费层）    Tailwind v4 生成      │  ← bg-bg / text-text / text-accent / p-4 …
│    @theme 变量 → 原子类，模板直接用          │
└─────────────────────────────────────────────┘
```

- **Primitive**：`global.css` 的 `:root` / `:root[data-theme='dark']` 变量块（物理色值，双主题各一份）
- **Semantic**：`global.css` 顶部的 `@theme { ... }` 块（`--color-*` / `--font-*` / `--text-*` / `--spacing-*`），值用 `var(--bg)` 等引用 primitive → **跟随主题自动切换**
- **Utility**：Tailwind v4 编译 @theme 生成原子类（`.text-text`、`.bg-surface`、`.p-4`），模板 class 直接消费

## §2 Token 清单（与 global.css @theme 一致）

### 颜色（semantic → primitive，双主题联动）

| Tailwind 类 | Token | 亮色 | 暗色 | 用途 |
|---|---|---|---|---|
| `bg-bg` | `--color-bg` | #ffffff | #0d1117 | 页面背景 |
| `text-text` | `--color-text` | #333333 | #e6edf3 | 正文 |
| `text-muted` | `--color-muted` | #6b6b6b | #8b949e | 次要文字 |
| `text-accent` | `--color-accent` | #3c5011 | #a3c26b | 链接/强调 |
| `border-border` | `--color-border` | rgba(0,0,0,.3) | rgba(230,237,243,.25) | 分隔线 |
| `border-border-strong` | `--color-border-strong` | rgba(0,0,0,.45) | rgba(230,237,243,.4) | 表头边界 |
| `bg-surface` | `--color-surface` | #f4f4f4 | #161b22 | 代码块/提示框底 |
| `text-warning` | `--color-warning` | #7a5c10 | #c9a227 | callout warning |
| `text-important` | `--color-important` | #8250df | #d2a8ff | callout important |
| `bg-overlay` | `--color-overlay` | rgba(0,0,0,.35) | rgba(0,0,0,.55) | 模态遮罩 |

### 字体

| Tailwind 类 | Token | 值 |
|---|---|---|
| `font-sans` | `--font-sans` | `'Lato', 'Noto Sans SC', ui-sans-serif, system-ui, sans-serif` |
| `font-mono` | `--font-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |

### 字号 scale（em，跟随 body 115% 基准；值来自 olivierlacan 实测 docs/ui-analysis.md §12.2）

| Tailwind 类 | Token | 值 | 用途 |
|---|---|---|---|
| `text-xs` | `--text-xs` | 0.85em | inline code |
| `text-sm` | `--text-sm` | 1em | 页脚/meta/表格日期 |
| `text-base` | `--text-base` | 1.15em | 基准 |
| `text-lg` | `--text-lg` | 1.4em | 正文/列表 |
| `text-xl` | `--text-xl` | 1.7em | 站点名/h3 |
| `text-2xl` | `--text-2xl` | 2.5em | 区块标题 |

配套行高：每个 `--text-*--line-height` 显式定义（如 `--text-xl--line-height: 1.2`），防止 Tailwind 自动配行高破坏体系。

### 间距 scale（em 比例）

| Tailwind 类 | Token | 值 |
|---|---|---|
| `p-1`/`m-1`… | `--spacing-1` | 0.25em |
| `p-2`/`m-2`… | `--spacing-2` | 0.5em |
| `p-3`… | `--spacing-3` | 0.75em |
| `p-4`… | `--spacing-4` | 1em |
| `p-5`… | `--spacing-5` | 1.5em |
| `p-6`… | `--spacing-6` | 2em |
| `p-7`… | `--spacing-7` | 3em |

## §3 在模板中使用

```astro
<!-- 颜色 -->
<p class="text-muted">次要说明</p>
<a class="text-accent">链接</a>
<!-- 字体 -->
<code class="font-mono text-xs">inline code</code>
<!-- 字号 -->
<h2 class="text-2xl font-bold">区块标题</h2>
<span class="text-sm text-muted">表格日期</span>
<!-- 间距 -->
<div class="p-4">1em 内边距</div>
```

已试点（v1.9.0，作为用法示例）：
- `Base.astro` 站点标题：`class="text-xl italic font-normal text-text border-b-0"`
- `PostList.astro` 年份标题：`class="text-xl font-bold"`；表格日期：`class="text-right whitespace-nowrap text-sm text-muted"`

## §4 技术约束（重要）

- **Tailwind 入口**：`global.css` 顶部 `@import 'tailwindcss'`（全量：theme + preflight + utilities）。**preflight 已引入**，现有 reset 与 preflight 并存，验证过无回归
- **自定义规则必须进 `@layer components`**：global.css 的 `*` 之后的全部规则包在 `@layer components { ... }` 内——否则无 layer 规则优先级高于 Tailwind utilities（CSS Cascade Layers），token 类会被全局 `a`/`td` 等元素规则压过（v1.9.0 实证）。`:root` 变量块留在 layer 外（变量不受层影响）
- **@theme 变量按需生成**：Tailwind 只保留被 utilities/规则引用的变量（未被使用的 token 不会出现在产物中）。新增 token 后要**实际在模板使用**才能生效
- **@theme 值用 `var()` 引用 primitive**（如 `--color-bg: var(--bg)`）→ 双主题自动联动；不要写死色值
- **字号用 em**（跟随 body 115% 基准），勿用 px/rem 破坏相对体系
- `--text-*--line-height` 必须显式配（Tailwind 默认行高会覆盖继承值）

## §5 新增 Token 流程

1. **Primitive**：`:root` 变量块加物理值（双主题各一份）
2. **Semantic**：`@theme` 加 `--color-xxx: var(--xxx)`（或 `--text-*`/`--spacing-*`）
3. **使用**：模板中写对应 Tailwind 类（如 `text-xxx`）→ 触发生成
4. **文档**：本表 + docs/ui-analysis.md §12 若涉及取值来源
5. **验证**：`bun run build` 后产物含新变量与 utility；线上双主题检查

## §6 历史与取舍

- v1.0.0-v1.8.0：仅 primitive 层（`--bg` 等 CSS 变量），模板用手写类名
- v1.9.0：引入 Tailwind v4，新增 semantic + utility 层——模板可用语义化原子类，设计值单点维护
- **刻意不做**：全量迁移现有 CSS 到 Tailwind（1200 行，风险大收益低）；token 化渐进——新样式/重构时用 token 类，旧规则保留在 @layer components

## §7 Icon 系统（v1.11.0，astro-icon + lucide）

**选型**：`astro-icon`（Astro 官方维护的 icon 集成，Iconify 驱动）+ `@iconify-json/lucide`（lucide 图标集，24×24 stroke 风格，与极简印刷风契合）。替代 v1.10.0 及以前的 emoji 图标（🔍/🌙/☀️/↑，用户反馈"太丑"）。

**原理与约束**（保持零 JS / CSP 严格 / 隐私优先哲学）：
- **构建期内联**：astro-icon 把图标渲染为**文档内联 sprite**——页面首个 `<Icon name="lucide:xxx">` 输出 `<svg><symbol id="ai:lucide:xxx">…</symbol><use href="#ai:lucide:xxx"></use></svg>`，同页后续实例只输出 `<use>`；零外部请求、零运行时 JS、零第三方 CDN
- **图标名白名单在 astro.config.mjs**：`icon({ include: { lucide: ['search','moon','sun','arrow-up'] } })`——**新增图标 → 先在此补名**（图标名清单见 `node_modules/@iconify-json/lucide/icons.json` 或 https://lucide.dev）
- **颜色随 currentColor**：lucide 是 stroke 图标（`stroke="currentColor"`），svg 在按钮内继承文字颜色，双主题自动适配；**不要硬编码 fill/stroke 色值**
- **尺寸用 CSS 控制**（相对父级字号）：`.search-icon svg, .theme-icon svg { width: 1em; height: 1em }`、`.back-to-top-icon { 1.1em }`
- **主题图标零 JS 切换**：亮色显示 moon、暗色显示 sun，由 `html[data-theme]` + CSS 显隐控制（global.css），JS 只管 `data-theme`——见 Base.astro applyTheme
- **无障碍**：图标容器/按钮带 `aria-hidden="true"`（装饰性图标不进读屏），按钮语义靠 `aria-label`

**当前图标清单**：

| 位置 | 图标 | 说明 |
|---|---|---|
| 导航搜索按钮 | `lucide:search` | 打开站内搜索 |
| 导航主题按钮 | `lucide:moon` / `lucide:sun` | 亮暗显隐切换 |
| 文章页回顶 | `lucide:arrow-up` | 回到顶部 |
| 首页年份锚点 `¶` | 无（保留印刷符号） | olivierlacan 风格，非图标 |
