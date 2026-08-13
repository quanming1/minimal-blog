// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import icon from 'astro-icon'
import { unified } from '@astrojs/markdown-remark'
import { createRemarkPlugins } from './src/markdown'

// 单一事实源：base 常量（资产链接/下载/预览都依赖它，与下方 base 配置同源）
const base = '/minimal-blog'
// GitHub 仓库（资产卡片的「GitHub 查看」跳转目标）
const repo = 'https://github.com/quanming1/minimal-blog'

// https://astro.build/config
export default defineConfig({
  site: 'https://quanming1.github.io',
  base,
  trailingSlash: 'always',
  // SEO：自动生成 sitemap-index.xml（site + base 拼绝对 URL，见 docs/seo.md §3）。
  // 不启用 i18n 配置（本站中英路由是手写 /en 前缀，非 Astro i18n 集成；hreflang 由 Base.astro 输出）
  // Icon 系统（astro-icon + lucide 图标集，见 docs/design-tokens.md §7）：
  //   构建期将图标内联为文档内 sprite（首实例 symbol + <use href="#ai:...">），零运行时 JS、零外部请求，
  //   图标颜色随 currentColor 跟随主题；新增图标时在此 include 列表补名（lucide 图标名见 node_modules/@iconify-json/lucide）
  integrations: [
    sitemap(),
    icon({
      include: { lucide: ['search', 'moon', 'sun', 'arrow-up'] },
    }),
  ],
  vite: {
    // Tailwind v4（Style Token 系统，见 docs/design-tokens.md）：@theme 生成 CSS 变量 + utilities
    plugins: [tailwindcss()],
  },
  markdown: {
    // Markdown 处理器：Astro 7 新 API（legacy markdown.remarkPlugins 已废弃）。
    // 语法拓展注册表 src/markdown/index.ts（新增拓展见 docs/markdown-extensions.md）。
    // gfm: true（默认，表格/任务列表/删除线/自动链接）；smartypants: false（保持引号原样，极简）
    // 资产插件（> [!asset]）需要 base/repo（资产 URL 与 GitHub 跳转），见 createRemarkPlugins
    processor: unified({ remarkPlugins: createRemarkPlugins({ base, repo }), gfm: true, smartypants: false }),
    shikiConfig: {
      // css-variables：token 颜色走 CSS 变量（--astro-code-*），跟随手动亮暗主题
      theme: 'css-variables',
    },
  },
})
