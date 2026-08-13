/** remarkAsset：资产引用（Markdown 语法拓展，见 docs/markdown-extensions.md §3.5）
 *
 * 语法：blockquote 首行 `[!asset] <路径>`（大小写不敏感）+ 后续行/段为描述：
 *   > [!asset] git-commit-convention/commit-msg.example
 *   > 示例 commit-msg hook，配合提交规范使用。
 *
 * 资产路径约定：相对 `public/assets/` 的路径（如 `my-post/code.zip`、`images/hero.png`）——
 *   资产文件放 `public/assets/` 下（public/ 被原样复制到 dist，文件即 URL 可直接下载）；
 *   推荐按文章 slug 分子目录 `public/assets/<slug>/`，文件名小写短横线。
 *   拒绝含 `..` 的路径（防目录穿越逃出 assets/）。
 *
 * 转换：blockquote → 自定义 asset 节点（`data.hName` 方案——mdast-util-to-hast 内建支持，
 *   嵌套结构全部用 hProperties + text 子节点，属性/文本由 hast 序列化自动转义，无手动 escapeHtml 面）：
 *   <div class="asset-card" data-asset="<路径>">
 *     [<img class="asset-img" src="{base}/assets/<路径>" alt="<文件名>" loading="lazy">  仅图片扩展名]
 *     <div class="asset-head">
 *       <span class="asset-name"><文件名></span>
 *       <span class="asset-links">
 *         <a class="asset-download" href="{base}/assets/<路径>" download>↓ 下载</a>
 *         [<a class="asset-github" href="{repo}/tree/main/public/assets/<路径>">GitHub</a>  仅 repo 选项非空]
 *       </span>
 *     </div>
 *     [<p>…描述（原 children，rehype 统一转义）…</p>]
 *   </div>
 *
 * 选项（astro.config.mjs 传入，见 src/markdown/index.ts createRemarkPlugins）：
 *   - base：站点 base（如 '/minimal-blog'），下载/预览链接前缀；默认 '/'（无子路径部署）
 *   - repo：GitHub 仓库 URL（如 'https://github.com/quanming1/minimal-blog'），非空才输出 GitHub 跳转链接
 * 注意：markdown 层无语言上下文，下载链接文案为中文（↓ 下载 + title/aria-label），GitHub 为品牌名通用。
 */
import type { Plugin } from 'unified'
import type { Root, RootContent } from 'mdast'

export interface RemarkAssetOptions {
  /** 站点 base（如 '/minimal-blog'），默认 '/'（无子路径部署） */
  base?: string
  /** GitHub 仓库 URL（如 'https://github.com/quanming1/minimal-blog'）；为空则不输出 GitHub 跳转链接 */
  repo?: string
}

// 路径必须在同一行（[ \t] 不含换行——remark 会把无空行的引用行合并为同一 paragraph，
// 用 \s+ 会把下一行内容误当路径）；路径字符类仅排除 < > 空格（< > 触发 inline 拆包；
// & " ' 由 hast 序列化自动转义，允许）
const ASSET_RE = /^\[!asset\][ \t]+([^\s<>]+)/i
const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|svg|webp|avif|ico|bmp)$/i

/** 自定义节点类型（data.hName 方案，非 mdast 标准类型，转换后 as RootContent 断言） */
interface AssetNode extends Omit<RootContent, 'type'> {
  type: 'asset'
  children: (RootContent | AssetNode | AssetHeadNode | AssetImgNode)[]
  data?: Record<string, unknown>
}
interface AssetHeadNode {
  type: 'asset-head'
  children: (RootContent | AssetNode | AssetHeadNode | AssetLinksNode | AssetImgNode)[]
  data?: Record<string, unknown>
}
interface AssetLinksNode {
  type: 'asset-links'
  children: (RootContent | AssetNode | AssetHeadNode | AssetImgNode)[]
  data?: Record<string, unknown>
}
interface AssetImgNode {
  type: 'asset-img'
  data?: Record<string, unknown>
}

export const remarkAsset =
  (opts: RemarkAssetOptions = {}): Plugin<[], Root> =>
  () =>
  (tree) => {
    walk(tree, null, -1, opts)
  }

