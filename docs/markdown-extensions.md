# Markdown 语法拓展（Markdown Extensions）

> 明志博客（minimal-blog）的 Markdown 语法拓展体系与开发指南。
> 本文档写给**未来的开发者**：想看支持哪些语法 → 看 §2/§3；想新增一种语法 → 按 §5 的步骤做，约 30 分钟可完成一个带测试的插件。

## 1. 架构总览

```
src/markdown/
├── index.ts               # 注册表（唯一入口，astro.config.mjs 引用）——新增拓展只需在此追加一行
├── remark-parse.d.ts      # remark-parse 类型声明兜底（包未发布根 d.ts，勿删）
├── remark/                # 语法解析插件（操作 mdast 语法树，标准 remark 插件）
│   ├── callout.ts         #   提示框：> [!NOTE|TIP|WARNING|CAUTION]
│   ├── highlight.ts       #   高亮：==text==
│   ├── callout.test.ts    #   插件单测（unified + remark-parse + mdast 树断言）
│   └── highlight.test.ts
└── rehype/                # HTML 转换插件（操作 hast 树，当前无——未来如图片优化/链接卡片放这）
```

- **处理器**：Astro 7 新 API `markdown.processor = unified({ remarkPlugins, gfm: true, smartypants: false })`（astro.config.mjs）
- **分层**：remark 插件做「语法解析与树变换」，rehype 插件做「HTML 层增强」，CSS 负责视觉（global.css `.post-body` 段）
- **GFM 基线**：Astro 默认支持表格 / 任务列表 / 删除线 / 自动链接 / 脚注——无需额外插件

## 2. 已支持语法总览

| 语法 | 写法 | 渲染 | 实现 |
|---|---|---|---|
| 表格 | `\| a \| b \|` | `<table>` | GFM（内置） |
| 任务列表 | `- [x]` / `- [ ]` | checkbox | GFM（内置） |
| 删除线 | `~~text~~` | `<del>` | GFM（内置） |
| 自动链接 | `https://...` | `<a>` | GFM（内置） |
| 脚注 | `[^1]` + `[^1]: 内容` | 脚注区 | 内置 |
| **提示框** | `> [!TIP]` 开头 blockquote | `<div class="callout callout-tip">` | remark/callout.ts |
| **高亮** | `==text==` | `<mark>` | remark/highlight.ts |

## 3. 语法详解

### 3.1 提示框 Callout（remark/callout.ts）

GitHub 风格，blockquote 首行写类型标记：

```markdown
> [!NOTE]
> 提示信息（普通提示）

> [!TIP]
> 技巧建议

> [!WARNING]
> 需要注意

> [!CAUTION]
> 高风险警示
```

渲染：`<div class="callout callout-{type}" role="note" data-callout="{TYPE}" aria-label="{TYPE}">`——`data-callout` 供 CSS `::before` 生成标题文字，`aria-label` 供读屏感知类型（`::before` 是生成内容，不保证被朗读）。类型不区分大小写（支持 GitHub 子集：NOTE/TIP/WARNING/CAUTION，不含 IMPORTANT）。样式：左侧 3px accent 边条 + code-bg 底色；warning/caution 用 `--warning` 变量（亮 #7a5c10 / 暗 #c9a227，对比达标）区分。内容支持多段落与任意 Markdown（inline 语法如加粗/斜体正常）。**约束：不支持嵌套 callout**（内层 `[!TIP]` 保持普通引用）。

### 3.2 高亮 Highlight（remark/highlight.ts）

```markdown
重点在于 ==这一句==。
```

渲染：`<mark>`（语义元素），样式为 accent 透明底。约束：不支持嵌套、不跨段落、未闭合的 `==` 原样输出；内容含 `=` 时不匹配（`==a=b==` 原样）；同一句多个 `==` 对按顺序配对（`==a==b==` → `a` 高亮、`b==` 原样）；`==` 内若含 raw HTML（如 `<script>`）由 remark 原生解析为 html 节点，不会进入 mark。

## 4. 技术约束（XSS 与顺序）

- **优先用 `node.data.hName` 方案**（见 callout.ts）：给自定义节点挂 `data: { hName, hProperties }`，mdast-util-to-hast 内建支持（`data-*` 属性也可正常传递，如 `'data-callout'`），子树由 rehype 统一转 HTML（text 自动转义）——**text 内容零 XSS 面**（注意：callout 内容里的 raw HTML 仍按 CommonMark 透传，作者自担，同正文）
- **必须用 html 节点时手动 escapeHtml**（见 highlight.ts）：mdast 的 html 节点原样输出不转义！
- **插件顺序敏感**（src/markdown/index.ts）：结构级插件（callout）在前，文本级插件（highlight）在后
- **smartypants: false**（astro.config.mjs）：关闭智能引号——中英混排保持引号原样（刻意决策，勿当作遗漏改回）
- 新增插件前先跑 `bun test src/markdown` 确认现有用例不回归

## 5. 如何新增一种语法拓展（核心）

以「新增 `::tip` 自定义容器」为例，完整流程：

### 步骤 1：创建插件文件 `src/markdown/remark/container.ts`

