// @ts-check
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  site: 'https://quanming1.github.io',
  base: '/minimal-blog',
  trailingSlash: 'always',
  markdown: {
    shikiConfig: {
      // css-variables：token 颜色走 CSS 变量（--astro-code-*），跟随手动亮暗主题
      theme: 'css-variables',
    },
  },
})