function walk(
  node: unknown,
  parent: { children: unknown[] } | null,
  index: number,
  opts: RemarkAssetOptions,
): void {
  if (!node || typeof node !== 'object') return
  const n = node as { type?: string; children?: unknown[] }
  if (n.type === 'blockquote') {
    const converted = transformBlockquote(n as never, opts)
    if (converted && parent && index >= 0) parent.children[index] = converted
    return // 不深入已转换节点（不支持嵌套）
  }
  if (n.children) {
    for (let i = 0; i < n.children.length; i++) walk(n.children[i], n as { children: unknown[] }, i, opts)
  }
}

function transformBlockquote(
  node: { type: string; children: RootContent[] },
  opts: RemarkAssetOptions,
): AssetNode | null {
  const firstP = node.children[0]
  if (!firstP || firstP.type !== 'paragraph') return null
  const firstText = firstP.children?.[0]
  if (!firstText || firstText.type !== 'text') return null
  const m = firstText.value?.match(ASSET_RE)
  if (!m) return null

  const assetPath = m[1]
  // 目录穿越防护：路径必须留在 public/assets/ 内（防 href 逃逸到 assets 之外）
  if (assetPath.includes('..')) return null

  // 路径被打断防护：类型行 text 之后若存在非 text 节点（html/emphasis 等，如路径含 < > * 被
  // remark inline 拆包，捕获的只是残缺片段）→ 安全退化保持普通引用，不产生错误链接
  if (firstP.children.slice(1).some((c) => c.type !== 'text')) return null

  // 移除类型行：text 可能是 '[!asset] path'（独占段落）或 '[!asset] path\n描述'（remark 段落合并
  // 使路径后内容在同一 text 节点）——剩余剥离前导空白/换行（路径后分隔符属于语法标记）
  firstText.value = (firstText.value ?? '').slice(m[0].length).replace(/^[ \t\n]+/, '')
  if (firstText.value === '') {
    firstP.children.shift()
    if (firstP.children.length === 0) {
      node.children.shift()
    }
  }

  const base = (opts.base ?? '/').replace(/\/+$/, '')
  const assetUrl = `${base}/assets/${assetPath}`
  const fileName = assetPath.split('/').pop() ?? assetPath
  const isImage = IMAGE_EXT_RE.test(assetPath)

  const children: AssetNode['children'] = []

  // 图片预览（仅图片扩展名）
  if (isImage) {
    children.push({
      type: 'asset-img',
      data: {
        hName: 'img',
        hProperties: {
          src: assetUrl,
          alt: fileName,
          loading: 'lazy',
          className: ['asset-img'],
        },
      },
    } as AssetImgNode)
  }

  // 头部：文件名 + 操作链接
  const links: (RootContent | AssetNode | AssetHeadNode | AssetImgNode)[] = []
  if (opts.repo) {
    links.push({
      type: 'link',
      url: `${opts.repo.replace(/\/+$/, '')}/tree/main/public/assets/${assetPath}`,
      title: `GitHub 查看：${fileName}`,
      data: { hProperties: { className: ['asset-github'], 'aria-label': `GitHub 查看：${fileName}` } },
      children: [{ type: 'text', value: 'GitHub' }],
    } as RootContent)
  }
  links.push({
    type: 'link',
    url: assetUrl,
    title: `下载：${fileName}`,
    data: {
      hProperties: {
        className: ['asset-download'],
        download: '',
        'aria-label': `下载：${fileName}`,
      },
    },
    children: [{ type: 'text', value: '↓ 下载' }],
  } as RootContent)

  children.push({
    type: 'asset-head',
    children: [
      { type: 'text', value: fileName },
      { type: 'asset-links', children: links, data: { hProperties: { className: ['asset-links'] } } } as AssetLinksNode,
    ],
    data: { hProperties: { className: ['asset-head'] } },
  } as AssetHeadNode)

  // 描述：保留原 children（rehype 统一转义），样式走 .asset-card > p
  children.push(...(node.children as (RootContent | AssetNode | AssetHeadNode | AssetImgNode)[]))

  return {
    type: 'asset',
    children,
    data: {
      hName: 'div',
      hProperties: {
        className: ['asset-card'],
        'data-asset': assetPath,
      },
    },
  }
}
