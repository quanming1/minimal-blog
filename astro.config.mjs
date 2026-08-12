// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { unified } from '@astrojs/markdown-remark'
import { remarkPlugins } from './src/markdown'

// https://astro.build/config
export default defineConfig({
  site: 'https://quanming1.github.io',
  base: '/minimal-blog',
  trailingSlash: 'always',
  // SEO：自动生成 sitemap-index.xml（site + base 拼绝对 URL，见 docs/seo.md §3）。
  // 不启用 i18n 配置（本站中英路由是手写 /en 前缀，非 Astro i18n 集成；hreflang 由 Base.astro 输出）
  integrations: [sitemap()],
  vite: {
    // Tailwind v4（Style Token 系统，见 docs/design-tokens.md）：@theme 生成 CSS 变量 + utilities
    plugins: [tailwindcss()],
  },
  markdown: {
    // Markdown 处理器：Astro 7 新 API（legacy markdown.remarkPlugins 已废弃）。
    // 语法拓展注册表 src/markdown/index.ts（新增拓展见 docs/markdown-extensions.md）。
    // gfm: true（默认，表格/任务列表/删除线/自动链接）；smartypants: false（保持引号原样，极简）
    processor: unified({ remarkPlugins, gfm: true, smartypants: false }),
    shikiConfig: {
      // css-variables：token 颜色走 CSS 变量（--astro-code-*），跟随手动亮暗主题
      theme: 'css-variables',
    },
  },
})
