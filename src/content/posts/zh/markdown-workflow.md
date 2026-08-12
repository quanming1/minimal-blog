---
title: 用 Markdown 维护一个博客的快乐
date: '2026-08-11'
description: 静态博客的工作流：本地写 MD、push、自动部署，一切都是文件。
tags: [静态博客, 工作流]
---

## 内容即文件

这个博客的所有文章都是普通的 `.md` 文件。没有数据库、没有后台编辑器、没有登录——一个文件就是一篇草稿，一个文件夹就是归档。

```
src/content/posts/
├── zh/          # 中文文章
└── en/          # 英文文章
```

## 发布流程

```bash
# 1. 新建一篇
touch src/content/posts/zh/my-post.md
# 2. 写 Markdown（frontmatter 里写标题/日期/标签）
# 3. push
git add . && git commit -m "post: 标题" && git push
# 4. 构建与部署自动完成
```

## 为什么喜欢这种方式

- **可版本化**：每篇文章都有 git 历史，改了什么一目了然，还能回滚
- **可搜索**：`grep` 全文检索，比任何站内搜索都快
- **零锁定**：哪天不想用这套框架了，Markdown 文件可以直接搬走
- **专注写作**：没有富文本编辑器的干扰，只有一个光标和纯文本

十年后回头看，这些 `.md` 文件依然可读。这大概就是「明志」的底气。

## 拓展语法

这个博客支持一些 Markdown 拓展语法（完整清单见 [docs/markdown-extensions.md](https://github.com/quanming1/minimal-blog/blob/main/docs/markdown-extensions.md)）：

> [!TIP]
> 提示框：用 `> [!TIP]` 开头即可，支持 `NOTE` / `TIP` / `WARNING` / `CAUTION` 四种。

> [!WARNING]
> 警告框也是同样写法，语义由类型决定。

正文里可以用 `==高亮==` 标记重点，比如「写作的快乐就在 ==一篇一篇积累== 的过程里」。
