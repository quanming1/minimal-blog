---
title: 在文章里放附件：Markdown 资产引用语法
date: '2026-08-13'
description: 博客新增「资产引用」语法，文章里可以挂可下载文件与图片预览，读者一键下载或跳转 GitHub 查看源码。
column: 博客开发
tags: [Markdown, 博客, 工程实践]
---

今天给博客加了一个新语法：**资产引用**。以后写文章时，可以把配套文件（示例代码、模板、图片、压缩包）直接挂在正文里，读者点一下就能下载，或者跳去 GitHub 看源文件。

## 语法长什么样

一个普通的引用块，第一行写 `[!asset]` 加上文件路径：

> [!asset] markdown-assets/markdown-cheatsheet.md
> 一页 Markdown 速查表，覆盖基础语法与本站拓展语法，写作时可随手参考。

上面渲染出来的就是「资产卡片」：文件名 + 「↓ 下载」和「GitHub」两个链接。文件放在站点资源目录下，链接天然可下载。

## 图片资产带预览

路径以图片扩展名结尾时，卡片顶部自动出现预览图（懒加载，不拖慢页面）：

> [!asset] markdown-assets/asset-demo.svg
> 一张演示用 SVG，用于验证资产卡片的图片预览功能。

## 怎么用

资产文件统一放在 `public/assets/` 下，按文章分目录：

```
public/assets/<文章 slug>/<文件名>
```

引用路径就是相对 `public/assets/` 的那一段。几个约定：

- 文件名小写短横线、无空格
- 路径不能含 `..`（防止目录穿越）
- 图片扩展名（png / jpg / gif / svg 等）自动出预览，其余类型只给下载

## 更多拓展语法

> [!TIP]
> 全量语法清单与开发指南见 [docs/markdown-extensions.md](https://github.com/quanming1/minimal-blog/blob/main/docs/markdown-extensions.md)。

==资产引用==只是最新的一种。博客已有的拓展语法还包括五种==提示框==（上文示例）、定义列表（术语 + `: 定义`）、上下标（H_{2}O、E=mc^{2}），它们都走同一套 Markdown 处理管线，写作体验保持一致。
