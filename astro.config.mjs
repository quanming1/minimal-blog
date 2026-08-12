// @ts-check
import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import { remarkPlugins } from './src/markdown'

// https://astro.build/config
export default defineConfig({
  site: 'https://quanming1.github.io',
  base: '/minimal-blog',
  trailingSlash: 'always',
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
