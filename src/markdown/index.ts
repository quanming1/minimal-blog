/** Markdown 语法拓展注册表（唯一入口，astro.config.mjs 引用）
 *
 * 新增拓展的完整步骤见 docs/markdown-extensions.md（含插件模板/XSS 约束/测试约定）。
 * 约定：
 * - 语法解析插件（操作 mdast 树）放 src/markdown/remark/，文件命名 callout.ts / highlight.ts（无 remark- 前缀，目录已表达语义）
 * - HTML 转换插件（操作 hast 树）放 src/markdown/rehype/（当前无，未来如链接卡片/图片优化放这）
 * - 插件顺序敏感：先"识别/转换结构"的插件（callout）再"文本级"插件（highlight），新增时注意
 * - 优先用 `node.data.hName` 方案产出元素（mdast-util-to-hast 内建支持，天然转义；data-* 属性可正常传递）；
 *   必须用 html 节点时手动 escapeHtml（见 highlight.ts 注释）
 */
import { remarkCallout } from './remark/callout'
import { remarkHighlight } from './remark/highlight'

export const remarkPlugins = [
  remarkCallout,
  remarkHighlight,
  // 新增 remark 插件在这里追加一行（注意顺序）
]

export const rehypePlugins = [
  // 新增 rehype 插件在这里追加（当前无）
]
