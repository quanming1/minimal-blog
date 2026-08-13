import { describe, expect, test } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkAsset } from './asset'

/** 跑 remark 管线（parse + asset 转换），返回 mdast 根节点（runSync 只跑 transformer，无需 compiler） */
function processMd(md: string, opts?: { base?: string; repo?: string }): any {
  const tree = (unified as any)().use(remarkParse).parse(md)
  return (unified as any)().use(remarkAsset(opts)).runSync(tree)
}

describe('remarkAsset', () => {
  test('基础：> [!asset] 路径 转 asset 节点（data.hName div.asset-card）', () => {
    const tree = processMd('> [!asset] foo/bar.zip')
    const node = tree.children[0]
    expect(node.type).toBe('asset')
    expect(node.data.hName).toBe('div')
    expect(node.data.hProperties.className).toEqual(['asset-card'])
    expect(node.data.hProperties['data-asset']).toBe('foo/bar.zip')
  })

  test('头部结构：文件名（路径末段）+ 下载链接 + GitHub 链接', () => {
    const tree = processMd('> [!asset] foo/bar.zip', { base: '/minimal-blog', repo: 'https://github.com/quanming1/minimal-blog' })
    const head = tree.children[0].children[0]
    expect(head.type).toBe('asset-head')
    expect(head.data.hProperties.className).toEqual(['asset-head'])
    const texts = head.children.filter((c: any) => c.type === 'text').map((c: any) => c.value)
    expect(texts).toEqual(['bar.zip']) // 文件名取路径末段
    // 链接顺序：GitHub 在前、下载在后
    const links = head.children.find((c: any) => c.type === 'asset-links')!.children
    expect(links.map((l: any) => l.type)).toEqual(['link', 'link'])
    const [gh, dl] = links
    // GitHub：repo + tree/main/public/assets/路径
    expect(gh.url).toBe('https://github.com/quanming1/minimal-blog/tree/main/public/assets/foo/bar.zip')
    expect(gh.data.hProperties.className).toEqual(['asset-github'])
    expect(gh.children[0].value).toBe('GitHub')
    // 下载：base + /assets/路径 + download 属性
    expect(dl.url).toBe('/minimal-blog/assets/foo/bar.zip')
    expect(dl.data.hProperties.className).toEqual(['asset-download'])
    expect(dl.data.hProperties.download).toBe('')
    expect(dl.children[0].value).toBe('↓ 下载')
  })

  test('repo 为空：不输出 GitHub 链接（只保留下载）', () => {
    const tree = processMd('> [!asset] foo.zip', { base: '/' })
    const head = tree.children[0].children[0]
    const links = head.children.find((c: any) => c.type === 'asset-links')!.children
    expect(links.length).toBe(1)
    expect(links[0].data.hProperties.className).toEqual(['asset-download'])
  })

  test('base 默认 /（无子路径部署）', () => {
    const tree = processMd('> [!asset] foo.zip')
    const dl = tree.children[0].children[0].children.find((c: any) => c.type === 'asset-links')!.children[0]
    expect(dl.url).toBe('/assets/foo.zip')
  })

  test('图片扩展名：输出 img 预览节点（src/alt/loading）', () => {
    const tree = processMd('> [!asset] img/hero.png', { base: '/minimal-blog' })
    const img = tree.children[0].children.find((c: any) => c.type === 'asset-img')
    expect(img).toBeDefined()
    expect(img.data.hName).toBe('img')
    expect(img.data.hProperties.src).toBe('/minimal-blog/assets/img/hero.png')
    expect(img.data.hProperties.alt).toBe('hero.png')
    expect(img.data.hProperties.loading).toBe('lazy')
    expect(img.data.hProperties.className).toEqual(['asset-img'])
  })

  test('图片扩展名多种：png/jpg/jpeg/gif/svg/webp/avif', () => {
    for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif']) {
      const tree = processMd(`> [!asset] x.${ext}`)
      const hasImg = tree.children[0].children.some((c: any) => c.type === 'asset-img')
      expect(hasImg).toBe(true)
    }
  })

  test('非图片扩展名：不输出 img 预览', () => {
    const tree = processMd('> [!asset] code.zip')
    const hasImg = tree.children[0].children.some((c: any) => c.type === 'asset-img')
    expect(hasImg).toBe(false)
  })

  test('描述保留：后续行/段进入 children（样式走 .asset-card > p）', () => {
    const tree = processMd('> [!asset] foo.zip\n> 描述文字')
    const node = tree.children[0]
    // children = [asset-head, 描述段落]
    expect(node.children.length).toBe(2)
    const descP = node.children[1]
    expect(descP.type).toBe('paragraph')
    expect(descP.children[0].value).toBe('描述文字')
  })

  test('描述多段全部保留', () => {
    const tree = processMd('> [!asset] foo.zip\n>\n> 第一段\n>\n> 第二段')
    const node = tree.children[0]
    const ps = node.children.slice(1).map((c: any) => c.children?.[0]?.value)
    expect(ps).toEqual(['第一段', '第二段'])
  })

  test('同段路径后描述：> [!asset] 路径 描述文字 保留为描述', () => {
    const tree = processMd('> [!asset] foo.zip 附加说明')
    const node = tree.children[0]
    expect(node.type).toBe('asset')
    expect(node.data.hProperties['data-asset']).toBe('foo.zip')
    const descP = node.children[1]
    expect(descP.children[0].value).toBe('附加说明')
  })

  test('大小写不敏感：> [!ASSET] / [!Asset]', () => {
    for (const md of ['> [!ASSET] foo.zip', '> [!Asset] foo.zip']) {
      const node = processMd(md).children[0]
      expect(node.type).toBe('asset')
    }
  })

  test('空路径不匹配（保持普通引用）', () => {
    const tree = processMd('> [!asset] \n> 内容')
    const node = tree.children[0]
    expect(node.type).toBe('blockquote')
  })

  test('目录穿越防护：路径含 .. 不转换', () => {
    for (const md of ['> [!asset] ../secret.txt', '> [!asset] a/../../b.zip']) {
      const node = processMd(md).children[0]
      expect(node.type).toBe('blockquote')
    }
  })

  test('普通引用不误伤', () => {
    const tree = processMd('> 普通引用内容')
    const node = tree.children[0]
    expect(node.type).toBe('blockquote')
  })

  test('XSS：路径含 < > 被 inline 拆包 → 安全退化保持普通引用（不产生残缺链接）', () => {
    const tree = processMd('> [!asset] a<b>.zip', { base: '/minimal-blog' })
    const node = tree.children[0]
    expect(node.type).toBe('blockquote')
  })

  test('XSS：& 与 " 原文保留在 mdast（不手工拼 HTML，hast 序列化转义）', () => {
    // 插件不产出 html 节点，hProperties/text 值保留原文——转义由 hast 序列化层保证（data.hName 方案）
    const tree = processMd('> [!asset] a&b"c.zip', { base: '/minimal-blog' })
    const node = tree.children[0]
    expect(node.type).toBe('asset')
    expect(node.data.hProperties['data-asset']).toBe('a&b"c.zip')
    // 全部子节点无 type === 'html'（无手工注入面）
    const flatten = (n: any): any[] => [n, ...(n.children ?? []).flatMap(flatten)]
    const hasHtml = flatten(node).some((n: any) => n.type === 'html')
    expect(hasHtml).toBe(false)
  })
})
