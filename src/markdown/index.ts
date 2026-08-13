/** Markdown 语法拓展注册表（唯一入口，astro.config.mjs 引用）
 *
 * 新增拓展的完整步骤见 docs/markdown-extensions.md（含插件模板/XSS 约束/测试约定）。
 * 约定：
 * - 语法解析插件（操作 mdast 树）放 src/markdown/remark/，文件命名 callout.ts / highlight.ts（无 remark- 前缀，目录已表达语义）
 * - HTML 转换插件（操作 hast 树）放 src/markdown/rehype/（当前无，未来如链接卡片/图片优化放这）
 * - 插件顺序敏感：先"识别/转换结构"的插件（asset/callout/deflist）再"文本级"插件（highlight/supsub），新增时注意
 * - 优先用 `node.data.hName` 方案产出元素（mdast-util-to-hast 内建支持，天然转义；data-* 属性可正常传递）；
 *   必须用 html 节点时手动 escapeHtml（见 highlight.ts 注释）
 */
import type { Plugin } from 'unified'
import type { Root } from 'mdast'
import { remarkAsset, type RemarkAssetOptions } from './remark/asset'
import { remarkCallout } from './remark/callout'
import { remarkDeflist } from './remark/deflist'
import { remarkHighlight } from './remark/highlight'
import { remarkSupSub } from './remark/supsub'

/**
 * 构建 remark 插件数组。资产插件需要 base（资产 URL 前缀）与 repo（GitHub 仓库）——
 * 由 astro.config.mjs 传入（单一事实源：base 常量与 astro.config 的 base 配置同源）。
 * 无参调用（单测/无 base 上下文）时 asset 用默认 '/' + 不输出 GitHub 链接。
 */
export function createRemarkPlugins(opts: RemarkAssetOptions = {}): Plugin<[], Root>[] {
  return [
    remarkAsset(opts), // 结构级：资产引用（先于 callout，语义更具体）
    remarkCallout, // 结构级：提示框
    remarkDeflist, // 结构级：定义列表
    remarkHighlight, // 文本级：==高亮==
    remarkSupSub, // 文本级：上标/下标
  ]
}

/** 兼容默认导出（无 base/repo 上下文，如纯 remark 单测基线） */
export const remarkPlugins = createRemarkPlugins()

export const rehypePlugins = [
  // 新增 rehype 插件在这里追加（当前无）
]