```ts
/** remarkContainer：自定义容器 ::tip 内容 ::（示例模板，按需修改）
 * 语法：::: 开头的段落组，结束用 :::
 * 安全：children 保留 mdast 子树（data.hName 方案），由 rehype 统一转义
 */
import type { Plugin } from 'unified'
import type { Root } from 'mdast'

export const remarkContainer: Plugin<[], Root> = () => (tree) => {
  walk(tree, null, -1)
}

function walk(node: unknown, parent: { children: unknown[] } | null, index: number): void {
  if (!node || typeof node !== 'object') return
  const n = node as { type?: string; children?: unknown[] }
  // —— 在这里实现你的节点识别与转换，最小示例（把类型为 container 的节点改为 div）——
  // if (n.type === 'container' && parent && index >= 0) {
  //   parent.children[index] = {
  //     ...n,
  //     type: 'container',
  //     data: { hName: 'div', hProperties: { className: ['container'], role: 'note' } },
  //   }
  //   return // 转换后不深入，防嵌套误处理
  // }
  if (n.children) {
    for (let i = 0; i < n.children.length; i++) walk(n.children[i], n as { children: unknown[] }, i)
  }
}
```

**模板要点**：`Plugin<[], Root>` 签名；`walk` 递归遍历；转换时返回新节点并 `parent.children[index] = 替换`（挂 `data.hName` + `hProperties.className` 才能产出对应 HTML 元素，见上方最小示例）；转换后 `return` 不深入（防嵌套误处理）。

### 步骤 2：注册 `src/markdown/index.ts`

```ts
import { remarkContainer } from './remark/container'

// 已有插件（无需改动，仅示意上下文）：
// import { remarkCallout } from './remark/callout'
// import { remarkHighlight } from './remark/highlight'

export const remarkPlugins = [
  remarkCallout,
  remarkHighlight,
  remarkContainer, // ← 追加一行（注意顺序：结构级在前）
]
```

### 步骤 3：写单测 `src/markdown/remark/container.test.ts`

```ts
import { describe, expect, test } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkContainer } from './container'

function processMd(md: string): any {
  // unified 11：`unified` 是预冻结 Processor，必须 `unified()` 调用工厂（带括号！见 §6 常见坑）
  const tree = (unified as any)().use(remarkParse).parse(md)
  return (unified as any)().use(remarkContainer).runSync(tree)
}

describe('remarkContainer', () => {
  test('基础转换', () => {
    const tree = processMd('::: tip\n内容\n:::')
    const node = tree.children[0]
    expect(node.type).toBe('container')
    // 断言你自定义的节点结构
  })
})
```

运行：`bun test src/markdown/remark/container.test.ts`。**每个新语法至少覆盖**：正常转换 / 边界（不匹配不误伤）/ XSS（注入 `<script>` 不可执行）。

### 步骤 4：样式（global.css `.post-body` 段）

```css
.post-body .container {
  /* 极简样式：用现有 CSS 变量（--bg/--text/--accent/--code-bg/--divider） */
  border-left: 3px solid var(--accent);
  background: var(--code-bg);
  padding: 0.9em 1.1em;
  margin: 1.2em 0;
}
```

**打印样式**：`@media print` 块补去底色（`background: #fff !important; color: #000 !important; border-color: #000`）。

### 步骤 5：文档同步

- 本文档 §2 总览表加一行、§3 加详解小节
- 若改变交互/布局，同步 `docs/ui-analysis.md`

### 步骤 6：验证

```bash
bun run lint && bun test --parallel=1 && bun run build
# 构建后检查产物：
#   powershell 查 dist/.../index.html 中你的元素（如 class="container"）
# 线上验证：写一篇含新语法的文章 push → 浏览器检查渲染与双主题
```

## 6. 常见坑

| 坑 | 说明 | 对策 |
|---|---|---|
| `processSync` 报 "Cannot processSync without compiler" | unified 管线无 stringify 步骤 | 测试用 `parse` + `runSync`（见模板） |
| `unified.use()` 报 "Cannot call use on a frozen processor" | **unified 11 的 `unified` 是预冻结 Processor，必须 `unified()` 调用工厂** | 测试写 `(unified as any)().use(plugin)`（带括号） |
| blockquote 类型行 text 含换行 | `> [!NOTE]\n> 内容` 的 text 是 `'[!NOTE]\n内容'` 单节点 | 正则用 `^...\s*(?:\n\|$)`，`slice(m[0].length)` 移除（见 callout.ts） |
| html 节点不转义 | mdast 的 html 节点原样输出 | 手动 `escapeHtml`（见 highlight.ts）或改用 `data.hName` |
| remark-parse 无类型声明 | 包未发布根 index.d.ts | 已用 `src/markdown/remark-parse.d.ts` 兜底，勿删 |
| 插件顺序影响结果 | 结构转换先于文本转换 | index.ts 中按依赖排序 |
| `<` 在 text 中被解析为 html | `==1 < 2==` 的 `< 2` 留在 text | 这是正确行为；测试用 `1 < 2` 验证转义 |

## 7. 测试基线

- `bun test src/markdown`：插件单测（15+ 用例）
- 全量：`bun run lint && bun test --parallel=1 && bun run build`（76+ 测试）
- 线上验证：markdown-workflow 文章含 callout/highlight 演示，构建产物与浏览器双重确认
